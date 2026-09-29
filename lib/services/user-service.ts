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

export async function updateUser(
  id: string,
  data: {
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

  // Check if deactivating or removing SUPER_ADMIN from last active SUPER_ADMIN
  const isSuperAdmin = current.user_roles.some((ur) => ur.role.code === SYSTEM_ROLES.SUPER_ADMIN);
  if (isSuperAdmin && (!data.is_active || !data.role_ids.length)) {
    const superAdminCount = await prisma.userRole.count({
      where: {
        role: { code: SYSTEM_ROLES.SUPER_ADMIN },
        user: { is_active: true },
      },
    });

    if (superAdminCount <= 1) {
      throw new Error("لا يمكن تعطيل أو إزالة صلاحية مدير النظام من آخر مدير نظام نشط.");
    }
  }

  let passwordHash: string | undefined = undefined;
  if (data.password && data.password.trim()) {
    passwordHash = await hashPassword(data.password.trim());
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id },
      data: {
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
      display_name: current.display_name,
      email: current.email,
      is_active: current.is_active,
    },
    afterData: {
      display_name: updated.display_name,
      email: updated.email,
      is_active: updated.is_active,
      role_ids: data.role_ids,
    },
  });

  return updated;
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
