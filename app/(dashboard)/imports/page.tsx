import React from "react";
import { getAcademicYears, getCurrentAcademicYear } from "@/lib/services/academic-year-service";
import { StudentImportWorkflow } from "@/components/imports/StudentImportWorkflow";

import { SettingsNav } from "@/components/settings/SettingsNav";
import { getSession } from "@/lib/auth/session";

export default async function ImportsPage() {
  const [session, academicYears, currentYear] = await Promise.all([
    getSession(),
    getAcademicYears(),
    getCurrentAcademicYear(),
  ]);

  return (
    <div className="space-y-6">
      <SettingsNav
        userPermissions={session?.user?.permissions}
        userRoles={session?.user?.roles}
      />

      <StudentImportWorkflow
        academicYears={academicYears}
        currentYearId={currentYear?.id}
      />
    </div>
  );
}
