import React from "react";
import { getSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getRoles, getAllPermissionsList } from "@/lib/services/user-service";
import { RolesMatrixClient } from "@/components/roles/roles-matrix-client";
import { SettingsNav } from "@/components/settings/SettingsNav";

export const metadata = {
  title: "مصفوفة الأدوار والصلاحيات - نظام الأنشطة المدرسية",
};

export default async function RolesPage() {
  const session = await getSession();

  if (!session || !session.user || !session.user.is_active) {
    redirect("/login");
  }

  const isSuperAdmin = session.user.roles.includes("SUPER_ADMIN");
  const canView = isSuperAdmin || session.user.permissions.includes(PERMISSIONS.ROLE_VIEW);
  const canManage = isSuperAdmin || session.user.permissions.includes(PERMISSIONS.ROLE_MANAGE);

  if (!canView) {
    redirect("/dashboard");
  }

  const [roles, allPermissions] = await Promise.all([
    getRoles(),
    getAllPermissionsList(),
  ]);
  return (
    <div className="space-y-6">
      <SettingsNav
        userPermissions={session.user.permissions}
        userRoles={session.user.roles}
      />
      <RolesMatrixClient
        roles={roles}
        allPermissions={allPermissions}
        canManage={canManage}
      />
    </div>
  );
}
