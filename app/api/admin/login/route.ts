import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, setAdminSessionCookie } from "@/lib/server/admin-auth";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const session = await createAdminSession(email, password);
    if (!session) {
      return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
    }

    const response = NextResponse.json(
      {
        admin: {
          id: session.admin.id,
          email: session.admin.email,
          role: session.admin.role
        }
      },
      { status: 200 }
    );

    setAdminSessionCookie(response, session.token);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
