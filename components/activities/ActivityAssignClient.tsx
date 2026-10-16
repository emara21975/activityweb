"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, UserCheck, CheckCircle2, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { reassignActivitiesAction } from "@/app/actions/activity-actions";

interface AssignActivity {
  id: string;
  name: string;
  activity_date: string;
  owner_id: string | null;
  category: { id: string; name_ar: string };
  participants: number;
}

interface AssignUser {
  id: string;
  display_name: string;
  username: string;
}

interface ActivityAssignClientProps {
  activities: AssignActivity[];
  users: AssignUser[];
  academicYears: { id: string; name: string }[];
  selectedYearId: string;
}

const inputClass =
  "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#8A1538] focus:outline-none";

const NO_OWNER = "__none__";

export function ActivityAssignClient({ activities, users, academicYears, selectedYearId }: ActivityAssignClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOwner, setBulkOwner] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const userName = (id: string | null) => {
    if (!id) return null;
    const u = users.find((x) => x.id === id);
    return u ? u.display_name : "مستخدم غير نشط";
  };

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    activities.forEach((a) => map.set(a.category.id, a.category.name_ar));
    return [...map.entries()];
  }, [activities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activities.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q)) return false;
      if (categoryFilter && a.category.id !== categoryFilter) return false;
      if (ownerFilter === NO_OWNER) return !a.owner_id || !users.some((u) => u.id === a.owner_id);
      if (ownerFilter) return a.owner_id === ownerFilter;
      return true;
    });
  }, [activities, users, query, ownerFilter, categoryFilter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((a) => next.delete(a.id));
      else filtered.forEach((a) => next.add(a.id));
      return next;
    });
  };

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const assign = (ids: string[], ownerId: string, rowId?: string) => {
    setMessage(null);
    setSavingId(rowId ?? null);
    startTransition(async () => {
      const res = await reassignActivitiesAction(ids, ownerId);
      if ("error" in res) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: `تم إسناد ${ids.length} نشاط إلى ${userName(ownerId)}.` });
        if (!rowId) {
          setSelected(new Set());
          setBulkOwner("");
        }
      }
      setSavingId(null);
      router.refresh();
    });
  };

  return (
    <Card className="p-0 overflow-hidden">
      <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle>توزيع الأنشطة على المستخدمين</CardTitle>
          <CardDescription>
            المسؤول عن النشاط هو من يراه ويديره. المعلم يرى فقط الأنشطة المسندة إليه.
          </CardDescription>
        </div>
        <Badge variant="neutral">
          {filtered.length === activities.length ? `${activities.length} نشاط` : `${filtered.length} من ${activities.length}`}
        </Badge>
      </CardHeader>

      {/* Filters */}
      <div className="p-3 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
        <div className="relative sm:col-span-1">
          <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث باسم النشاط..."
            className={`${inputClass} pr-8`}
          />
        </div>
        <select
          value={selectedYearId}
          onChange={(e) => router.push(`/activities/assign?yearId=${e.target.value}`)}
          className={inputClass}
        >
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              العام {y.name}
            </option>
          ))}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className={inputClass}>
          <option value="">كل المسؤولين</option>
          <option value={NO_OWNER}>بدون مسؤول</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.display_name}
            </option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClass}>
          <option value="">كل التصنيفات</option>
          {categories.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk assignment */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
        <span className="font-bold text-slate-700 shrink-0">
          المحدد: <span className="font-mono">{selected.size}</span> نشاط
        </span>
        <select value={bulkOwner} onChange={(e) => setBulkOwner(e.target.value)} className={`${inputClass} sm:max-w-xs`}>
          <option value="">إسناد المحدد إلى...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.display_name} ({u.username})
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="primary"
          disabled={!selected.size || !bulkOwner || isPending}
          onClick={() => assign([...selected], bulkOwner)}
          className="gap-1.5 font-bold"
        >
          {isPending && !savingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
          إسناد
        </Button>
      </div>

      {message && (
        <div
          className={`mx-3 mt-3 p-2.5 rounded-lg border text-xs font-bold flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          <span className="flex items-center gap-1.5">
            {message.type === "success" && <CheckCircle2 className="w-4 h-4" />}
            {message.text}
          </span>
          <button type="button" onClick={() => setMessage(null)} aria-label="إغلاق">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  aria-label="تحديد الكل"
                  className="rounded text-[#8A1538]"
                />
              </th>
              <th className="py-3 px-4">النشاط</th>
              <th className="py-3 px-4">التاريخ</th>
              <th className="py-3 px-4">التصنيف</th>
              <th className="py-3 px-4 text-center">المشاركون</th>
              <th className="py-3 px-4">المسؤول عن النشاط</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filtered.map((a) => {
              const ownerKnown = !!a.owner_id && users.some((u) => u.id === a.owner_id);
              return (
                <tr key={a.id} className={`hover:bg-slate-50/80 ${selected.has(a.id) ? "bg-amber-50/50" : ""}`}>
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleOne(a.id)}
                      aria-label={`تحديد ${a.name}`}
                      className="rounded text-[#8A1538]"
                    />
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{a.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{a.activity_date}</td>
                  <td className="py-3 px-4 text-slate-600">{a.category.name_ar}</td>
                  <td className="py-3 px-4 text-center font-mono">{a.participants}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={ownerKnown ? a.owner_id! : ""}
                        disabled={isPending}
                        onChange={(e) => e.target.value && assign([a.id], e.target.value, a.id)}
                        className={`${inputClass} min-w-48 ${ownerKnown ? "" : "border-amber-300 bg-amber-50"}`}
                      >
                        {!ownerKnown && <option value="">— {a.owner_id ? "مستخدم غير نشط" : "بدون مسؤول"} —</option>}
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.display_name}
                          </option>
                        ))}
                      </select>
                      {isPending && savingId === a.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  لا توجد أنشطة مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
