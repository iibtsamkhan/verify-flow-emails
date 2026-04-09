import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, verifyEmailWithEngine } from "@/lib/verification";

type VerifyBody = {
  email?: string;
};

export async function POST(request: NextRequest) {
  let body: VerifyBody;

  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
  }

  try {
    const result = await verifyEmailWithEngine(email);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify email.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
