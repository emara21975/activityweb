"use client";

import React, { useState, useTransition } from "react";
import { registerParticipationsAction } from "@/app/actions/participation-actions";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserCheck,
  CheckSquare,
  Square,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
} from "lucide-react";

interface ActivityOption {
  id: string;
  name: string;
  activity_date: string;
  categoryName: string;
}

interface StudentOption {
  id: string;
  full_name_ar: string;
  academic_number: string | null;
  nationality_group: string | null;
  grade_level_id: string;
  section_id: string;
  gradeName: string;
  sectionName: string;
  isAlreadyRegistered?: boolean;
}

interface ParticipationRegisterFormProps {
  activities: ActivityOption[];
  students: StudentOption[];
  gradeLevels: { id: string; name_ar: string }[];
  sections: { id: string; name: string }[];
  initialActivityId?: string;
}

export function ParticipationRegisterForm({
  activities,
  students,
  gradeLevels,
  sections,
  initialActivityId,
}: ParticipationRegisterFormProps) {
  const [selectedActivityId, setSelectedActivityId] = useState(initialActivityId || activities[0]?.id || "");
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  // Filter students based on grade, section, and search query
  const filteredStudents = students.filter((s) => {
    if (selectedGradeId && s.grade_level_id !== selectedGradeId) return false;
    if (selectedSectionId && s.section_id !== selectedSectionId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = s.full_name_ar.toLowerCase().includes(q);
      const matchNumber = s.academic_number ? s.academic_number.toLowerCase().includes(q) : false;
      if (!matchName && !matchNumber) return false;
    }
    return true;
  });

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      for (const s of filteredStudents) {
        next.add(s.id);
      }
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      for (const s of filteredStudents) {
        next.delete(s.id);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityId) {
      setFeedback({ error: "يرجى اختيار النشاط أولاً." });
      return;
    }
    if (selectedStudentIds.size === 0) {
      setFeedback({ error: "يرجى تحديد طالب واحد على الأقل للتسجيل." });
      return;
    }

    setFeedback(null);

    const formData = new FormData();
    formData.append("activity_id", selectedActivityId);
    for (const id of selectedStudentIds) {
      formData.append("student_ids", id);
    }

    startTransition(async () => {
      const result = await registerParticipationsAction(null, formData);
      if (result.error) {
        setFeedback({ error: result.error });
      } else if (result.success) {
        setFeedback({ success: true, message: result.message });
        setSelectedStudentIds(new Set());
      }
    });
  };

  const selectedActivity = activities.find((a) => a.id === selectedActivityId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Feedback Messages */}
      {feedback?.success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {feedback?.error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{feedback.error}</span>
        </div>
      )}

      {/* Step 1: Select Activity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#8A1538] text-white flex items-center justify-center text-xs font-black">
              1
            </span>
            <CardTitle>اختيار النشاط المدرسي</CardTitle>
          </div>
          <CardDescription>حدد النشاط المراد توثيق مشاركة الطلاب به</CardDescription>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              قائمة الأنشطة المتاحة *
            </label>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none"
            >
              <option value="">-- اختر النشاط --</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.categoryName} — {a.activity_date})
                </option>
              ))}
            </select>
          </div>

          {selectedActivity && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-center text-xs space-y-1">
              <span className="font-bold text-slate-800">{selectedActivity.name}</span>
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <Badge variant="maroon">{selectedActivity.categoryName}</Badge>
                <span>تاريخ التنفيذ: {selectedActivity.activity_date}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Step 2: Filters & Students Cohort */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#C59B27] text-white flex items-center justify-center text-xs font-black">
                2
              </span>
              <CardTitle>تحديد الصف والشعبة واختيار الطلاب</CardTitle>
            </div>
            <CardDescription>تصفية الطلاب بحسب الصف والشعبة وتحديد المشاركين</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">المحدد حالياً:</span>
            <Badge variant="maroon" className="text-xs px-3 py-1 font-bold">
              {selectedStudentIds.size} طالب
            </Badge>
          </div>
        </CardHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">الصف الدراسي</label>
            <select
              value={selectedGradeId}
              onChange={(e) => setSelectedGradeId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            >
              <option value="">جميع الصفوف</option>
              {gradeLevels.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name_ar}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">الشعبة</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            >
              <option value="">جميع الشعب</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  الشعبة {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">بحث سريع</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الرقم..."
                className="w-full pr-8 pl-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Selection Tools */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs mb-3">
          <span className="text-slate-500 font-medium">
            يظهر {filteredStudents.length} طالب من النطاق المحدد
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-[#8A1538] hover:underline font-bold"
            >
              تحديد الكل في هذا العرض
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleDeselectAllFiltered}
              className="text-slate-500 hover:underline font-semibold"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>

        {/* Student Checkboxes List */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-semibold">
            لا يوجد طلاب مطابقين للفلتر المحدد.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {filteredStudents.map((student) => {
              const isChecked = selectedStudentIds.has(student.id);

              return (
                <div
                  key={student.id}
                  onClick={() => handleToggleStudent(student.id)}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                    isChecked ? "bg-[#8A1538]/5" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-[#8A1538]">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 fill-[#8A1538] text-white" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">
                        {student.full_name_ar}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {student.academic_number || "—"} • {student.gradeName} / الشعبة {student.sectionName}
                      </span>
                    </div>
                  </div>

                  <div>
                    {student.nationality_group === "QATARI" ? (
                      <Badge variant="maroon">قطري</Badge>
                    ) : (
                      <Badge variant="neutral">غير قطري</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Submit Button */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-xs text-slate-600 font-medium">
          إجمالي الطلاب المحددين للحفظ:{" "}
          <span className="font-bold text-[#8A1538] text-sm">{selectedStudentIds.size} طالب</span>
        </div>

        <Button
          type="submit"
          variant="gold"
          size="lg"
          disabled={isPending || selectedStudentIds.size === 0 || !selectedActivityId}
          className="font-bold shadow-md shadow-[#C59B27]/20"
        >
          {isPending ? "جاري الحفظ الآمن..." : "حفظ واعتماد المشاركات"}
        </Button>
      </div>
    </form>
  );
}
