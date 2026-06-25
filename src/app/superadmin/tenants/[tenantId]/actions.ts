"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireSuperAdmin } from "@/lib/auth/require-superadmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function updateTenantAction(prevState: any, formData: FormData) {
  try {
    await requireSuperAdmin();
  } catch {
    return { error: "Non autorizzato" };
  }

  const tenantId = String(formData.get("tenant_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const plan = String(formData.get("plan") ?? "LIGHT");
  const endsAtRaw = String(formData.get("subscription_ends_at") ?? "").trim();

  if (!tenantId || !name || !slug) {
    return { error: "ID, Nome e Slug sono obbligatori." };
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: "Lo slug può contenere solo lettere minuscole, numeri e trattini (es. paw-spa)." };
  }

  const subscription_ends_at = endsAtRaw ? new Date(endsAtRaw).toISOString() : null;
  const adminSupabase = createSupabaseAdminClient();

  const { error } = await (adminSupabase.from("tenants") as any)
    .update({
      name,
      slug,
      plan,
      subscription_ends_at,
    })
    .eq("id", tenantId);

  if (error) {
    console.error("Errore aggiornamento tenant:", error);
    if (error.message?.includes("unique")) {
      return { error: "Un salone con questo slug esiste già." };
    }
    return { error: `Errore database: ${error.message}` };
  }

  redirect("/superadmin/tenants" as Route);
}

export async function deleteTenantAction(prevState: any, formData: FormData) {
  try {
    await requireSuperAdmin();
  } catch {
    return { error: "Non autorizzato" };
  }

  const tenantId = String(formData.get("tenant_id") ?? "");
  if (!tenantId) {
    return { error: "ID salone mancante." };
  }

  const adminSupabase = createSupabaseAdminClient();

  // RLS e CASCADE cancelleranno tutti i dati del tenant
  const { error } = await adminSupabase
    .from("tenants")
    .delete()
    .eq("id", tenantId);

  if (error) {
    console.error("Errore eliminazione tenant:", error);
    return { error: `Errore database: ${error.message}` };
  }

  redirect("/superadmin/tenants" as Route);
}
