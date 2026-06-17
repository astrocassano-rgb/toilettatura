import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

function safeNextPath(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/profilo";
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  const form = await request.formData();
  const firstName = String(form.get("first_name") ?? "").trim() || null;
  const lastName = String(form.get("last_name") ?? "").trim() || null;
  const phone = String(form.get("phone") ?? "").trim() || null;
  const requireComplete = String(form.get("require_complete") ?? "") === "1";
  const nextPath = safeNextPath(form.get("next"));

  if (requireComplete) {
    if (!firstName || !lastName || !phone) {
      const target = `/profilo?complete=1&missing=1&next=${encodeURIComponent(nextPath)}`;
      return NextResponse.redirect(new URL(target, request.url), 303);
    }
  }

  const update: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (form.has("first_name")) update.first_name = firstName;
  if (form.has("last_name")) update.last_name = lastName;
  if (form.has("phone")) update.phone = phone;

  if (!Object.keys(update).length) {
    return Response.json({ error: "Nessun dato da aggiornare" }, { status: 400 });
  }

  const { error } = await (supabase as any).from("profiles").update(update).eq("id", user.id);
  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.redirect(new URL(nextPath, request.url), 303);
}
