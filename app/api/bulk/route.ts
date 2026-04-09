import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Bulk verification requires authentication. Use /dashboard after sign in."
    },
    { status: 403 }
  );
}
