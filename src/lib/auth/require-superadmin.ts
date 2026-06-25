import "server-only";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireSuperAdmin(options?: { next?: string; mode?: "redirect" | "notFound" }) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    const next = options?.next ?? "/superadmin";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const role = (user as any)?.app_metadata?.role;
  const isSuperAdmin = role === "superadmin";
  if (!isSuperAdmin) {
    if (options?.mode === "notFound") notFound();
    redirect("/");
  }

  return { supabase, user };
}
