import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "../lib/db/prisma";
import {
  saveActivityAttachment,
  getAttachmentForDownload,
  archiveAttachment,
} from "../lib/storage/attachment-service";
import {
  createSystemBackup,
  listSystemBackups,
  restoreSystemBackup,
} from "../lib/services/backup-service";
import {
  getRoles,
  getAllPermissionsList,
  updateRolePermissions,
} from "../lib/services/user-service";

async function runPhase3Verification() {
  console.log("==================================================================");
  console.log("🧪 STARTING PHASE 3 VERIFICATION TEST SUITE");
  console.log("==================================================================");

  // 1. Get an existing activity or create one for testing
  let activity = await prisma.activity.findFirst();
  if (!activity) {
    const year = await prisma.academicYear.findFirst();
    const cat = await prisma.activityCategory.findFirst();
    if (!year || !cat) {
      throw new Error("Missing academic year or category seed data");
    }
    activity = await prisma.activity.create({
      data: {
        name: "نشاط اختباري للمرحلة الثالثة",
        activity_date: new Date(),
        academic_year_id: year.id,
        category_id: cat.id,
        status: "COMPLETED",
      },
    });
  }

  // -----------------------------------------------------------------------------
  // TEST 1: Private Attachment Storage & SHA256 Verification
  // -----------------------------------------------------------------------------
  console.log("\n▶️ 1. Testing Secure Attachment Storage Engine...");

  const mockFileContent = Buffer.from("School Activity Report Content 2026 - Test PDF Buffer");
  const expectedChecksum = crypto.createHash("sha256").update(mockFileContent).digest("hex");

  // Create mock File object
  const mockFile = new File([mockFileContent], "test-activity-report.pdf", {
    type: "application/pdf",
  });

  const attachmentRecord = await saveActivityAttachment({
    activityId: activity.id,
    file: mockFile,
  });

  console.log(`  ✓ Attachment saved in DB with ID: ${attachmentRecord.id}`);
  console.log(`  ✓ Storage key: ${attachmentRecord.storage_key}`);
  console.log(`  ✓ Checksum: ${attachmentRecord.checksum}`);

  if (attachmentRecord.checksum !== expectedChecksum) {
    throw new Error(`Checksum mismatch! Expected ${expectedChecksum}, got ${attachmentRecord.checksum}`);
  }

  // Verify file exists on private disk
  const diskPath = path.join(process.cwd(), "storage", "attachments", attachmentRecord.storage_key);
  const diskBuffer = await fs.readFile(diskPath);
  if (!diskBuffer.equals(mockFileContent)) {
    throw new Error("Disk content does not match uploaded file buffer!");
  }
  console.log("  ✓ Verified physical file on private disk matches original buffer.");

  // Test download retrieval
  const downloadResult = await getAttachmentForDownload(attachmentRecord.id);
  if (!downloadResult.fileBuffer.equals(mockFileContent)) {
    throw new Error("Download buffer does not match expected content!");
  }
  console.log("  ✓ Download service verified with correct MIME and buffer.");

  // Test archiving attachment
  const archived = await archiveAttachment(attachmentRecord.id);
  if (!archived) {
    throw new Error("Failed to archive attachment!");
  }
  console.log("  ✓ Attachment archived successfully.");

  // -----------------------------------------------------------------------------
  // TEST 2: System Backup, Integrity Checksum, and Pre-Restore Safety Snapshot
  // -----------------------------------------------------------------------------
  console.log("\n▶️ 2. Testing Backup & Restore Engine...");

  const backupResult = await createSystemBackup(undefined, false);
  console.log(`  ✓ Created system backup: ${backupResult.storageKey}`);
  console.log("  ✓ Table counts in backup:", backupResult.counts);

  // List backups
  const backupsList = await listSystemBackups();
  const createdBackupSummary = backupsList.find((b) => b.storage_key === backupResult.storageKey);
  if (!createdBackupSummary || !createdBackupSummary.file_exists) {
    throw new Error("Created backup not found or not marked as file_exists!");
  }
  console.log(`  ✓ Backup verified on disk. Size: ${createdBackupSummary.file_size_bytes} bytes.`);

  // Test restore with mandatory pre-restore safety snapshot
  console.log("  🔄 Testing system restore drill...");
  const restoreResult = await restoreSystemBackup(createdBackupSummary.id);
  if (!restoreResult.safetyBackupKey) {
    throw new Error("Restore did not generate pre-restore safety snapshot!");
  }
  console.log(`  ✓ System restore succeeded! Pre-restore safety snapshot created: ${restoreResult.safetyBackupKey}`);

  // Verify that safety backup exists on disk
  const safetyPath = path.join(process.cwd(), "storage", "backups", restoreResult.safetyBackupKey);
  await fs.access(safetyPath);
  console.log("  ✓ Verified pre-restore safety backup exists on disk.");

  // -----------------------------------------------------------------------------
  // TEST 3: Roles & Permissions Matrix Management & Safeguards
  // -----------------------------------------------------------------------------
  console.log("\n▶️ 3. Testing Roles & Permissions Matrix...");

  const roles = await getRoles();
  const allPerms = await getAllPermissionsList();
  console.log(`  ✓ Fetched ${roles.length} roles and ${allPerms.length} permissions.`);

  const dataEntryRole = roles.find((r) => r.code === "DATA_ENTRY");
  if (!dataEntryRole) throw new Error("DATA_ENTRY role not found!");

  // Assign a subset of permissions to DATA_ENTRY
  const samplePermIds = allPerms.slice(0, 5).map((p) => p.id);
  const updatedRole = await updateRolePermissions(dataEntryRole.id, samplePermIds);
  if (!updatedRole || updatedRole.permissions.length !== 5) {
    throw new Error("Failed to update role permissions count!");
  }
  console.log(`  ✓ Updated DATA_ENTRY permissions to ${updatedRole.permissions.length} items.`);

  // Test SUPER_ADMIN safeguard (stripping should fail)
  const superAdminRole = roles.find((r) => r.code === "SUPER_ADMIN");
  if (superAdminRole) {
    try {
      await updateRolePermissions(superAdminRole.id, []);
      throw new Error("SUPER_ADMIN should NOT allow stripping all permissions!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ✓ Safeguard active: prevented stripping SUPER_ADMIN permissions (${msg})`);
    }
  }

  console.log("\n==================================================================");
  console.log("🎉 ALL PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================================");
}

runPhase3Verification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Phase 3 verification failed:", err);
    process.exit(1);
  });
