import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { PERMISSIONS, SYSTEM_ROLES } from "./permissions";
import { getSession } from "./session";

/**
 * Activity ownership scope (activities_nextjs_web_specs/ACTIVITY_OWNERSHIP_SPEC.md):
 * users with `activity.view_all` see every activity; everyone else only the
 * activities they created (`created_by_id`). Enforced server side everywhere
 * activities, participations or attachments are read or changed.
 */

export interface ScopeUser {
  id: string;
  roles: string[];
  permissions: string[];
}

export const ACTIVITY_NOT_FOUND = "النشاط غير موجود أو ليس لديك صلاحية عليه.";

export function canViewAllActivities(user: ScopeUser | null | undefined): boolean {
  if (!user) return false;
  return user.roles.includes(SYSTEM_ROLES.SUPER_ADMIN) || user.permissions.includes(PERMISSIONS.ACTIVITY_VIEW_ALL);
}

/** Prisma filter for activities visible to the user. */
export function activityScopeWhere(user: ScopeUser): Prisma.ActivityWhereInput {
  return canViewAllActivities(user) ? {} : { created_by_id: user.id };
}

/** Activity scope of the signed-in user; matches nothing when signed out. */
export async function currentActivityScope(): Promise<Prisma.ActivityWhereInput> {
  const session = await getSession();
  return session?.user ? activityScopeWhere(session.user) : { id: "__none__" };
}

/** Prisma filter for participations whose activity is visible to the user. */
export function participationScopeWhere(user: ScopeUser): Prisma.ParticipationWhereInput {
  return canViewAllActivities(user) ? {} : { activity: { created_by_id: user.id } };
}

export function isActivityInScope(user: ScopeUser, activity: { created_by_id: string | null }): boolean {
  return canViewAllActivities(user) || activity.created_by_id === user.id;
}

/** Throws ACTIVITY_NOT_FOUND when the activity doesn't exist or is outside the user's scope. */
export async function assertActivityInScope(user: ScopeUser, activityId: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true, created_by_id: true },
  });
  if (!activity || !isActivityInScope(user, activity)) {
    throw new Error(ACTIVITY_NOT_FOUND);
  }
  return activity;
}
