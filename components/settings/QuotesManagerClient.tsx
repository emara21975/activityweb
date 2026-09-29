"use client";

import React, { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createQuoteAction,
  updateQuoteAction,
  deleteQuoteAction,
  toggleQuoteStatusAction,
  uploadQuoteImageAction,
} from "@/app/actions/quote-actions";
import { InspirationalQuoteItem } from "@/lib/services/quote-service";
import { InspirationalQuoteWidget } from "@/components/layout/InspirationalQuoteWidget";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Quote,
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  Eye,
  X,
  RotateCcw,
  Check,
} from "lucide-react";

interface QuotesManagerClientProps {
  quotes: InspirationalQuoteItem[];
  schoolName: string;
}

const PRESET_BACKGROUNDS = [
  { label: "أفق الدوحة والعلم القطري (الافتراضي)", url: "/back.jpg" },
];

export function QuotesManagerClient({ quotes, schoolName }: QuotesManagerClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [editingQuote, setEditingQuote] = useState<InspirationalQuoteItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    quote_text: "",
    author_title: schoolName || "مدرسة عبد الله بن علي المسند الثانوية للبنين",
    sub_title: "نظام إدارة الأنشطة والفعاليات",
    image_url: "/back.jpg",
    display_order: 1,
    is_active: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete modal state
  const [deletingQuote, setDeletingQuote] = useState<InspirationalQuoteItem | null>(null);

  const handleOpenCreate = () => {
    setError(null);
    setSuccess(null);
    setEditingQuote(null);
    const maxOrder = quotes.reduce((max, q) => Math.max(max, q.display_order), 0);
    setFormData({
      quote_text: "",
      author_title: schoolName || "مدرسة عبد الله بن علي المسند الثانوية للبنين",
      sub_title: "نظام إدارة الأنشطة والفعاليات",
      image_url: "/back.jpg",
      display_order: maxOrder + 1,
      is_active: true,
    });
    setActiveTab("form");
  };

  const handleOpenEdit = (q: InspirationalQuoteItem) => {
    setError(null);
    setSuccess(null);
    setEditingQuote(q);
    setFormData({
      quote_text: q.quote_text,
      author_title: q.author_title || schoolName,
      sub_title: q.sub_title || "نظام إدارة الأنشطة والفعاليات",
      image_url: q.image_url || "/back.jpg",
      display_order: q.display_order,
      is_active: q.is_active,
    });
    setActiveTab("form");
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      const fd = new FormData();
      fd.append("file", file);

      const res = await uploadQuoteImageAction(fd);
      if (res.error) {
        setError(res.error);
      } else if (res.imageUrl) {
        setFormData((prev) => ({ ...prev, image_url: res.imageUrl! }));
        setSuccess("تم رفع الصورة الجديدة بنجاح وتعيينها كخلفية للعبارة.");
      }
    } catch {
      setError("فشل رفع الصورة. يرجى التأكد من أن صيغة الملف صورة صالحة.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.quote_text.trim()) {
      setError("نص العبارة التحفيزية مطلوب.");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      if (editingQuote) {
        const res = await updateQuoteAction(editingQuote.id, {
          quote_text: formData.quote_text.trim(),
          author_title: formData.author_title.trim() || undefined,
          sub_title: formData.sub_title.trim() || undefined,
          image_url: formData.image_url.trim() || undefined,
          display_order: Number(formData.display_order),
          is_active: formData.is_active,
        });

        if (res.error) {
          setError(res.error);
        } else {
          setSuccess("تم حفظ التعديلات بنجاح.");
          setActiveTab("list");
          router.refresh();
        }
      } else {
        const res = await createQuoteAction({
          quote_text: formData.quote_text.trim(),
          author_title: formData.author_title.trim() || undefined,
          sub_title: formData.sub_title.trim() || undefined,
          image_url: formData.image_url.trim() || undefined,
          display_order: Number(formData.display_order),
          is_active: formData.is_active,
        });

        if (res.error) {
          setError(res.error);
        } else {
          setSuccess("تمت إضافة العبارة التحفيزية بنجاح.");
          setActiveTab("list");
          router.refresh();
        }
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingQuote) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await deleteQuoteAction(deletingQuote.id);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess("تم حذف العبارة بنجاح.");
        setDeletingQuote(null);
        router.refresh();
      }
    });
  };

  const handleToggleStatus = (q: InspirationalQuoteItem) => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await toggleQuoteStatusAction(q.id);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`تم ${q.is_active ? "تعطيل" : "تنشيط"} العبارة بنجاح.`);
        router.refresh();
      }
    });
  };

  // Preview dummy item for real-time visualization
  const previewItem: InspirationalQuoteItem = {
    id: "preview-temp",
    quote_text: formData.quote_text.trim() || "الأنشطة تصنع الفرق في الطلاب وتبني مهارات المستقبل",
    author_title: formData.author_title.trim() || schoolName,
    sub_title: formData.sub_title.trim() || "نظام إدارة الأنشطة والفعاليات",
    image_url: formData.image_url || "/back.jpg",
    display_order: formData.display_order,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-[#8A1538]/10 via-amber-50 to-transparent border border-[#8A1538]/20 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8A1538] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span>إدارة العبارات التحفيزية والبانر المتكرر</span>
              <span className="text-[10px] bg-[#8A1538] text-white px-2 py-0.5 rounded-full font-bold">
                {quotes.length} عبارات مسجلة
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              هذا الجزء يظهر في القائمة الجانبية بجميع صفحات النظام ويتبدل تلقائياً كل بضع ثوانٍ لعرض عبارات تحفيزية وصور الهوية الوطنية.
            </p>
          </div>
        </div>

        {activeTab === "list" && (
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="gap-1.5 text-xs font-bold bg-[#8A1538] hover:bg-[#72112E] text-white shadow-2xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة عبارة جديدة</span>
          </Button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Body */}
      {activeTab === "list" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quotes.map((q) => (
              <Card
                key={q.id}
                className="p-4 bg-white border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs group"
              >
                <div>
                  {/* Live Rendered Widget Preview */}
                  <div className="mb-3 transform scale-98 hover:scale-100 transition-transform">
                    <InspirationalQuoteWidget quotes={[q]} variant="card" />
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">
                        الترتيب: <strong className="font-mono text-slate-800">{q.display_order}</strong>
                      </span>
                      <button
                        onClick={() => handleToggleStatus(q)}
                        disabled={isPending}
                        className="cursor-pointer"
                        title="تبديل الحالة"
                      >
                        {q.is_active ? (
                          <Badge variant="success" className="text-[10px]">
                            نشط
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px]">
                            معطل
                          </Badge>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 font-medium line-clamp-2">
                      "{q.quote_text}"
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                    {q.image_url}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(q)}
                      className="h-8 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Pencil className="w-3.5 h-3.5 ml-1" />
                      <span>تعديل</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingQuote(q)}
                      disabled={quotes.length <= 1}
                      className="h-8 px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                      title={quotes.length <= 1 ? "يجب الإبقاء على عبارة واحدة على الأقل" : "حذف"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Create / Edit Form with Live Preview */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Top Live Preview */}
          <div className="lg:col-span-5 space-y-3 sticky top-20">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#8A1538]" />
              <span>معاينة حية فورية للشكل على الصفحات</span>
            </h4>
            <InspirationalQuoteWidget quotes={[previewItem]} variant="card" />
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              هكذا ستظهر العبارة والصورة في أعلى يسار صفحات النظام مع تأثيرات الألوان القطرية والشفافية.
            </p>
          </div>

          {/* Form */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="font-bold text-sm text-slate-800">
                  {editingQuote ? "تعديل العبارة والصورة" : "إضافة عبارة تحفيزية جديدة"}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("list")}
                  className="text-xs text-slate-500 font-bold"
                >
                  العودة للقائمة
                </Button>
              </div>

              {/* Quote Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص الاقتباس / العبارة التحفيزية *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.quote_text}
                  onChange={(e) => setFormData({ ...formData, quote_text: e.target.value })}
                  placeholder="مثال: الأنشطة تصنع الفرق في الطلاب وتبني مهارات المستقبل"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-[#8A1538] focus:ring-2 focus:ring-[#8A1538]/10 outline-none leading-relaxed"
                  autoFocus
                />
              </div>


              {/* Background Image Selection & Upload */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  صورة الخلفية للبطاقة
                </label>

                {/* Preset Options */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="/back.jpg أو رابط صورة مخصص"
                      className="flex-1 p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:border-[#8A1538] outline-none text-left"
                    />

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="gap-1 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50 shrink-0"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري الرفع...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع صورة جديدة</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-400">الصور الجاهزة:</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: "/back.jpg" })}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                        formData.image_url === "/back.jpg"
                          ? "bg-[#8A1538] text-white border-[#8A1538]"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      أفق الدوحة والعلم القطري
                    </button>
                  </div>
                </div>
              </div>

              {/* Order & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ترتيب الظهور في التبديل
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:border-[#8A1538] outline-none"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-[#8A1538] focus:ring-[#8A1538]"
                    />
                    <span className="text-xs font-bold text-slate-700">تنشيط هذه العبارة في العرض</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("list")}
                  disabled={isPending}
                  className="text-xs font-bold text-slate-500"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPending || isUploading}
                  className="gap-1.5 text-xs font-bold bg-[#8A1538] hover:bg-[#72112E] text-white shadow-xs"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{editingQuote ? "حفظ التعديلات" : "إضافة العبارة"}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h4 className="font-bold text-sm text-slate-900">تأكيد حذف العبارة</h4>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              "{deletingQuote.quote_text}"
            </p>
            <p className="text-xs text-slate-500">
              هل أنت متأكد من حذف هذه العبارة التحفيزية؟ لن تظهر في التبديل التلقائي بعد الآن.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingQuote(null)}
                disabled={isPending}
                className="text-xs font-bold text-slate-500"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleConfirmDelete}
                variant="primary"
                size="sm"
                disabled={isPending}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 ml-1" />
                )}
                <span>تأكيد الحذف</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
