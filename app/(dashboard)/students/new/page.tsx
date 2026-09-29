import React from "react";
import Link from "next/link";
import { getCurrentAcademicYear, getAcademicYears } from "@/lib/services/academic-year-service";
import { prisma } from "@/lib/db/prisma";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createStudentAction } from "@/app/actions/student-actions";
import { ArrowRight, UserPlus } from "lucide-react";

export default async function NewStudentPage() {
  const [currentYear, academicYears, gradeLevels, sections] = await Promise.all([
    getCurrentAcademicYear(),
    getAcademicYears(),
    prisma.gradeLevel.findMany({ orderBy: { sort_order: "asc" } }),
    prisma.section.findMany({ orderBy: { sort_order: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/students" className="hover:text-slate-800 flex items-center gap-1">
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة لسجل الطلاب</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">إضافة طالب جديد</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#8A1538]" />
            <CardTitle>إضافة طالب جديد إلى النظام</CardTitle>
          </div>
          <CardDescription>
            تسجيل هوية الطالب والقيد الدراسي في الصف والشعبة المحددة
          </CardDescription>
        </CardHeader>

        <form action={createStudentAction} className="space-y-6">
          {/* Identity Fields */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 pb-2 border-b border-slate-100">
              البيانات الشخصية والهوية
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرقم الأكاديمي (فريد)
                </label>
                <input
                  type="text"
                  name="academic_number"
                  placeholder="مثال: 20261001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرقم الشخصي (اختياري وحساس)
                </label>
                <input
                  type="text"
                  name="personal_number"
                  placeholder="الرقم الشخصي (محمي)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الطالب بالكامل (بالعربية) *
                </label>
                <input
                  type="text"
                  name="full_name_ar"
                  required
                  placeholder="أدخل الاسم الثلاثي أو الرباعي"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الطالب بالإنجليزية (اختياري)
                </label>
                <input
                  type="text"
                  name="full_name_en"
                  placeholder="Full Name in English"
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none text-left"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تصنيف الجنسية المعتمد للإحصاء *
                </label>
                <select
                  name="nationality_group"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-bold"
                >
                  <option value="QATARI">قطري (QATARI)</option>
                  <option value="NON_QATARI">غير قطري (NON_QATARI)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الجنسية الفعلية بالتفصيل
                </label>
                <input
                  type="text"
                  name="nationality"
                  placeholder="مثال: قطري، أردني، مصري..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Initial Enrollment Fields */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 pb-2 border-b border-slate-100">
              القيد والتسجيل الدراسي الأولي
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  العام الدراسي
                </label>
                <select
                  name="academic_year_id"
                  defaultValue={currentYear?.id || ""}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_current ? "(الحالي)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الصف الدراسي
                </label>
                <select
                  name="grade_level_id"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                >
                  <option value="">-- اختر الصف --</option>
                  {gradeLevels.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الشعبة
                </label>
                <select
                  name="section_id"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                >
                  <option value="">-- اختر الشعبة --</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      الشعبة {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات إضافية
              </label>
              <textarea
                name="notes"
                rows={2}
                placeholder="أي ملاحظات تخص الطالب أو مواهبه واهتماماته..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link href="/students">
              <Button type="button" variant="outline" size="md">
                إلغاء
              </Button>
            </Link>
            <Button type="submit" variant="primary" size="md" className="font-bold">
              حفظ وتسجيل الطالب
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
