import React from "react";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { getAcademicYears } from "@/lib/services/academic-year-service";
import { prisma } from "@/lib/db/prisma";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  updateSchoolSettingsAction,
  createAcademicYearAction,
  setCurrentAcademicYearAction,
  updateAcademicYearTermsAction,
} from "@/app/actions/settings-actions";
import { School, Calendar, CheckCircle2, Plus, Layers, Tag, CalendarRange, Clock } from "lucide-react";

import { SettingsNav } from "@/components/settings/SettingsNav";
import { getSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await getSession();
  const [settings, academicYears, categories, gradeLevels] = await Promise.all([
    getSchoolSettings(),
    getAcademicYears(),
    prisma.activityCategory.findMany({ orderBy: { sort_order: "asc" } }),
    prisma.gradeLevel.findMany({ orderBy: { sort_order: "asc" } }),
  ]);

  const currentYear: any = academicYears.find((y) => y.id === settings.current_academic_year_id) || academicYears.find((y) => y.is_current) || academicYears[0];

  const formatDateForInput = (d: Date | null | undefined) => {
    if (!d) return "";
    return new Date(d).toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      <SettingsNav
        userPermissions={session?.user?.permissions}
        userRoles={session?.user?.roles}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* School Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <School className="w-5 h-5 text-[#8A1538]" />
              <CardTitle>بيانات وهوية المدرسة</CardTitle>
            </div>
            <CardDescription>تظهر هذه البيانات في ترويسات التقارير الرسمية وشهادات المشاركة</CardDescription>
          </CardHeader>

          <form action={updateSchoolSettingsAction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم المدرسة (بالعربية) *
              </label>
              <input
                type="text"
                name="school_name_ar"
                defaultValue={settings.school_name_ar}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم المدرسة (بالإنجليزية)
              </label>
              <input
                type="text"
                name="school_name_en"
                defaultValue={settings.school_name_en || ""}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none text-left"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رمز المدرسة الوزاري
                </label>
                <input
                  type="text"
                  name="school_code"
                  defaultValue={settings.school_code || ""}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم اخصائي الأنشطة
                </label>
                <input
                  type="text"
                  name="supervisor_name"
                  defaultValue={settings.supervisor_name || ""}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العام الدراسي الحالي المعتمد
              </label>
              <select
                name="current_academic_year_id"
                defaultValue={settings.current_academic_year_id || ""}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-medium"
              >
                <option value="">-- اختر العام الدراسي --</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? "(العام الحالي)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" className="font-bold">
                حفظ تعديلات المدرسة
              </Button>
            </div>
          </form>
        </Card>

        {/* Academic Years Manager */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#C59B27]" />
                <CardTitle>الأعوام الدراسية</CardTitle>
              </div>
              <CardDescription>تحديد العام النشط وفصل بيانات الأنشطة بحسب السنوات</CardDescription>
            </CardHeader>

            {/* List */}
            <div className="space-y-3 mb-6">
              {academicYears.map((year) => (
                <div
                  key={year.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    year.is_current
                      ? "bg-amber-50/60 border-amber-200 shadow-xs"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{year.name}</span>
                      {year.is_current && <Badge variant="gold">العام الحالي</Badge>}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      من {new Date(year.start_date).toISOString().split("T")[0]} إلى{" "}
                      {new Date(year.end_date).toISOString().split("T")[0]}
                    </span>
                  </div>

                  {!year.is_current && (
                    <form action={setCurrentAcademicYearAction.bind(null, year.id)}>
                      <Button size="sm" variant="outline" type="submit" className="text-xs">
                        تعيين كعام حالي
                      </Button>
                    </form>
                  )}
                </div>
              ))}
            </div>

            {/* Create new academic year */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#8A1538]" />
                <span>إضافة عام دراسي جديد</span>
              </h4>

              <form action={createAcademicYearAction} className="space-y-3">
                <div>
                  <input
                    type="text"
                    name="name"
                    placeholder="اسم العام الدراسي (مثال: 2026-2027)"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">تاريخ البداية</label>
                    <input
                      type="date"
                      name="start_date"
                      required
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">تاريخ النهاية</label>
                    <input
                      type="date"
                      name="end_date"
                      required
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" name="is_current" className="rounded text-[#8A1538]" />
                    <span>تعيينه كعام حالي فوراً</span>
                  </label>

                  <Button type="submit" size="sm" variant="secondary" className="text-xs font-bold">
                    إضافة العام
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </div>

      {/* Academic Year Terms & Semester Periods Manager */}
      {currentYear && (
        <Card className="border-t-4 border-t-[#8A1538] shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#8A1538] border border-amber-100">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base">فترات الفصول الدراسية (الفصل الأول / الفصل الثاني)</CardTitle>
                  <CardDescription>
                    تحديد المدى الزمني للفصول الدراسية للعام المعتمد ({currentYear.name}) لربطها بفلتر لوحة المؤشرات
                  </CardDescription>
                </div>
              </div>
              <Badge variant="gold" className="text-xs px-3 py-1 font-bold">
                العام الدراسي: {currentYear.name}
              </Badge>
            </div>
          </CardHeader>

          <div className="p-6 pt-0 space-y-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-600 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                ℹ
              </div>
              <div>
                <span className="font-bold text-slate-800">كيف يعمل فلتر الفترات في لوحة المؤشرات؟</span>
                <p className="mt-0.5 text-slate-600 leading-relaxed">
                  عند اختيار <span className="font-bold text-[#8A1538]">"الفصل الدراسي الأول"</span> أو <span className="font-bold text-[#8A1538]">"الفصل الدراسي الثاني"</span> في لوحة المؤشرات،
                  يقوم النظام بحصر وإحصاء جميع الأنشطة المنفذة بين تاريخ البداية وتاريخ النهاية المحددين هنا تلقائياً.
                </p>
              </div>
            </div>

            <form action={updateAcademicYearTermsAction} className="space-y-6">
              <input type="hidden" name="academic_year_id" value={currentYear.id} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Term 1 */}
                <div className="bg-white border-2 border-slate-100 hover:border-amber-200 rounded-2xl p-5 shadow-xs transition-all space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#8A1538]/10 text-[#8A1538] font-black text-xs flex items-center justify-center">
                        1
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm">الفصل الدراسي الأول</h4>
                    </div>
                    {currentYear.term1_start_date && currentYear.term1_end_date ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        محدد ومفعل
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        قيد التحديد
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        تاريخ بداية الفصل الأول
                      </label>
                      <input
                        type="date"
                        name="term1_start_date"
                        defaultValue={formatDateForInput(currentYear.term1_start_date)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        تاريخ نهاية الفصل الأول
                      </label>
                      <input
                        type="date"
                        name="term1_end_date"
                        defaultValue={formatDateForInput(currentYear.term1_end_date)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Term 2 */}
                <div className="bg-white border-2 border-slate-100 hover:border-amber-200 rounded-2xl p-5 shadow-xs transition-all space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#C59B27]/20 text-[#C59B27] font-black text-xs flex items-center justify-center">
                        2
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm">الفصل الدراسي الثاني</h4>
                    </div>
                    {currentYear.term2_start_date && currentYear.term2_end_date ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        محدد ومفعل
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        قيد التحديد
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        تاريخ بداية الفصل الثاني
                      </label>
                      <input
                        type="date"
                        name="term2_start_date"
                        defaultValue={formatDateForInput(currentYear.term2_start_date)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        تاريخ نهاية الفصل الثاني
                      </label>
                      <input
                        type="date"
                        name="term2_end_date"
                        defaultValue={formatDateForInput(currentYear.term2_end_date)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <Button type="submit" variant="primary" className="font-bold px-6">
                  حفظ تواريخ الفصول الدراسية
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Reference Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#8A1538]" />
              <CardTitle>التصنيفات التسعة للأنشطة المدرسية</CardTitle>
            </div>
            <CardDescription>التصنيفات المعتمدة رسميًا لخطط الأنشطة</CardDescription>
          </CardHeader>

          <div className="divide-y divide-slate-100">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-800">{cat.name_ar}</span>
                </div>
                <Badge variant="neutral">{cat.code}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Grade Levels */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#C59B27]" />
              <CardTitle>الصفوف الدراسية</CardTitle>
            </div>
            <CardDescription>المراحل المعتمدة في المدرسة</CardDescription>
          </CardHeader>

          <div className="divide-y divide-slate-100">
            {gradeLevels.map((gl) => (
              <div key={gl.id} className="py-3 flex items-center justify-between text-xs font-bold text-slate-800">
                <span>{gl.name_ar}</span>
                <Badge variant="maroon">{gl.name_en || "نشط"}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
