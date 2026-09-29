import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "../db/prisma";

const SESSION_COOKIE_NAME = "activity_web_session";
const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "activity_web_default_very_secure_secret_key_32_bytes_long"
);
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

export async function createSession(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, is_active: true },
  });

  if (!user || !user.is_active) {
    throw new Error("المستخدم غير موجود أو تم إيقاف حسابه.");
  }

  const token = await new SignJWT({ userId: user.id, username: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(SESSION_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });

  // Update last_login_at
  await prisma.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  });

  return token;
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SESSION_SECRET);
    const userId = payload.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.is_active) {
      return null;
    }

    const roles = user.user_roles.map((ur) => ur.role.code);
    const roleNames = user.user_roles.map((ur) => ur.role.name_ar);
    const permissionsSet = new Set<string>();

    for (const ur of user.user_roles) {
      for (const rp of ur.role.permissions) {
        permissionsSet.add(rp.permission.code);
      }
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        is_active: user.is_active,
        roles,
        roleNames,
        permissions: Array.from(permissionsSet),
      },
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
