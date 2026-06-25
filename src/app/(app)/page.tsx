import type { Route } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import HomeClient from "./home-client";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const role = (user as any)?.app_metadata?.role;

  if (role === "superadmin") {
    redirect("/superadmin" as Route);
  }

  if (role === "admin") {
    redirect("/admin" as Route);
  }

  return <HomeClient />;
}
