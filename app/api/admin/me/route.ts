import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminFromRequest } from "@/lib/server/admin-auth";

export async function GET(request: NextRequest) {
  const session = await getCurrentAdminFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [admins, userCount, jobCount, completedJobs, activeSessions] = await Promise.all([
    prisma.admin.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    }),
    prisma.userAccount.count(),
    prisma.verificationJob.count(),
    prisma.verificationJob.count({ where: { status: "COMPLETED" } }),
    prisma.adminSession.count({ where: { expiresAt: { gt: new Date() } } })
  ]);

  return NextResponse.json(
    {
      admin: session.admin,
      stats: {
        userCount,
        jobCount,
        completedJobs,
        activeSessions
      },
      admins
    },
    { status: 200 }
  );
}
