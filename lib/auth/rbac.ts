import bcrypt from "bcryptjs";
import { getSession } from "./session";
import { PermissionCode, SYSTEM_ROLES } from "./permissions";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function requireUser() {
  const session = await getSession();
  if (!session || !session.user || !session.user.is_active) {
    throw new Error("UNAUTHORIZED: يرجى تسجيل الدخول أولاً.");
  }
  return session.user;
}

export async function requirePermission(permissionCode: PermissionCode) {
  const user = await requireUser();

  // SUPER_ADMIN has bypass for all permissions
  if (user.roles.includes(SYSTEM_ROLES.SUPER_ADMIN)) {
    return user;
  }

  if (!user.permissions.includes(permissionCode)) {
    throw new Error(`FORBIDDEN: ليس لديك صلاحية لتنفيذ هذا الإجراء (${permissionCode}).`);
  }

  return user;
}

export function hasPermission(userPermissions: string[], permissionCode: PermissionCode, userRoles: string[] = []): boolean {
  if (userRoles.includes(SYSTEM_ROLES.SUPER_ADMIN)) return true;
  return userPermissions.includes(permissionCode);
}
