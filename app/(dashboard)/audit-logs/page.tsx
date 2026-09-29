import React from "react";
import { prisma } from "@/lib/db/prisma";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, ShieldAlert } from "lucide-react";

import { SettingsNav } from "@/components/settings/SettingsNav";
import { getSession } from "@/lib/auth/session";

export default async function AuditLogsPage() {
  const [session, logs] = await Promise.all([
    getSession(),
    prisma.auditLog.findMany({
      orderBy: { occurred_at: "desc" },
      take: 100,
      include: {
        actor: {
          select: {
            display_name: true,
            username: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SettingsNav
        userPermissions={session?.user?.permissions}
        userRoles={session?.user?.roles}
      />

      <Card className="p-0 overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#8A1538]" />
            <CardTitle>أحدث 100 حركة مسجلة</CardTitle>
          </div>
          <Badge variant="neutral">{logs.length} حركة</Badge>
        </CardHeader>

        {logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-semibold">
            لا توجد حركات مسجلة في النظام بعد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">وقت الحركة</th>
                  <th className="py-3 px-4">المستخدم الفاعل</th>
                  <th className="py-3 px-4">الإجراء</th>
                  <th className="py-3 px-4">نوع الكيان</th>
                  <th className="py-3 px-4">معرف الكيان</th>
                  <th className="py-3 px-4">تفاصيل التعديل (محجوبة)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {new Date(log.occurred_at).toLocaleString("ar-QA")}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {log.actor?.display_name || log.actor?.username || "النظام (System)"}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          log.action === "LOGIN"
                            ? "success"
                            : log.action === "DELETE"
                            ? "danger"
                            : "maroon"
                        }
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {log.entity_type}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[10px]">
                      {log.entity_id.slice(0, 8)}...
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-500 font-mono text-[10px]">
                      {log.after_json_redacted || log.before_json_redacted || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
