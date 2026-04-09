import { AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const ADMIN_SESSION_COOKIE = "vf_admin_session";
const SESSION_DAYS = Number(process.env.ADMIN_SESSION_DAYS ?? "7");

function resolveSessionDays(): number {
  if (!Number.isFinite(SESSION_DAYS)) return 7;
  return Math.max(1, Math.floor(SESSION_DAYS));
}

function getSessionExpiryDate(): Date {
  const days = resolveSessionDays();
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set and at least 32 chars long.");
  }

  return secret;
}

function hashToken(token: string): string {
  return createHash("sha256").update(`${getSessionSecret()}::${token}`).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function ensureDefaultSuperAdmin() {
  const existing = await prisma.admin.findFirst({
    where: { role: AdminRole.SUPER_ADMIN },
    select: { id: true }
  });

  if (existing) return;

  const email = (process.env.ADMIN_DEFAULT_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_DEFAULT_PASSWORD ?? "";

  if (!email || !password) {
    throw new Error("Set ADMIN_DEFAULT_EMAIL and ADMIN_DEFAULT_PASSWORD before admin login.");
  }

  if (password.length < 12) {
    throw new Error("ADMIN_DEFAULT_PASSWORD must be at least 12 characters long.");
  }

  const hash = await bcrypt.hash(password, 12);

  await prisma.admin.create({
    data: {
      email,
      passwordHash: hash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true
    }
  });
}

export async function createAdminSession(email: string, password: string) {
  await ensureDefaultSuperAdmin();

  const normalizedEmail = email.trim().toLowerCase();
  const admin = await prisma.admin.findUnique({
    where: { email: normalizedEmail }
  });

  if (!admin || !admin.isActive) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  const token = randomBytes(48).toString("base64url");
  const tokenHash = hashToken(token);

  const session = await prisma.adminSession.create({
    data: {
      adminId: admin.id,
      tokenHash,
      expiresAt: getSessionExpiryDate()
    }
  });

  return {
    token,
    session,
    admin: {
      id: admin.id,
      email: admin.email,
      role: admin.role
    }
  };
}

async function resolveAdminByToken(token: string) {
  const tokenHash = hashToken(token);

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      }
    }
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (!session.admin.isActive) return null;

  return {
    sessionId: session.id,
    admin: session.admin
  };
}

export async function getCurrentAdminFromRequest(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return resolveAdminByToken(token);
}

export async function getCurrentAdminFromCookieStore() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return resolveAdminByToken(token);
}

export async function destroyAdminSession(token: string) {
  const tokenHash = hashToken(token);
  await prisma.adminSession.deleteMany({ where: { tokenHash } });
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: resolveSessionDays() * 24 * 60 * 60
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function requireSuperAdmin(adminId: string) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { role: true }
  });

  return admin?.role === AdminRole.SUPER_ADMIN;
}

export async function changeAdminPassword(adminId: string, currentPassword: string, nextPassword: string) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive) {
    throw new Error("Admin account is unavailable.");
  }

  if (nextPassword.length < 12) {
    throw new Error("New password must be at least 12 characters.");
  }

  const matches = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!matches) {
    throw new Error("Current password is incorrect.");
  }

  const reused = await bcrypt.compare(nextPassword, admin.passwordHash);
  if (reused || safeCompare(currentPassword, nextPassword)) {
    throw new Error("New password must be different from current password.");
  }

  const passwordHash = await bcrypt.hash(nextPassword, 12);

  await prisma.$transaction([
    prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash }
    }),
    prisma.adminAuditLog.create({
      data: {
        adminId,
        action: "password_changed"
      }
    })
  ]);
}

export async function createAdminBySuperAdmin(input: {
  creatorAdminId: string;
  email: string;
  password: string;
  role?: AdminRole;
}) {
  const isSuperAdmin = await requireSuperAdmin(input.creatorAdminId);
  if (!isSuperAdmin) {
    throw new Error("Only super admin can create additional admins.");
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Admin email is required.");
  }

  if (input.password.length < 12) {
    throw new Error("Admin password must be at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const created = await prisma.admin.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: input.role ?? AdminRole.ADMIN,
      createdById: input.creatorAdminId,
      isActive: true
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId: input.creatorAdminId,
      action: "admin_created",
      targetAdminId: created.id
    }
  });

  return created;
}
