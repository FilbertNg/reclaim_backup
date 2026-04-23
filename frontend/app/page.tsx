import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth";

/**
 * Root page — server component that redirects based on auth state.
 * Uses the getCurrentUser server action to check session server-side.
 */
export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "HR") {
    redirect("/hr/dashboard");
  }

  redirect("/employee/dashboard");
}
