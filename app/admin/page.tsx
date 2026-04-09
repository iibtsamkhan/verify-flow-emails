import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminFromCookieStore } from "@/lib/server/admin-auth";
import AdminDashboardClient from "./page-client";

export default async function AdminDashboardPage() {
  const session = await getCurrentAdminFromCookieStore();

  if (!session) {
    redirect("/admin/login");
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

  const serializedAdmins = admins.map((admin) => ({
    ...admin,
    createdAt: admin.createdAt.toISOString()
  }));

  return (
    <AdminDashboardClient
      currentAdmin={session.admin}
      initialAdmins={serializedAdmins}
      initialStats={{
        userCount,
        jobCount,
        completedJobs,
        activeSessions
      }}
    />
  );
}
