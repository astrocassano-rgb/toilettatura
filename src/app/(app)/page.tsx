import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import HomeClient from "./home-client";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if ((user as any)?.app_metadata?.role === "admin") {
    redirect("/admin");
  }

  return <HomeClient />;
}
