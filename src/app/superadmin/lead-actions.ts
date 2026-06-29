"use server";

import { requireSuperAdmin } from "@/lib/auth/require-superadmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateLeadStatusAction(leadId: string, newStatus: string) {
  try {
    // 1. Verifica i privilegi di Superadmin
    await requireSuperAdmin({ next: "/superadmin", mode: "notFound" });

    if (!leadId || !newStatus) {
      return { error: "Parametri mancanti." };
    }

    const adminSupabase = createSupabaseAdminClient() as any;
    const { error } = await adminSupabase
      .from("marketing_leads")
      .update({ status: newStatus })
      .eq("id", leadId);

    if (error) {
      console.error("Errore aggiornamento stato lead:", error.message);
      return { error: "Impossibile aggiornare lo stato del lead." };
    }

    revalidatePath("/superadmin");
    return { success: true };
  } catch (err) {
    console.error("Errore azione lead status:", err);
    return { error: "Azione non autorizzata o errore imprevisto." };
  }
}

export async function deleteLeadAction(leadId: string) {
  try {
    // 1. Verifica i privilegi di Superadmin
    await requireSuperAdmin({ next: "/superadmin", mode: "notFound" });

    if (!leadId) {
      return { error: "ID lead mancante." };
    }

    const adminSupabase = createSupabaseAdminClient() as any;
    const { error } = await adminSupabase
      .from("marketing_leads")
      .delete()
      .eq("id", leadId);

    if (error) {
      console.error("Errore eliminazione lead:", error.message);
      return { error: "Impossibile eliminare il lead." };
    }

    revalidatePath("/superadmin");
    return { success: true };
  } catch (err) {
    console.error("Errore azione eliminazione lead:", err);
    return { error: "Azione non autorizzata o errore imprevisto." };
  }
}
