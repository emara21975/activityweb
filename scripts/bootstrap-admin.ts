import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SYSTEM_ROLES } from "../lib/auth/permissions";

const prisma = new PrismaClient();

async function bootstrap() {
  const args = process.argv.slice(2);
  let username = "";
  let password = "";
  let displayName = "مدير النظام";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--username" && args[i + 1]) username = args[i + 1];
    if (args[i] === "--password" && args[i + 1]) password = args[i + 1];
    if (args[i] === "--name" && args[i + 1]) displayName = args[i + 1];
  }

  if (!username) username = "admin";
  if (!password) password = "AdminPassword2026!";

  console.log(`🔐 Bootstrapping super admin: ${username}...`);

  const passwordHash = await bcrypt.hash(password, 12);

  // Find SUPER_ADMIN role
  const superAdminRole = await prisma.role.findUnique({
    where: { code: SYSTEM_ROLES.SUPER_ADMIN },
  });

  if (!superAdminRole) {
    throw new Error("SUPER_ADMIN role not found. Please run seed first (`npx tsx prisma/seed.ts`).");
  }

  // Create or update user
  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password_hash: passwordHash,
      display_name: displayName,
      is_active: true,
      password_changed_at: new Date(),
    },
    create: {
      username,
      display_name: displayName,
      password_hash: passwordHash,
      is_active: true,
      password_changed_at: new Date(),
    },
  });

  // Assign SUPER_ADMIN role
  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: user.id,
        role_id: superAdminRole.id,
      },
    },
    update: {},
    create: {
      user_id: user.id,
      role_id: superAdminRole.id,
    },
  });

  console.log(`✅ Super admin created/updated successfully!`);
  console.log(`   Username: ${username}`);
  console.log(`   Display Name: ${displayName}`);
  console.log(`   Role: ${superAdminRole.name_ar} (${superAdminRole.code})`);
}

bootstrap()
  .catch((e) => {
    console.error("❌ Bootstrap failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
