import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "../db/prisma";
import { logAudit } from "../audit/audit-service";

const ATTACHMENTS_DIR = path.join(process.cwd(), "storage", "attachments");
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/jfif",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/svg+xml",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".pjpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
};

export interface UploadAttachmentInput {
  activityId: string;
  file: File;
  actorUserId?: string;
}

export async function saveActivityAttachment(input: UploadAttachmentInput) {
  const { activityId, file, actorUserId } = input;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("حجم الملف يتجاوز الحد الأقصى المسموح به (15 ميغابايت).");
  }

  const ext = path.extname(file.name).toLowerCase() || ".bin";
  let resolvedMime = file.type || EXTENSION_TO_MIME[ext] || "";
  if (!resolvedMime || resolvedMime === "application/octet-stream") {
    resolvedMime = EXTENSION_TO_MIME[ext] || "";
  }

  const isAllowedMime = ALLOWED_MIME_TYPES.has(resolvedMime);
  const isAllowedExt = Boolean(EXTENSION_TO_MIME[ext]);

  if (!isAllowedMime && !isAllowedExt) {
    throw new Error("نوع الملف غير مدعوم. الأنواع المسموحة: الصور (JPG, PNG, WebP, GIF) وملفات PDF و Word.");
  }

  if (resolvedMime === "image/jpg" || resolvedMime === "image/pjpeg" || resolvedMime === "image/jfif") {
    resolvedMime = "image/jpeg";
  } else if (!resolvedMime && isAllowedExt) {
    resolvedMime = EXTENSION_TO_MIME[ext];
  }

  // Ensure storage folder exists
  await fs.mkdir(ATTACHMENTS_DIR, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Calculate SHA256 checksum
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  // Generate safe storage key to eliminate path traversal vulnerabilities
  const storageKey = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(ATTACHMENTS_DIR, storageKey);

  // Write file to private disk
  await fs.writeFile(filePath, buffer);

  // Save record in database
  const record = await prisma.activityAttachment.create({
    data: {
      activity_id: activityId,
      original_name: file.name,
      storage_key: storageKey,
      mime_type: resolvedMime || "application/octet-stream",
      byte_size: BigInt(file.size),
      checksum,
      uploaded_by_id: actorUserId || null,
    },
  });

  await logAudit({
    actorUserId,
    action: "UPLOAD_ATTACHMENT",
    entityType: "activity_attachment",
    entityId: record.id,
    afterData: {
      activityId,
      originalName: file.name,
      size: file.size,
      mimeType: resolvedMime,
    },
  });

  return {
    ...record,
    byte_size: Number(record.byte_size),
  };
}

export async function getAttachmentForDownload(attachmentId: string) {
  const attachment = await prisma.activityAttachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment || attachment.archived_at) {
    throw new Error("المرفق غير موجود أو تم حذفه.");
  }

  // Safe path resolution
  const safeFilename = path.basename(attachment.storage_key);
  const filePath = path.join(ATTACHMENTS_DIR, safeFilename);

  try {
    await fs.access(filePath);
  } catch {
    throw new Error("ملف المرفق غير موجود على الخادم.");
  }

  const fileBuffer = await fs.readFile(filePath);

  return {
    attachment,
    fileBuffer,
    originalName: attachment.original_name,
    mimeType: attachment.mime_type,
  };
}

export async function archiveAttachment(attachmentId: string, actorUserId?: string) {
  const attachment = await prisma.activityAttachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) {
    // Already deleted
    return null;
  }

  // Safely delete file from disk if exists
  try {
    const safeFilename = path.basename(attachment.storage_key);
    const filePath = path.join(ATTACHMENTS_DIR, safeFilename);
    await fs.unlink(filePath);
  } catch (e) {
    // File might already be gone
  }

  // Delete from database
  await prisma.activityAttachment.delete({
    where: { id: attachmentId },
  });

  await logAudit({
    actorUserId,
    action: "ARCHIVE_ATTACHMENT",
    entityType: "activity_attachment",
    entityId: attachmentId,
    beforeData: { originalName: attachment.original_name },
  });

  return true;
}
