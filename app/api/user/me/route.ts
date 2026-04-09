import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/server/user-account";

function resolvePrimaryEmail(user: Awaited<ReturnType<typeof currentUser>>): string | null {
  if (!user) return null;
  if (user.primaryEmailAddress?.emailAddress) return user.primaryEmailAddress.emailAddress;
  return user.emailAddresses[0]?.emailAddress ?? null;
}

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const snapshot = await getDashboardSnapshot(userId, resolvePrimaryEmail(user));

  return NextResponse.json(snapshot, { status: 200 });
}
