import React from "react";
import { getSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getCleanupStats } from "@/lib/services/cleanup-service";
import { DataCleanupClient } from "@/components/settings/DataCleanupClient";
import { SettingsNav } from "@/components/settings/SettingsNav";

export const metadata = {
  title: "تفريغ وحذف البيانات - نظام الأنشطة المدرسية",
};

export default async function DataCleanupPage() {
  const session = await getSession();

  if (!session || !session.user || !session.user.is_active) {
    redirect("/login");
  }

  const isSuperAdmin = session.user.roles.includes("SUPER_ADMIN");
  const canCleanup =
    isSuperAdmin ||
    session.user.permissions.includes(PERMISSIONS.BACKUP_RESTORE) ||
    session.user.permissions.includes(PERMISSIONS.SCHOOL_SETTINGS_MANAGE);

  if (!canCleanup) {
    redirect("/dashboard");
  }

  const stats = await getCleanupStats();

  return (
    <div className="space-y-6">
      <SettingsNav
        userPermissions={session.user.permissions}
        userRoles={session.user.roles}
      />
      <DataCleanupClient stats={stats} />
    </div>
  );
}
