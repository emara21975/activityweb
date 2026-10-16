import { prisma } from "../db/prisma";
import { hashPassword } from "../auth/rbac";
import { logAudit } from "../audit/audit-service";
import { SYSTEM_ROLES } from "../auth/permissions";

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { created_at: "desc" },
    include: {
      user_roles: {
        include: {
          role: true,
        },
      },
    },
  });
}

export async function getRoles() {
  return prisma.role.findMany({
    orderBy: { created_at: "asc" },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });
}

export async function createUser(
  data: {
    username: string;
    display_name: string;
    email?: string | null;
    password: string;
    role_ids: string[];
  },
  actorUserId?: string
) {
  const existing = await prisma.user.findUnique({
    where: { username: data.username.trim() },
  });

  if (existing) {
    throw new Error("اسم المستخدم مستخدم بالفعل. يرجى اختيار اسم مستخدم آخر.");
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username: data.username.trim(),
        display_name: data.display_name.trim(),
        email: data.email && data.email.trim() ? data.email.trim() : null,
        password_hash: passwordHash,
        is_active: true,
      },
    });

    for (const roleId of data.role_ids) {
      await tx.userRole.create({
        data: {
          user_id: newUser.id,
          role_id: roleId,
        },
      });
    }

    return newUser;
  });

  await logAudit({
    actorUserId,
    action: "CREATE",
    entityType: "user",
    entityId: user.id,
    afterData: {
      username: user.username,
      display_name: user.display_name,
      role_ids: data.role_ids,
    },
  });

  return user;
}

/** Throws if `userId` is the last active SUPER_ADMIN (so the system never loses its administrator). */
async function assertNotLastSuperAdmin(userId: string, message: string) {
  const isActiveSuperAdmin = await prisma.userRole.count({
    where: { user_id: userId, role: { code: SYSTEM_ROLES.SUPER_ADMIN }, user: { is_active: true } },
  });
  if (!isActiveSuperAdmin) return;

  const superAdminCount = await prisma.userRole.count({
    where: { role: { code: SYSTEM_ROLES.SUPER_ADMIN }, user: { is_active: true } },
  });
  if (superAdminCount <= 1) throw new Error(message);
}

export async function updateUser(
  id: string,
  data: {
    username?: string;
    display_name: string;
    email?: string | null;
    password?: string | null;
    is_active: boolean;
    role_ids: string[];
  },
  actorUserId?: string
) {
  const current = await prisma.user.findUnique({
    where: { id },
    include: {
      user_roles: { include: { role: true } },
    },
  });

  if (!current) throw new Error("المستخدم غير موجود.");

  // Deactivating the last SUPER_ADMIN or removing its SUPER_ADMIN role is not allowed
  const superAdminRole = await prisma.role.findUnique({ where: { code: SYSTEM_ROLES.SUPER_ADMIN } });
  const keepsSuperAdmin = !!superAdminRole && data.role_ids.includes(superAdminRole.id);
  if (!data.is_active || !keepsSuperAdmin) {
    await assertNotLastSuperAdmin(id, "لا يمكن تعطيل أو إزالة صلاحية مدير النظام من آخر مدير نظام نشط.");
  }

  const username = data.username?.trim();
  if (username && username !== current.username) {
    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken) throw new Error("اسم المستخدم مستخدم بالفعل. يرجى اختيار اسم مستخدم آخر.");
  }

  let passwordHash: string | undefined = undefined;
  if (data.password && data.password.trim()) {
    passwordHash = await hashPassword(data.password.trim());
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id },
      data: {
        ...(username ? { username } : {}),
        display_name: data.display_name.trim(),
        email: data.email && data.email.trim() ? data.email.trim() : null,
        is_active: data.is_active,
        ...(passwordHash ? { password_hash: passwordHash, password_changed_at: new Date() } : {}),
      },
    });

    // Update roles
    await tx.userRole.deleteMany({ where: { user_id: id } });
    for (const roleId of data.role_ids) {
      await tx.userRole.create({
        data: {
          user_id: id,
          role_id: roleId,
        },
      });
    }

    return u;
  });

  await logAudit({
    actorUserId,
    action: "UPDATE",
    entityType: "user",
    entityId: id,
    beforeData: {
      username: current.username,
      display_name: current.display_name,
      email: current.email,
      is_active: current.is_active,
      role_ids: current.user_roles.map((ur) => ur.role_id),
    },
    afterData: {
      username: updated.username,
      display_name: updated.display_name,
      email: updated.email,
      is_active: updated.is_active,
      role_ids: data.role_ids,
      password_changed: !!passwordHash,
    },
  });

  return updated;
}

export async function setUserActive(id: string, isActive: boolean, actorUserId?: string) {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw new Error("المستخدم غير موجود.");

  if (!isActive) {
    await assertNotLastSuperAdmin(id, "لا يمكن تعطيل آخر مدير نظام نشط.");
  }

  await prisma.user.update({ where: { id }, data: { is_active: isActive } });

  await logAudit({
    actorUserId,
    action: isActive ? "ACTIVATE" : "DEACTIVATE",
    entityType: "user",
    entityId: id,
    beforeData: { is_active: current.is_active },
    afterData: { is_active: isActive },
  });
}

/**
 * Permanently delete a user. Activities, participations, attachments and audit
 * entries they created are kept; their creator reference is cleared.
 */
export async function deleteUser(id: string, actorUserId?: string) {
  const current = await prisma.user.findUnique({
    where: { id },
    include: { user_roles: { include: { role: true } } },
  });
  if (!current) throw new Error("المستخدم غير موجود.");

  await assertNotLastSuperAdmin(id, "لا يمكن حذف آخر مدير نظام نشط.");

  await prisma.user.delete({ where: { id } });

  await logAudit({
    actorUserId,
    action: "DELETE",
    entityType: "user",
    entityId: id,
    beforeData: {
      username: current.username,
      display_name: current.display_name,
      email: current.email,
      roles: current.user_roles.map((ur) => ur.role.code),
    },
  });
}

export async function getAllPermissionsList() {
  return prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { code: "asc" }],
  });
}

export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[],
  actorUserId?: string
) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: true },
  });

  if (!role) {
    throw new Error("الدور المحدد غير موجود.");
  }

  // Safety protection: SUPER_ADMIN must retain core administrative permissions
  if (role.code === SYSTEM_ROLES.SUPER_ADMIN) {
    const allPerms = await prisma.permission.findMany();
    // Ensure SUPER_ADMIN cannot be stripped of critical permissions
    if (permissionIds.length < allPerms.length / 2) {
      throw new Error("لا يمكن تجريد دور مدير النظام من الصلاحيات الإدارية الأساسية.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: { role_id: roleId },
    });

    for (const permId of permissionIds) {
      await tx.rolePermission.create({
        data: {
          role_id: roleId,
          permission_id: permId,
        },
      });
    }
  });

  await logAudit({
    actorUserId,
    action: "UPDATE_ROLE_PERMISSIONS",
    entityType: "role",
    entityId: roleId,
    beforeData: {
      permissionCount: role.permissions.length,
    },
    afterData: {
      roleCode: role.code,
      newPermissionCount: permissionIds.length,
      permissionIds,
    },
  });

  return prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } },
  });
}
