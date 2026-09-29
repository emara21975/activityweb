"use client";

import React, { useState, useTransition, useActionState } from "react";
import { uploadStudentsExcelAction, commitStudentsImportAction } from "@/app/actions/import-actions";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RotateCcw,
  ArrowRight,
} from "lucide-react";

interface StudentImportWorkflowProps {
  academicYears: { id: string; name: string; is_current: boolean }[];
  currentYearId?: string;
}

export function StudentImportWorkflow({ academicYears, currentYearId }: StudentImportWorkflowProps) {
  const [selectedYearId, setSelectedYearId] = useState(currentYearId || academicYears[0]?.id || "");
  const [state, formAction, isPending] = useActionState(uploadStudentsExcelAction, null);

  const [isCommitting, startCommitTransition] = useTransition();
  const [commitResult, setCommitResult] = useState<{ success?: boolean; insertedCount?: number; error?: string } | null>(null);

  const handleCommit = (batchId: string) => {
    startCommitTransition(async () => {
      try {
        const res = await commitStudentsImportAction(batchId);
        setCommitResult({ success: true, insertedCount: res.insertedCount });
      } catch (err: unknown) {
        setCommitResult({
          error: err instanceof Error ? err.message : "فشل اعتماد الاستيراد",
        });
      }
    });
  };

  const preview = state?.preview;

  return (
    <div className="space-y-6">
      {/* Success Confirmation after Commit */}
      {commitResult?.success && (
        <Card className="bg-emerald-50 border-emerald-200 p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-lg font-black text-emerald-900">
            تم استيراد وتسجيل {commitResult.insertedCount} طالب بنجاح!
          </h3>
          <p className="text-xs text-emerald-700">
            تم إنشاء سجلات الطلاب وإلحاقهم بالصفوف والشعب المحددة في النظام.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCommitResult(null);
                window.location.reload();
              }}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استيراد ملف آخر</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Stage 1: Upload & Download Template */}
      {!preview && !commitResult?.success && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#8A1538]" />
                <CardTitle>رفع ملف إكسل الطلاب (.xlsx)</CardTitle>
              </div>
              <CardDescription>
                اختر العام الدراسي المستهدف ثم حدد ملف الإكسل لبدء المعاينة والتحقق
              </CardDescription>
            </CardHeader>

            <form action={formAction} className="space-y-4">
              {state?.error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  العام الدراسي المستهدف للاستيراد *
                </label>
                <select
                  name="academic_year_id"
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_current ? "(العام الحالي)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملف الإكسل (XLSX) *
                </label>
                <input
                  type="file"
                  name="file"
                  accept=".xlsx"
                  required
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#8A1538]/10 file:text-[#8A1538] hover:file:bg-[#8A1538]/20 cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  variant="primary"
                  className="w-full font-bold shadow-sm"
                >
                  {isPending ? "جاري قراءة الملف والتحقق من البيانات..." : "معاينة الملف والتحقق"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Template Info Card */}
          <Card className="flex flex-col justify-between bg-gradient-to-br from-amber-50/40 via-white to-slate-50 border-amber-200/80">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileSpreadsheet className="w-5 h-5 text-[#C59B27]" />
                <h4 className="font-bold text-sm text-slate-800">قالب الاستيراد المعتمد</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                لتجنب أخطاء الاستيراد، يُرجى استخدام القالب الرسمي المعتمد الذي يتضمن الأعمدة الصحيحة لبيانات الطلاب والصفوف والشعب.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-amber-100">
              <a href="/api/imports/template/students" download>
                <Button variant="gold" size="sm" className="w-full font-bold gap-1.5 shadow-xs">
                  <Download className="w-4 h-4" />
                  <span>تحميل قالب الطلاب (Excel)</span>
                </Button>
              </a>
            </div>
          </Card>
        </div>
      )}

      {/* Stage 2: Preview Results & Commit */}
      {preview && !commitResult?.success && (
        <div className="space-y-6">
          {commitResult?.error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{commitResult.error}</span>
            </div>
          )}

          {/* Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-white">
              <span className="text-xs font-bold text-slate-500">إجمالي الصفوف في الملف</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{preview.totalRows}</p>
            </Card>

            <Card className="p-4 bg-white border-l-4 border-l-emerald-600">
              <span className="text-xs font-bold text-emerald-800">السجلات الصالحة للاعتماد</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{preview.validCount}</p>
            </Card>

            <Card className="p-4 bg-white border-l-4 border-l-rose-500">
              <span className="text-xs font-bold text-rose-800">السجلات التي بها أخطاء</span>
              <p className="text-2xl font-black text-rose-700 mt-1">{preview.errorCount}</p>
            </Card>

            <Card className="p-4 bg-white border-l-4 border-l-amber-500">
              <span className="text-xs font-bold text-amber-800">المكررات في النظام أو الملف</span>
              <p className="text-2xl font-black text-amber-700 mt-1">{preview.duplicateCount}</p>
            </Card>
          </div>

          {/* Action Bar */}
          <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
            <div>
              <span className="font-bold text-slate-800 text-xs block">
                ملف: {preview.filename}
              </span>
              <span className="text-[11px] text-slate-500">
                سيتم اعتماد السجلات الصالحة فقط ({preview.validCount} طالب). لن يتم إدراج أي سجل به أخطاء.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                disabled={isCommitting}
              >
                إلغاء واستبدال الملف
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={isCommitting || preview.validCount === 0}
                onClick={() => handleCommit(preview.batchId)}
                className="font-bold gap-1.5 shadow-md shadow-[#8A1538]/20"
              >
                <FileCheck className="w-4 h-4" />
                <span>
                  {isCommitting
                    ? "جاري الحفظ والاعتماد..."
                    : `اعتماد استيراد (${preview.validCount}) طالب`}
                </span>
              </Button>
            </div>
          </Card>

          {/* Preview Table */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">السطر</th>
                    <th className="py-2.5 px-3">الرقم الأكاديمي</th>
                    <th className="py-2.5 px-3">اسم الطالب</th>
                    <th className="py-2.5 px-3">الجنسية</th>
                    <th className="py-2.5 px-3">الصف</th>
                    <th className="py-2.5 px-3">الشعبة</th>
                    <th className="py-2.5 px-3">حالة التحقق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {preview.rows.map((r) => (
                    <tr
                      key={r.rowNumber}
                      className={r.isValid ? "hover:bg-slate-50" : "bg-rose-50/40 hover:bg-rose-50/60"}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {r.rowNumber}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-700">
                        {r.academicNumber || "—"}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {r.fullNameAr}
                        {r.fullNameEn && (
                          <span className="block text-[10px] text-slate-400 font-normal" dir="ltr">
                            {r.fullNameEn}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant={r.nationalityGroup === "QATARI" ? "maroon" : "neutral"}>
                          {r.nationalityGroup === "QATARI" ? "قطري" : "غير قطري"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{r.gradeName || "افتراضي"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.sectionName || "افتراضي"}</td>
                      <td className="py-2 px-3">
                        {r.isValid ? (
                          <Badge variant="success">جاهز للاعتماد</Badge>
                        ) : (
                          <div className="space-y-0.5">
                            {r.errors.map((err, i) => (
                              <span key={i} className="block text-[11px] text-rose-700 font-bold">
                                • {err}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
