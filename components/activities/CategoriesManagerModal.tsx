"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  toggleCategoryStatusAction,
} from "@/app/actions/category-actions";
import { CategoryWithCount } from "@/lib/services/category-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  FolderPlus,
  Info,
  Power,
  ArrowUpDown,
  Tag,
} from "lucide-react";

interface CategoriesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryWithCount[];
  canManage?: boolean;
}

export function CategoriesManagerModal({
  isOpen,
  onClose,
  categories,
  canManage = true,
}: CategoriesManagerModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"list" | "create" | "edit">("list");
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    code: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Delete confirmation
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithCount | null>(null);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setError(null);
    setSuccess(null);
    setEditingCategory(null);
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
    setFormData({
      name_ar: "",
      name_en: "",
      code: "",
      description: "",
      sort_order: maxOrder + 1,
      is_active: true,
    });
    setActiveTab("create");
  };

  const handleOpenEdit = (cat: CategoryWithCount) => {
    setError(null);
    setSuccess(null);
    setEditingCategory(cat);
    setFormData({
      name_ar: cat.name_ar,
      name_en: cat.name_en || "",
      code: cat.code,
      description: cat.description || "",
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
    setActiveTab("edit");
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_ar.trim()) {
      setError("اسم التصنيف بالعربية مطلوب.");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      if (activeTab === "create") {
        const res = await createCategoryAction({
          name_ar: formData.name_ar.trim(),
          name_en: formData.name_en.trim() || undefined,
          code: formData.code.trim() || undefined,
          description: formData.description.trim() || undefined,
          sort_order: Number(formData.sort_order),
          is_active: formData.is_active,
        });

        if (res.error) {
          setError(res.error);
        } else {
          setSuccess("تم إنشاء التصنيف بنجاح.");
          setActiveTab("list");
          router.refresh();
        }
      } else if (activeTab === "edit" && editingCategory) {
        const res = await updateCategoryAction(editingCategory.id, {
          name_ar: formData.name_ar.trim(),
          name_en: formData.name_en.trim() || undefined,
          code: formData.code.trim() || undefined,
          description: formData.description.trim() || undefined,
          sort_order: Number(formData.sort_order),
          is_active: formData.is_active,
        });

        if (res.error) {
          setError(res.error);
        } else {
          setSuccess("تم حفظ تعديلات التصنيف بنجاح.");
          setActiveTab("list");
          router.refresh();
        }
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await deleteCategoryAction(deletingCategory.id);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`تم حذف تصنيف "${deletingCategory.name_ar}" بنجاح.`);
        setDeletingCategory(null);
        router.refresh();
      }
    });
  };

  const handleToggleStatus = (cat: CategoryWithCount) => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await toggleCategoryStatusAction(cat.id);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(
          `تم ${cat.is_active ? "تعطيل" : "تنشيط"} تصنيف "${cat.name_ar}" بنجاح.`
        );
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8A1538]/10 text-[#8A1538] border border-[#8A1538]/20 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800">
                  إدارة تصنيفات ومجالات الأنشطة
                </h3>
                <span className="text-[10px] font-bold bg-[#8A1538] text-white px-2 py-0.5 rounded-full">
                  {categories.length} تصنيف
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                إضافة تصنيفات جديدة، وتعديل المسميات والترتيب، أو تعطيل التصنيفات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "list" && canManage && (
              <Button
                onClick={handleOpenCreate}
                size="sm"
                className="gap-1.5 text-xs font-bold bg-[#8A1538] hover:bg-[#72112E] text-white shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة تصنيف جديد</span>
              </Button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notices */}
        {error && (
          <div className="mx-5 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-xs">
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
          <div className="mx-5 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {activeTab === "list" ? (
            <div className="space-y-3">
              {categories.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-3">
                  <Layers className="w-12 h-12 mx-auto stroke-1" />
                  <p className="text-sm font-semibold">لا توجد تصنيفات مسجلة حالياً</p>
                  <Button
                    onClick={handleOpenCreate}
                    size="sm"
                    className="gap-1.5 text-xs font-bold bg-[#8A1538] text-white"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة أول تصنيف</span>
                  </Button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4 text-center w-12">#</th>
                        <th className="py-3 px-4">اسم التصنيف</th>
                        <th className="py-3 px-3">الرمز الكودي</th>
                        <th className="py-3 px-3 text-center">الأنشطة المرتبطة</th>
                        <th className="py-3 px-3 text-center">الحالة</th>
                        <th className="py-3 px-4 text-left">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categories.map((cat, idx) => (
                        <tr
                          key={cat.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                            {cat.sort_order || idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 text-sm">
                              {cat.name_ar}
                            </div>
                            {cat.name_en && (
                              <div className="text-[11px] text-slate-400 font-sans">
                                {cat.name_en}
                              </div>
                            )}
                            {cat.description && (
                              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                {cat.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                              {cat.code}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full ${
                                cat.activitiesCount > 0
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {cat.activitiesCount} نشاط
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleToggleStatus(cat)}
                              disabled={!canManage || isPending}
                              title="انقر لتغيير الحالة (نشط / معطل)"
                              className="cursor-pointer"
                            >
                              {cat.is_active ? (
                                <Badge variant="success" className="text-[10px] gap-1 cursor-pointer">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                                  <span>نشط</span>
                                </Badge>
                              ) : (
                                <Badge variant="neutral" className="text-[10px] gap-1 cursor-pointer">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                                  <span>معطل</span>
                                </Badge>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              {canManage && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenEdit(cat)}
                                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                    title="تعديل التصنيف"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeletingCategory(cat)}
                                    className={`h-8 w-8 p-0 ${
                                      cat.activitiesCount > 0
                                        ? "text-slate-300 hover:text-slate-400 cursor-help"
                                        : "text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                                    }`}
                                    title={
                                      cat.activitiesCount > 0
                                        ? `مرتبط بـ ${cat.activitiesCount} نشاط - يمكنك تعطيله بدلاً من حذفه`
                                        : "حذف التصنيف نهائياً"
                                    }
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Create / Edit Form */
            <form onSubmit={handleSubmitForm} className="space-y-4 max-w-xl mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#8A1538]" />
                  <span>
                    {activeTab === "create" ? "إضافة تصنيف نشاط جديد" : "تعديل بيانات التصنيف"}
                  </span>
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم التصنيف (بالعربية) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="مثال: النشاط العلمي والابتكار"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-[#8A1538] focus:ring-2 focus:ring-[#8A1538]/10 outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرمز الكودي للتصنيف (Code)
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="مثال: SCI_ACT (تلقائي إن ترك فارغاً)"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-semibold focus:border-[#8A1538] outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    يستخدم كمعرف فريد للتصنيف
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الاسم بالإنجليزية (اختياري)
                  </label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="e.g. Scientific & Innovation Activity"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#8A1538] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الوصف أو الأهداف (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف مختصر لمجال النشاط وأهدافه..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#8A1538] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ترتيب العرض (الفرز)
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:border-[#8A1538] outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-[#8A1538] focus:ring-[#8A1538]"
                    />
                    <span className="text-xs font-bold text-slate-700">تنشيط التصنيف للفعاليات</span>
                  </label>
                </div>
              </div>

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
                  disabled={isPending}
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
                      <span>
                        {activeTab === "create" ? "إنشاء التصنيف" : "حفظ التعديلات"}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info strip */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between px-5">
          <span>التصنيفات المعتمدة تظهر في تسجيل الأنشطة والتقارير الإحصائية الرسمية</span>
          <span className="font-mono font-bold text-slate-500">
            {categories.filter((c) => c.is_active).length} نشط من أصل {categories.length}
          </span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  تأكيد حذف تصنيف "{deletingCategory.name_ar}"
                </h4>
                <span className="text-[11px] text-slate-400">حذف نهائي للتصنيف</span>
              </div>
            </div>

            {deletingCategory.activitiesCount > 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900">
                <p className="font-bold">لا يمكن حذف هذا التصنيف مباشرة:</p>
                <p>
                  يوجد حالياً <strong>{deletingCategory.activitiesCount} نشاط</strong> مرتبط بهذا التصنيف. للحفاظ على سلامة سجلات الفعاليات، يرجى إما نقل الأنشطة لتصنيف آخر، أو تعطيل التصنيف بدلاً من حذفه حتى لا يظهر في الإدخالات الجديدة.
                </p>
                <Button
                  onClick={() => {
                    handleToggleStatus(deletingCategory);
                    setDeletingCategory(null);
                  }}
                  size="sm"
                  className="w-full mt-2 font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  تعطيل هذا التصنيف الآن
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200">
                هل أنت متأكد من حذف هذا التصنيف نهائياً؟ هذا التصنيف لا يحتوي على أي أنشطة مرتبطة به حالياً وسيتم حذفه بأمان.
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingCategory(null)}
                disabled={isPending}
                className="text-xs font-bold text-slate-500"
              >
                إلغاء
              </Button>
              {deletingCategory.activitiesCount === 0 && (
                <Button
                  onClick={handleConfirmDelete}
                  variant="primary"
                  size="sm"
                  disabled={isPending}
                  className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>تأكيد الحذف</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
