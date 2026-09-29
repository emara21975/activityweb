"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/rbac";
import { createSession, destroySession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/audit-service";

export async function loginAction(prevState: { error?: string } | null, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const parsed = loginSchema.safeParse({ username, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" };
  }

  // Look up user (safe against enumeration per PRD)
  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });

  if (!user || !user.is_active) {
    return { error: "اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب معطل." };
  }

  const isPasswordValid = await verifyPassword(parsed.data.password, user.password_hash);
  if (!isPasswordValid) {
    return { error: "اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب معطل." };
  }

  await createSession(user.id);

  await logAudit({
    actorUserId: user.id,
    action: "LOGIN",
    entityType: "user",
    entityId: user.id,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
