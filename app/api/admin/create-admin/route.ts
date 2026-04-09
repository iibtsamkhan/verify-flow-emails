import { AdminRole, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createAdminBySuperAdmin, getCurrentAdminFromRequest } from "@/lib/server/admin-auth";

type Body = {
  email?: string;
  password?: string;
  role?: AdminRole;
};

function resolveRole(value: unknown): AdminRole {
  if (value === AdminRole.SUPER_ADMIN) return AdminRole.SUPER_ADMIN;
  return AdminRole.ADMIN;
}

export async function POST(request: NextRequest) {
  const session = await getCurrentAdminFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const created = await createAdminBySuperAdmin({
      creatorAdminId: session.admin.id,
      email,
      password,
      role: resolveRole(body.role)
    });

    return NextResponse.json({ admin: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Admin email already exists." }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : "Unable to create admin.";
    const statusCode = message.includes("super admin") ? 403 : 400;

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
