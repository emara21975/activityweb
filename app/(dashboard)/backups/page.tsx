import React from "react";
import { getSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { listSystemBackups } from "@/lib/services/backup-service";
import { BackupsClient } from "@/components/backups/backups-client";
import { SettingsNav } from "@/components/settings/SettingsNav";

export const metadata = {
  title: "النسخ الاحتياطي واستعادة البيانات - نظام الأنشطة المدرسية",
};

export default async function BackupsPage() {
  const session = await getSession();

  if (!session || !session.user || !session.user.is_active) {
    redirect("/login");
  }

  const isSuperAdmin = session.user.roles.includes("SUPER_ADMIN");
  const canCreate = isSuperAdmin || session.user.permissions.includes(PERMISSIONS.BACKUP_CREATE);
  const canRestore = isSuperAdmin || session.user.permissions.includes(PERMISSIONS.BACKUP_RESTORE);

  if (!canCreate && !canRestore) {
    redirect("/dashboard");
  }

  const backups = await listSystemBackups();
  return (
    <div className="space-y-6">
      <SettingsNav
        userPermissions={session.user.permissions}
        userRoles={session.user.roles}
      />
      <BackupsClient
        initialBackups={backups}
        canCreate={canCreate}
        canRestore={canRestore}
      />
    </div>
  );
}
