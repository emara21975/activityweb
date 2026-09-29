"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateActivityVideoUrlAction } from "@/app/actions/activity-actions";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Play,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  Film,
  Sparkles,
  Info,
  X,
  Globe,
} from "lucide-react";

interface ActivityVideoDocumentationProps {
  activityId: string;
  initialVideoUrl?: string | null;
  canEdit?: boolean;
}

// Helper to parse video platforms
function parseVideoSource(rawUrl?: string | null): {
  type: "youtube" | "vimeo" | "googledrive" | "direct" | "generic";
  embedUrl?: string;
  cleanUrl: string;
} | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const url = rawUrl.trim();

  // 1. YouTube
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`,
      cleanUrl: url,
    };
  }

  // 2. Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      cleanUrl: url,
    };
  }

  // 3. Google Drive
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return {
      type: "googledrive",
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
      cleanUrl: url,
    };
  }

  // 4. Direct video files
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
    return {
      type: "direct",
      embedUrl: url,
      cleanUrl: url,
    };
  }

  // 5. Generic external link (OneDrive, SharePoint, Cloud storage, etc.)
  return {
    type: "generic",
    cleanUrl: url,
  };
}

export function ActivityVideoDocumentation({
  activityId,
  initialVideoUrl,
  canEdit = true,
}: ActivityVideoDocumentationProps) {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState(initialVideoUrl || "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const videoSource = parseVideoSource(videoUrl);

  const handleOpenModal = () => {
    setUrlInput(videoUrl || "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleSaveVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (trimmed) {
      try {
        new URL(trimmed);
      } catch {
        setError("يرجى إدخال رابط فيديو صالح يبدأ بـ http:// أو https://");
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await updateActivityVideoUrlAction(activityId, trimmed || null);
        if (res.success) {
          setVideoUrl(res.videoUrl);
          setIsModalOpen(false);
          router.refresh();
        }
      } catch (err: any) {
        setError(err?.message || "حدث خطأ أثناء حفظ رابط الفيديو");
      }
    });
  };

  const handleDeleteVideo = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }

    setConfirmDelete(false);
    startTransition(async () => {
      try {
        const res = await updateActivityVideoUrlAction(activityId, null);
        if (res.success) {
          setVideoUrl(null);
          router.refresh();
        }
      } catch (err: any) {
        alert(err?.message || "حدث خطأ أثناء حذف رابط الفيديو");
      }
    });
  };

  const handleCopyLink = () => {
    if (!videoUrl) return;
    navigator.clipboard.writeText(videoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Card className="p-0 overflow-hidden bg-white border border-slate-200 shadow-2xs print:hidden">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8A1538]/10 text-[#8A1538] flex items-center justify-center font-bold">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
                <span>توثيق الفيديو المرئي للفعالية</span>
                {videoUrl && (
                  <Badge variant="gold" className="text-[10px] py-0.5 px-2 font-mono">
                    {videoSource?.type === "youtube"
                      ? "YouTube"
                      : videoSource?.type === "vimeo"
                      ? "Vimeo"
                      : videoSource?.type === "googledrive"
                      ? "Google Drive"
                      : videoSource?.type === "direct"
                      ? "ملف فيديو مباشر"
                      : "رابط خارجي"}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>توثيق إلكتروني داخلي للرجوع إليه (لا يظهر في التقرير الرسمي المطبوع أو ملف Word)</span>
              </CardDescription>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {videoUrl && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                title="نسخ رابط الفيديو للحافظة"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? "تم النسخ" : "نسخ الرابط"}</span>
              </Button>

              <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  title="فتح الفيديو في نافذة مستقلة"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span>فتح الرابط</span>
                </Button>
              </a>
            </>
          )}

          {canEdit && (
            <>
              {videoUrl ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenModal}
                    className="gap-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    title="تعديل رابط الفيديو"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>تعديل</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteVideo}
                    disabled={isPending}
                    className={`gap-1.5 text-xs font-bold transition-all ${
                      confirmDelete
                        ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                        : "text-rose-600 hover:bg-rose-50"
                    }`}
                    title={confirmDelete ? "انقر مرة أخرى لتأكيد حذف الرابط" : "حذف رابط الفيديو"}
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>{confirmDelete ? "تأكيد الحذف؟" : "حذف"}</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenModal}
                  className="gap-1.5 text-xs font-bold bg-[#8A1538] hover:bg-[#72112E] text-white shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة رابط فيديو</span>
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>

      <div className="p-4 sm:p-6">
        {videoUrl && videoSource ? (
          <div className="space-y-4">
            {/* Embedded Player when available */}
            {videoSource.embedUrl ? (
              <div className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-md aspect-video relative">
                {videoSource.type === "direct" ? (
                  <video
                    src={videoSource.embedUrl}
                    controls
                    className="w-full h-full object-contain"
                  >
                    متصفحك لا يدعم تشغيل هذا الفيديو مباشرة.
                  </video>
                ) : (
                  <iframe
                    src={videoSource.embedUrl}
                    title="توثيق الفيديو للفعالية"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                )}
              </div>
            ) : (
              /* External link preview card */
              <div className="max-w-2xl mx-auto p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">رابط الفيديو التوثيقي الخارجي</h4>
                    <p className="text-xs text-slate-500 font-mono truncate max-w-xs sm:max-w-sm mt-0.5" dir="ltr">
                      {videoUrl}
                    </p>
                  </div>
                </div>

                <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" size="sm" className="bg-[#8A1538] hover:bg-[#72112E] text-white font-bold gap-1.5 text-xs">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>تشغيل الفيديو</span>
                  </Button>
                </a>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
              <span className="font-mono truncate max-w-md" dir="ltr">
                {videoUrl}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                يمكن لأي عضو مخول بالمدرسة مشاهدة التوثيق المرئي
              </span>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
              <Film className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">لا يوجد رابط فيديو لتوثيق هذا النشاط حالياً</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                يمكنك إضافة رابط فيديو من YouTube أو Google Drive أو OneDrive أو أي منصة سحابية لتسهيل استعراض مجريات الفعالية دون التأثير على التقرير الرسمي للوزارة.
              </p>
            </div>
            {canEdit && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenModal}
                  className="font-bold text-xs gap-1.5 text-[#8A1538] border-[#8A1538]/30 hover:bg-[#8A1538]/5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة رابط فيديو التوثيق</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Dialog for Adding / Editing Video Link */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#8A1538]/10 text-[#8A1538] flex items-center justify-center font-bold">
                  <Video className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base text-slate-800">
                  {videoUrl ? "تعديل رابط فيديو الفعالية" : "إضافة رابط فيديو الفعالية"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  رابط الفيديو (URL) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="https://www.youtube.com/watch?v=... أو رابط Google Drive"
                  className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8A1538] focus:border-transparent text-slate-900 bg-slate-50 focus:bg-white"
                  autoFocus
                  required
                />
              </div>

              {/* Supported Platforms Hints */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>المنصات المدعومة بالتشغيل المباشر:</span>
                </p>
                <ul className="list-disc list-inside text-slate-500 space-y-0.5 ps-1">
                  <li>روابط <strong>YouTube</strong> (عادي، Shorts، أو كود المشاركة)</li>
                  <li>روابط <strong>Google Drive</strong> (مع تفعيل صلاحية العرض للملف)</li>
                  <li>روابط <strong>Vimeo</strong> أو ملفات <strong>MP4 / WebM</strong> مباشرة</li>
                  <li>روابط Microsoft OneDrive أو سحابة المدرسة (تفتح بنقرة زر)</li>
                </ul>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  disabled={isPending}
                  className="text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPending || !urlInput.trim()}
                  className="bg-[#8A1538] hover:bg-[#72112E] text-white text-xs font-bold gap-1.5 shadow-xs"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{videoUrl ? "حفظ التعديلات" : "حفظ الرابط"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
