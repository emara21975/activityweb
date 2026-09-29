import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentById } from "@/lib/services/student-service";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/PrintButton";
import { OfficialPrintHeader } from "@/components/reports/OfficialPrintHeader";
import { OfficialPrintFooter } from "@/components/reports/OfficialPrintFooter";
import { updateStudentAction } from "@/app/actions/student-actions";
import {
  ArrowRight,
  User,
  GraduationCap,
  Calendar,
  Flag,
  Globe,
  Award,
  Layers,
} from "lucide-react";

interface StudentProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentProfilePage({ params }: StudentProfilePageProps) {
  const { id } = await params;
  const [student, schoolSettings] = await Promise.all([
    getStudentById(id),
    getSchoolSettings(),
  ]);

  if (!student) {
    notFound();
  }

  const schoolName = schoolSettings?.school_name_ar || "مدرسة عبد الله بن علي المسند الثانوية للبنين";
  const latestEnrollment = student.enrollments[0];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Print Button */}
      <div className="flex items-center justify-between pb-1 print:hidden">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/students" className="hover:text-slate-800 flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5" />
            <span>سجل الطلاب</span>
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold">{student.full_name_ar}</span>
        </div>

        <PrintButton label="طباعة السجل الأكاديمي للأنشطة (HTML / PDF)" variant="outline" size="sm" />
      </div>

      {/* Printable Official Header (Shown only during print) */}
      <div className="hidden print:block mb-6">
        <OfficialPrintHeader
          schoolName={schoolName}
          reportTitle="سجل ومشاركات الطالب في الأنشطة المدرسية"
          academicYearName={latestEnrollment?.academic_year?.name || "العام الحالي"}
          subtitle={`ملف الطالب: ${student.full_name_ar} — الصف: ${latestEnrollment?.class_group.grade_level.name_ar || "—"} / شعبة ${latestEnrollment?.class_group.section.name || "—"}`}
        />
      </div>

      {/* Profile Header Card */}
      <Card className="bg-gradient-to-r from-white via-slate-50 to-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#8A1538] text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-[#8A1538]/20">
              {student.full_name_ar.slice(0, 1)}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black text-slate-900">{student.full_name_ar}</h1>
                <Badge variant={student.is_active ? "success" : "neutral"}>
                  {student.is_active ? "قيد نشط" : "مؤرشف"}
                </Badge>
              </div>

              {student.full_name_en && (
                <p className="text-xs text-slate-400 font-medium mt-0.5" dir="ltr">
                  {student.full_name_en}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">الرقم الأكاديمي:</span>
                  <span className="font-mono font-bold">{student.academic_number || "غير محدد"}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {student.nationality_group === "QATARI" ? (
                    <Badge variant="maroon">قطري</Badge>
                  ) : (
                    <Badge variant="neutral">{student.nationality || "غير قطري"}</Badge>
                  )}
                </div>

                {latestEnrollment && (
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-slate-400" />
                    <span>
                      {latestEnrollment.class_group.grade_level.name_ar} / الشعبة{" "}
                      {latestEnrollment.class_group.section.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-r border-slate-200 pt-4 md:pt-0 md:pr-6">
            <div className="text-center">
              <span className="block text-2xl font-black text-[#8A1538]">
                {student.participations.length}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">مشاركة في الأنشطة</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-black text-slate-800">
                {student.enrollments.length}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">قيود دراسية</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Update Student Form (Hidden during print) */}
        <div className="lg:col-span-1 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle>تعديل بيانات الطالب</CardTitle>
              <CardDescription>تحديث الهوية والجنسية والملاحظات</CardDescription>
            </CardHeader>

          <form action={updateStudentAction.bind(null, student.id)} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">الاسم بالعربية *</label>
              <input
                type="text"
                name="full_name_ar"
                defaultValue={student.full_name_ar}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الاسم بالإنجليزية</label>
              <input
                type="text"
                name="full_name_en"
                defaultValue={student.full_name_en || ""}
                dir="ltr"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none text-left"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الرقم الأكاديمي</label>
              <input
                type="text"
                name="academic_number"
                defaultValue={student.academic_number || ""}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">مجموعة الجنسية *</label>
              <select
                name="nationality_group"
                defaultValue={student.nationality_group || "QATARI"}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none font-bold"
              >
                <option value="QATARI">قطري (QATARI)</option>
                <option value="NON_QATARI">غير قطري (NON_QATARI)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الجنسية بالتفصيل</label>
              <input
                type="text"
                name="nationality"
                defaultValue={student.nationality || ""}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ملاحظات</label>
              <textarea
                name="notes"
                defaultValue={student.notes || ""}
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                defaultChecked={student.is_active}
                className="rounded text-[#8A1538]"
              />
              <label htmlFor="is_active" className="font-bold text-slate-700 cursor-pointer">
                الحساب نشط في المدرسة
              </label>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" size="sm" className="w-full font-bold">
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Right Column: Participations & Academic History */}
      <div className="lg:col-span-2 print:col-span-3 print:w-full space-y-6">
        {/* Participations List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#8A1538]" />
                  <CardTitle>سجل مشاركات الطالب في الأنشطة</CardTitle>
                </div>
                <CardDescription>
                  جميع الأنشطة التي تم تسجيل مشاركة الطالب بها وتاريخها
                </CardDescription>
              </div>
              <Badge variant="maroon">{student.participations.length} مشاركة</Badge>
            </CardHeader>

            {student.participations.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                لم يشارك هذا الطالب في أي نشاط مدرسي حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">التاريخ</th>
                      <th className="py-2.5 px-3">اسم النشاط</th>
                      <th className="py-2.5 px-3">التصنيف</th>
                      <th className="py-2.5 px-3">العام الدراسي</th>
                      <th className="py-2.5 px-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {student.participations.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-500 font-mono">
                          {new Date(p.activity.activity_date).toISOString().split("T")[0]}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {p.activity.name}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="neutral">{p.activity.category.name_ar}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {p.activity.academic_year.name}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Link href={`/activities/${p.activity_id}`}>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]">
                              عرض
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Academic Enrollments History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#C59B27]" />
                  <CardTitle>التاريخ الأكاديمي والصفوف</CardTitle>
                </div>
                <CardDescription>سجل قيود الطالب في الصفوف والشعب عبر السنوات</CardDescription>
              </div>
            </CardHeader>

            <div className="divide-y divide-slate-100 text-xs">
              {student.enrollments.map((enr) => (
                <div key={enr.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800">
                      {enr.class_group.grade_level.name_ar} — الشعبة {enr.class_group.section.name}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      العام الدراسي: {enr.academic_year.name} • تاريخ القيد:{" "}
                      {new Date(enr.enrolled_from).toISOString().split("T")[0]}
                    </p>
                  </div>
                  <Badge variant={enr.status === "ACTIVE" ? "success" : "neutral"}>
                    {enr.status === "ACTIVE" ? "قيد نشط" : enr.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Printable Official Signatures Footer (Shown only during print) */}
      <div className="hidden print:block mt-8">
        <OfficialPrintFooter
          supervisorTitle="رائد الفصل / مشرف الأنشطة"
          principalTitle="مدير المدرسة والاعتماد"
        />
      </div>
    </div>
  );
}
