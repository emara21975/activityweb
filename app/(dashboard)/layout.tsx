import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSchoolSettings } from "@/lib/services/school-settings-service";
import { getInspirationalQuotes } from "@/lib/services/quote-service";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { logoutAction } from "../actions/auth-actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || !session.user || !session.user.is_active) {
    redirect("/login");
  }

  const [schoolSettings, quotes] = await Promise.all([
    getSchoolSettings(),
    getInspirationalQuotes(true),
  ]);

  const isSuperAdmin = session.user.roles.includes("SUPER_ADMIN");
  const canManageQuotes =
    isSuperAdmin ||
    session.user.permissions.includes(PERMISSIONS.SCHOOL_SETTINGS_MANAGE) ||
    session.user.permissions.includes(PERMISSIONS.SCHOOL_SETTINGS_VIEW);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="print:hidden">
        <Sidebar
          userPermissions={session.user.permissions}
          userRoles={session.user.roles}
        />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 print:block print:w-full">
        <div className="print:hidden">
          <Navbar
            schoolName={schoolSettings.school_name_ar}
            currentYearName={schoolSettings.current_academic_year?.name}
            user={{
              displayName: session.user.display_name,
              username: session.user.username,
              roleNames: session.user.roleNames,
            }}
            onLogout={logoutAction}
            quotes={quotes}
            canManageQuotes={canManageQuotes}
          />
        </div>

        <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto print:p-0 print:m-0 print:max-w-none print:w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
