import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UserDashboardClient from "./user-dashboard-client";

export default function DashboardPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <UserDashboardClient />;
}
