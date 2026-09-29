"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadAttachmentAction, archiveAttachmentAction } from "@/app/actions/attachment-actions";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Paperclip,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileArchive,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileCode,
  Eye,
  X,
} from "lucide-react";

export interface AttachmentItem {
  id: string;
  activity_id: string;
  original_name: string;
  storage_key: string;
  mime_type: string;
  byte_size: bigint | number;
  checksum: string | null;
  uploaded_by_id: string | null;
  created_at: Date;
  archived_at: Date | null;
}

interface ActivityAttachmentsProps {
  activityId: string;
  attachments: AttachmentItem[];
  canUpload: boolean;
  canRemove: boolean;
}

export function ActivityAttachments({
  activityId,
  attachments,
  canUpload,
  canRemove,
}: ActivityAttachmentsProps) {
  const router = useRouter();
  const [items, setItems] = useState<AttachmentItem[]>(attachments);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(attachments);
  }, [attachments]);

  const formatFileSize = (bytes: bigint | number) => {
    const b = typeof bytes === "bigint" ? Number(bytes) : bytes;
    if (b < 1024) return `${b} بايت`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} ك.ب`;
    return `${(b / (1024 * 1024)).toFixed(2)} م.ب`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="w-5 h-5 text-emerald-600" />;
    }
    if (mimeType === "application/pdf") {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (mimeType.includes("word") || mimeType.includes("officedocument")) {
      return <FileCode className="w-5 h-5 text-blue-600" />;
    }
    return <FileArchive className="w-5 h-5 text-slate-500" />;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setError("حجم الملف يتجاوز الحد الأقصى المسموح به (15 ميجابايت).");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("يرجى اختيار ملف لرفعه أولاً.");
      return;
    }

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("activity_id", activityId);
    formData.append("file", selectedFile);

    startTransition(async () => {
      const res = await uploadAttachmentAction(null, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess("تم رفع المرفق بنجاح وتأمينه على الخادم.");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (res?.attachment) {
          setItems((prev) => [res.attachment as any, ...prev]);
        }
        router.refresh();
      }
    });
  };

  const handleArchive = async (attachmentId: string, filename: string) => {
    // Two-step inline confirmation: click once to show "تأكيد الحذف؟", click again to execute
    if (confirmDeleteId !== attachmentId) {
      setConfirmDeleteId(attachmentId);
      setTimeout(() => {
        setConfirmDeleteId((cur) => (cur === attachmentId ? null : cur));
      }, 5000);
      return;
    }

    setConfirmDeleteId(null);
    setDeletingId(attachmentId);
    setError(null);
    setSuccess(null);

    // Optimistically update local state immediately
    const removedItem = items.find((a) => a.id === attachmentId);
    setItems((prev) => prev.filter((a) => a.id !== attachmentId));

    startTransition(async () => {
      try {
        const res = await archiveAttachmentAction(attachmentId, activityId);
        if (res?.error) {
          if (removedItem) setItems((prev) => [...prev, removedItem]);
          setError(res.error);
        } else {
          setSuccess(`تم حذف المرفق "${filename}" بنجاح.`);
          router.refresh();
        }
      } catch (err: unknown) {
        if (removedItem) setItems((prev) => [...prev, removedItem]);
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء حذف المرفق.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <>
      <Card className="overflow-hidden border border-slate-200">
        <CardHeader className="p-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs text-[#8A1538]">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                مرفقات ووثائق الفعالية
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                ملفات خاصة مؤمنة (صور الفعالية، شهادات، تقارير PDF، وثائق رسمية)
              </CardDescription>
            </div>
          </div>
          <Badge variant="neutral" className="font-mono text-xs">
            {items.length} مرفق
          </Badge>
        </CardHeader>

        <div className="p-5 space-y-5">
          {/* Alerts */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Upload Form (If authorized) */}
          {canUpload && (
            <form
              onSubmit={handleUpload}
              className="p-4 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl space-y-3"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800 block">
                    رفع مرفق جديد للنشاط
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    الأنواع المدعومة: صور (JPG, PNG, WebP) وملفات PDF و Word حتى 15 ميجابايت.
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id={`file-upload-${activityId}`}
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold gap-1.5"
                  >
                    <UploadCloud className="w-4 h-4 text-slate-500" />
                    <span>{selectedFile ? selectedFile.name : "اختر ملفاً..."}</span>
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    disabled={!selectedFile || isPending}
                    className="text-xs font-bold gap-1.5 shadow-xs"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الرفع والتأمين...</span>
                      </>
                    ) : (
                      <span>تأكيد الرفع</span>
                    )}
                  </Button>
                </div>
              </div>

              {selectedFile && (
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                  <span>الملف المحدد: <strong>{selectedFile.name}</strong></span>
                  <span>الحجم: {formatFileSize(selectedFile.size)}</span>
                </div>
              )}
            </form>
          )}

          {/* Attachments List */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-400 border border-slate-100 rounded-xl bg-slate-50/40">
              <Paperclip className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-500">لا توجد مرفقات مسجلة لهذا النشاط بعد.</p>
              {canUpload && (
                <p className="text-[11px] text-slate-400 mt-1">
                  يمكنك رفع صور أو وثائق التوثيق عبر النموذج أعلاه.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((att) => {
                const isDeleting = deletingId === att.id;
                const isImage = att.mime_type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(att.original_name);
                const imageUrl = `/api/attachments/${att.id}?v=${att.checksum || att.created_at || "1"}`;
                const dateStr = new Date(att.created_at).toLocaleDateString("ar-QA", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={att.id}
                    className="flex flex-col justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:shadow-xs transition-shadow relative group"
                  >
                    <div className="flex items-start gap-3">
                      {isImage ? (
                        <div
                          className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 cursor-pointer bg-slate-100 relative group/thumb"
                          onClick={() => setPreviewImage({ url: imageUrl, title: att.original_name })}
                          title="انقر لتكبير الصورة"
                        >
                          <img
                            src={imageUrl}
                            alt={att.original_name}
                            className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
                          {getFileIcon(att.mime_type)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-bold text-slate-900 truncate"
                          title={att.original_name}
                        >
                          {att.original_name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                          <span>{formatFileSize(att.byte_size)}</span>
                          <span>•</span>
                          <span>{dateStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100">
                      {isImage && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: imageUrl, title: att.original_name })}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-2 py-1 rounded transition-colors"
                          title="معاينة الصورة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة</span>
                        </button>
                      )}

                      <a
                        href={`/api/attachments/${att.id}?download=1`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8A1538] hover:bg-slate-50 px-2 py-1 rounded transition-colors"
                        title="تحميل المرفق"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل</span>
                      </a>

                      {canRemove && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isDeleting}
                          onClick={() => handleArchive(att.id, att.original_name)}
                          className={`h-7 px-2.5 text-[11px] font-bold gap-1 rounded-md transition-all ${
                            confirmDeleteId === att.id
                              ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                              : "text-rose-600 hover:bg-rose-50"
                          }`}
                          title={confirmDeleteId === att.id ? "انقر مرة أخرى لتأكيد الحذف الفوري" : "حذف المرفق"}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>جاري الحذف...</span>
                            </>
                          ) : confirmDeleteId === att.id ? (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>تأكيد الحذف؟</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-bold text-slate-800 truncate">
                {previewImage.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-slate-900/5 max-h-[75vh] overflow-auto">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-end gap-2">
              <a
                href={previewImage.url}
                download
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A1538] hover:underline px-3 py-1.5"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الصورة الأصلية</span>
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewImage(null)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
