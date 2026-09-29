import React from "react";
import { getSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getInspirationalQuotes } from "@/lib/services/quote-service";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { QuotesManagerClient } from "@/components/settings/QuotesManagerClient";
import { SettingsNav } from "@/components/settings/SettingsNav";

export const metadata = {
  title: "إدارة العبارات التحفيزية والبانر - نظام الأنشطة المدرسية",
};

export default async function QuotesSettingsPage() {
  const session = await getSession();

  if (!session || !session.user || !session.user.is_active) {
    redirect("/login");
  }

  const isSuperAdmin = session.user.roles.includes("SUPER_ADMIN");
  const canManage =
    isSuperAdmin ||
    session.user.permissions.includes(PERMISSIONS.SCHOOL_SETTINGS_MANAGE) ||
    session.user.permissions.includes(PERMISSIONS.SCHOOL_SETTINGS_VIEW);

  if (!canManage) {
    redirect("/dashboard");
  }

  const [quotes, schoolSettings] = await Promise.all([
    getInspirationalQuotes(false),
    getSchoolSettings(),
  ]);

  return (
    <div className="space-y-6">
      <SettingsNav
        userPermissions={session.user.permissions}
        userRoles={session.user.roles}
      />
      <QuotesManagerClient
        quotes={quotes}
        schoolName={schoolSettings?.school_name_ar || "مدرسة عبد الله بن علي المسند الثانوية للبنين"}
      />
    </div>
  );
}
