"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck } from "lucide-react";
import { reassignActivitiesAction } from "@/app/actions/activity-actions";

interface ActivityOwnerSelectProps {
  activityId: string;
  ownerId: string | null;
  users: { id: string; display_name: string }[];
}

/** "المسؤول عن النشاط" selector, shown to users with activity.view_all. */
export function ActivityOwnerSelect({ activityId, ownerId, users }: ActivityOwnerSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ownerKnown = !!ownerId && users.some((u) => u.id === ownerId);

  const handleChange = (newOwnerId: string) => {
    if (!newOwnerId) return;
    setError(null);
    startTransition(async () => {
      const res = await reassignActivitiesAction([activityId], newOwnerId);
      if ("error" in res) setError(res.error);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs print:hidden">
      <UserCheck className="w-4 h-4 text-[#8A1538]" />
      <span className="font-bold text-slate-700">المسؤول عن النشاط:</span>
      <select
        value={ownerKnown ? ownerId! : ""}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#8A1538] focus:outline-none min-w-52"
      >
        {!ownerKnown && <option value="">— {ownerId ? "مستخدم غير نشط" : "بدون مسؤول"} —</option>}
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.display_name}
          </option>
        ))}
      </select>
      {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
      {error && <span className="text-rose-600 font-bold">{error}</span>}
    </div>
  );
}
