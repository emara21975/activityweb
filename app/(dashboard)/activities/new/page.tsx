import React from "react";
import Link from "next/link";
import { getCurrentAcademicYear, getAcademicYears } from "@/lib/services/academic-year-service";
import { prisma } from "@/lib/db/prisma";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createActivityAction } from "@/app/actions/activity-actions";
import { ArrowRight, PlusCircle } from "lucide-react";

export default async function NewActivityPage() {
  const [currentYear, academicYears, categories] = await Promise.all([
    getCurrentAcademicYear(),
    getAcademicYears(),
    prisma.activityCategory.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    }),
  ]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/activities" className="hover:text-slate-800 flex items-center gap-1">
          <ArrowRight className="w-3.5 h-3.5" />
          <span>الأنشطة المدرسية</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">إنشاء نشاط جديد</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#8A1538]" />
            <CardTitle>إنشاء نشاط مدرسي جديد</CardTitle>
          </div>
          <CardDescription>
            تحديد اسم النشاط وتصنيفه وتاريخ التنفيذ ضمن العام الدراسي
          </CardDescription>
        </CardHeader>

        <form action={createActivityAction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم النشاط بالكامل *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="مثال: دوري كرة القدم للمرحلة الثانوية"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  التصنيف المعتمد *
                </label>
                <Link
                  href="/activities"
                  className="text-[11px] text-[#8A1538] hover:underline font-bold"
                  title="إدارة وتعديل وإضافة التصنيفات"
                >
                  + إدارة التصنيفات
                </Link>
              </div>
              <select
                name="category_id"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-medium"
              >
                <option value="">-- اختر التصنيف --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العام الدراسي *
              </label>
              <select
                name="academic_year_id"
                defaultValue={currentYear?.id || ""}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-medium"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? "(الحالي)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ النشاط *
              </label>
              <input
                type="date"
                name="activity_date"
                defaultValue={todayStr}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                حالة النشاط
              </label>
              <select
                name="status"
                defaultValue="COMPLETED"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-bold"
              >
                <option value="COMPLETED">منفذ (COMPLETED)</option>
                <option value="PLANNED">مخطط (PLANNED)</option>
                <option value="CANCELLED">ملغي (CANCELLED)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات أو وصف النشاط
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="وصف موجز لأهداف النشاط والجهة المنظمة..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link href="/activities">
              <Button type="button" variant="outline">
                إلغاء
              </Button>
            </Link>
            <Button type="submit" variant="primary" className="font-bold">
              حفظ النشاط
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
