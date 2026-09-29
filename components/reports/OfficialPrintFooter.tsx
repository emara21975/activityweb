import React from "react";

interface OfficialPrintFooterProps {
  supervisorTitle?: string;
  deputyTitle?: string;
  principalTitle?: string;
  supervisorName?: string;
}

export function OfficialPrintFooter({
  supervisorTitle = "اخصائي الأنشطة",
  deputyTitle = "النائب الإداري / الأكاديمي",
  principalTitle = "مدير المدرسة والاعتماد",
  supervisorName,
}: OfficialPrintFooterProps) {
  return (
    <div className="pt-8 mt-8 border-t border-slate-200 break-inside-avoid page-break-inside-avoid">
      <div className="grid grid-cols-2 gap-12 items-end text-center text-xs text-slate-700 font-bold px-8">
        {/* Activities Specialist */}
        <div className="space-y-10">
          <div>
            <span className="block text-sm font-bold text-slate-800">{supervisorTitle}</span>
            {supervisorName && (
              <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                {supervisorName}
              </span>
            )}
          </div>
          <div className="w-48 border-b border-dotted border-slate-400 mx-auto" />
          <span className="text-[10px] text-slate-400 block">التوقيع والتاريخ</span>
        </div>

        {/* Principal */}
        <div className="space-y-10">
          <div>
            <span className="block text-sm font-bold text-slate-800">{principalTitle}</span>
          </div>
          <div className="w-48 border-b border-dotted border-slate-400 mx-auto" />
          <span className="text-[10px] text-slate-400 block">التوقيع والاعتماد</span>
        </div>
      </div>

      <div className="mt-8 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>نظام إدارة وتوثيق الأنشطة المدرسية — دولة قطر</span>
        <span>مستند رسمي معتمد يتم إنشاؤه عبر النظام</span>
      </div>
    </div>
  );
}
