"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createBackupAction,
  restoreBackupAction,
  deleteBackupAction,
  uploadBackupAction,
} from "@/app/actions/backup-actions";
import { BackupSummary } from "@/lib/services/backup-service";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  Clock,
  Upload,
  X,
  Info,
} from "lucide-react";

interface BackupsClientProps {
  initialBackups: BackupSummary[];
  canCreate: boolean;
  canRestore: boolean;
}

export function BackupsClient({ initialBackups, canCreate, canRestore }: BackupsClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [backups, setBackups] = useState<BackupSummary[]>(initialBackups);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync state with server props
  useEffect(() => {
    setBackups(initialBackups);
  }, [initialBackups]);

  // Restore Modal State
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupSummary | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  // Metrics
  const totalBackups = backups.length;
  const totalBytes = backups.reduce((sum, b) => sum + (b.file_size_bytes || 0), 0);
  const latestBackup = backups[0]?.created_at
    ? new Date(backups[0].created_at).toLocaleDateString("ar-QA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "لا يوجد";

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCreateBackup = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await createBackupAction();
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`تم إنشاء النسخة الاحتياطية بنجاح: ${res.storageKey}`);
        router.refresh();
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("backupFile", file);

      const res = await uploadBackupAction(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`تم رفع النسخة الاحتياطية بنجاح: ${res.storageKey}. يمكنك الآن استعادتها من الجدول.`);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل رفع الملف");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBackupForRestore) return;

    if (restoreConfirmText.trim() !== "تأكيد الاستعادة") {
      setError('يرجى كتابة نص التأكيد بدقة: "تأكيد الاستعادة"');
      return;
    }

    setIsRestoring(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await restoreBackupAction(selectedBackupForRestore.id, restoreConfirmText);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(
          `تمت استعادة البيانات بنجاح! تم حفظ نقطة أمان قبل الاستعادة: ${res.safetyBackupKey}`
        );
        setSelectedBackupForRestore(null);
        setRestoreConfirmText("");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشلت عملية الاستعادة");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = async (backup: BackupSummary) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف النسخة الاحتياطية "${backup.storage_key}"؟`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await deleteBackupAction(backup.id);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`تم حذف النسخة الاحتياطية بنجاح.`);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for backup upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-[#8A1538]" />
            <span>النسخ الاحتياطي واستعادة النظام</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة النسخ الاحتياطية الشاملة واستعادتها مع التحقق بالبصمة الرقمية SHA256 وحفظ نقاط أمان تلقائية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isPending}
              className="shadow-xs font-bold gap-2 text-xs border-slate-300 hover:bg-slate-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#8A1538]" />
                  <span>جاري رفع الملف...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-[#8A1538]" />
                  <span>رفع نسخة من جهازك</span>
                </>
              )}
            </Button>
          )}

          {canCreate && (
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateBackup}
              disabled={isPending || isUploading}
              className="shadow-sm font-bold gap-2 text-xs bg-[#8A1538] hover:bg-[#70102d] text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إنشاء النسخة...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4 text-[#C59B27]" />
                  <span>إنشاء نسخة احتياطية فورية</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Guide notice explaining how restore works */}
      <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 text-xs flex items-start gap-2.5 shadow-2xs">
        <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">كيف تعمل خاصية استعادة النسخة الاحتياطية؟</p>
          <p className="text-blue-800 leading-relaxed">
            - لاستعادة نسخة محفوظة: اضغط على أيقونة الاستعادة البرتقالية (<span className="font-bold">↺</span>) الموجودة في عمود الإجراءات بالجدول بجانب أي نسخة.
            <br />
            - إذا كان لديك ملف نسخة احتياطية (.json) محفوظ على جهازك، اضغط على زر <span className="font-bold">"رفع نسخة من جهازك"</span> لرفعه وإدراجه في القائمة فوراً لتتمكن من استعادته.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي النسخ المتاحة</span>
            <Database className="w-4 h-4 text-[#8A1538]" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalBackups}</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">تاريخ آخر نسخة</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xs font-bold text-slate-700 mt-3 truncate">{latestBackup}</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">مساحة النسخ على القرص</span>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatSize(totalBytes)}</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">سياسة الاستعادة</span>
            <ShieldCheck className="w-4 h-4 text-[#C59B27]" />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <span>محمية بنقطة أمان تلقائية</span>
          </div>
        </Card>
      </div>

      {/* Backups List */}
      <Card className="p-0 overflow-hidden border border-slate-200 shadow-xs">
        <CardHeader className="p-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              سجل النسخ الاحتياطية المتوفرة
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              قائمة النسخ الاحتياطية المتوفرة على الخادم مع إمكانية التحميل أو الاستعادة.
            </CardDescription>
          </div>
          <Badge variant="neutral" className="text-xs font-mono">
            {backups.length} نسخة
          </Badge>
        </CardHeader>

        {backups.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-4 px-4">
            <Database className="w-14 h-14 mx-auto text-slate-300" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700">
                لم يتم إنشاء أو رفع أي نسخة احتياطية حتى الآن.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                يمكنك إنشاء نسخة جديدة لحفظ البيانات الحالية، أو رفع ملف نسخة سابقة (.json) من جهازك لاستعادتها فوراً.
              </p>
            </div>
            {canCreate && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2 text-xs font-bold border-slate-300"
                >
                  <Upload className="w-4 h-4 text-[#8A1538]" />
                  <span>رفع نسخة من جهازك</span>
                </Button>
                <Button
                  size="sm"
                  variant="gold"
                  onClick={handleCreateBackup}
                  disabled={isPending}
                  className="gap-2 text-xs font-bold"
                >
                  <HardDrive className="w-4 h-4" />
                  <span>إنشاء نسخة احتياطية فورية</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">م</th>
                  <th className="py-3 px-4">اسم ملف النسخة</th>
                  <th className="py-3 px-4">تاريخ الإنشاء</th>
                  <th className="py-3 px-4">الحجم</th>
                  <th className="py-3 px-4">بصمة SHA-256</th>
                  <th className="py-3 px-4">المنشئ</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {backups.map((b, idx) => {
                  const isPreRestore = b.storage_key.startsWith("pre-restore-safety");
                  const dateStr = new Date(b.created_at).toLocaleDateString("ar-QA", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{b.storage_key}</span>
                          {isPreRestore && (
                            <Badge variant="warning" className="text-[10px]">
                              نقطة أمان
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-sans">{dateStr}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {formatSize(b.file_size_bytes)}
                      </td>
                      <td className="py-3.5 px-4">
                        {b.checksum ? (
                          <span
                            className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded cursor-help"
                            title={b.checksum}
                          >
                            {b.checksum.substring(0, 10)}...
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{b.creator_name}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Download */}
                          <a
                            href={`/api/backups/${b.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                            title="تحميل ملف النسخة الاحتياطية"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          {/* Restore Button */}
                          {canRestore && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBackupForRestore(b);
                                setRestoreConfirmText("");
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors shadow-2xs"
                              title="استعادة قاعدة البيانات من هذه النسخة"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>استعادة</span>
                            </button>
                          )}

                          {/* Delete */}
                          {canCreate && (
                            <button
                              type="button"
                              onClick={() => handleDelete(b)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                              title="حذف النسخة الاحتياطية"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Safety Restore Modal */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700 font-black text-lg">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>تحذير أمني: استعادة النظام</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBackupForRestore(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>حماية تلقائية نشطة:</span>
              </p>
              <p>
                سيقوم النظام تلقائياً بإنشاء نقطة أمان احتياطية كاملة (Safety Snapshot) للحالة الحالية قبل الاستعادة، بحيث يمكنك التراجع في أي وقت.
              </p>
              <p className="font-bold text-rose-800 pt-1">
                تنبيه: سيتم استبدال سجلات الطلاب والأنشطة والمشاركات الحالية بمحتويات النسخة:
              </p>
              <p className="font-mono text-slate-800 bg-white p-2 rounded border border-amber-300">
                {selectedBackupForRestore.storage_key}
              </p>
            </div>

            <form onSubmit={handleRestoreSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  لتأكيد العملية، يرجى كتابة:{" "}
                  <span className="text-rose-700 font-black">تأكيد الاستعادة</span>
                </label>
                <input
                  type="text"
                  value={restoreConfirmText}
                  onChange={(e) => setRestoreConfirmText(e.target.value)}
                  placeholder="تأكيد الاستعادة"
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBackupForRestore(null)}
                  disabled={isRestoring}
                >
                  إلغاء
                </Button>

                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={restoreConfirmText.trim() !== "تأكيد الاستعادة" || isRestoring}
                  className="gap-2 font-bold"
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الاستعادة وتأمين النسخة...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>تأكيد الاستعادة الآن</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
