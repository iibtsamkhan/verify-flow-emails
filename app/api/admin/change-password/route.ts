import { NextRequest, NextResponse } from "next/server";
import { changeAdminPassword, getCurrentAdminFromRequest } from "@/lib/server/admin-auth";

type Body = {
  currentPassword?: string;
  newPassword?: string;
};

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

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }

  try {
    await changeAdminPassword(session.admin.id, currentPassword, newPassword);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
