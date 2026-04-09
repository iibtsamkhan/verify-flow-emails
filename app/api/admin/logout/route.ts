import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, clearAdminSessionCookie, destroyAdminSession } from "@/lib/server/admin-auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    await destroyAdminSession(token).catch(() => undefined);
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  clearAdminSessionCookie(response);

  return response;
}
