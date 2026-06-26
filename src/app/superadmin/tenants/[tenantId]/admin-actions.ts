"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requireSuperAdmin } from "@/lib/auth/require-superadmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

/**
 * Gestione amministratori di salone — modello MULTI-SALONE (claude.ai).
 *
 * Fonte di verità del ruolo admin = `tenant_customers.role = 'admin'` per (utente, salone).
 * `app_metadata.role = 'admin'` resta un FLAG GENERICO ("è un amministratore di qualche salone"),
 * usato solo dal middleware per il redirect dopo il login. NON viene più legato a un singolo
 * `tenant_id`: così una stessa persona può amministrare PIÙ saloni (la vecchia logica, scrivendo
 * `app_metadata.tenant_id`, la confinava a un solo salone).
 */

export async function addTenantAdminAction(tenantId: string, email: string) {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: "Non autorizzato" };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!tenantId || !cleanEmail) {
    return { error: "ID salone ed Email sono obbligatori." };
  }

  const adminSupabase = createSupabaseAdminClient();

  try {
    // 1. Cerca se l'utente esiste già in auth (paginazione).
    let existingUser = null;
    let page = 1;
    while (page <= 20) {
      const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers({ page, perPage: 200 });
      if (listError) {
        return { error: `Errore durante la ricerca dell'utente: ${listError.message}` };
      }
      const users = listData?.users ?? [];
      const match = users.find((u) => (u.email ?? "").toLowerCase() === cleanEmail);
      if (match) {
        existingUser = match;
        break;
      }
      if (users.length < 200) break;
      page++;
    }

    let targetUserId: string;
    let invited = false;

    if (existingUser) {
      targetUserId = existingUser.id;

      // Flag generico "amministratore" SENZA pinnare un singolo tenant (multi-salone).
      // Si preserva l'eventuale app_metadata esistente (incluso un tenant_id storico, ormai non
      // più usato per l'autorizzazione: quella passa da tenant_customers).
      const appMetadata = { ...(existingUser.app_metadata ?? {}), role: "admin" };
      const { error: updateAuthErr } = await adminSupabase.auth.admin.updateUserById(targetUserId, {
        app_metadata: appMetadata,
      });
      if (updateAuthErr) {
        return { error: `Errore aggiornamento metadati auth: ${updateAuthErr.message}` };
      }

      // Assicura il profilo pubblico.
      const { data: profile } = await adminSupabase.from("profiles").select("id").eq("id", targetUserId).maybeSingle();
      if (!profile) {
        const { error: insertProfileErr } = await adminSupabase.from("profiles").insert({ id: targetUserId, email: cleanEmail });
        if (insertProfileErr) {
          return { error: `Errore creazione profilo: ${insertProfileErr.message}` };
        }
      }
    } else {
      // 2. L'utente non esiste: invito via email. `data.tenant_id` serve a handle_new_user per
      // collegare il salone di registrazione; il ruolo admin lo forziamo subito sotto in tenant_customers.
      const headersList = await headers();
      const host = headersList.get("host") || "app.dogwash24.it";
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      const origin = `${protocol}://${host}`;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;

      const { data: inviteData, error: inviteErr } = await adminSupabase.auth.admin.inviteUserByEmail(cleanEmail, {
        data: { tenant_id: tenantId },
        redirectTo,
      });
      if (inviteErr) {
        return { error: `Errore durante l'invio dell'invito: ${inviteErr.message}` };
      }
      const invitedId = inviteData?.user?.id;
      if (!invitedId) {
        return { error: "Invito inviato ma nessun ID utente generato." };
      }
      targetUserId = invitedId;
      invited = true;

      const { error: updateAuthErr } = await adminSupabase.auth.admin.updateUserById(invitedId, {
        app_metadata: { role: "admin" },
      });
      if (updateAuthErr) {
        return { error: `Errore impostazione ruolo utente invitato: ${updateAuthErr.message}` };
      }
    }

    // 3. Sorgente di verità del ruolo: upsert dell'appartenenza come admin di QUESTO salone.
    // Upsert → se già membro (anche come 'customer') viene promosso ad 'admin' senza duplicati.
    const { error: membershipErr } = await (adminSupabase as any)
      .from("tenant_customers")
      .upsert({ customer_id: targetUserId, tenant_id: tenantId, role: "admin" });
    if (membershipErr) {
      return { error: `Errore associazione ruolo admin: ${membershipErr.message}` };
    }

    // 4. Assicura il portafoglio del salone (saldo 0) per coerenza dati.
    const { data: existingWallet } = await adminSupabase
      .from("wallets")
      .select("id")
      .eq("customer_id", targetUserId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!existingWallet) {
      const { error: walletErr } = await adminSupabase
        .from("wallets")
        .insert({ customer_id: targetUserId, tenant_id: tenantId, balance_credits: 0 });
      if (walletErr) {
        console.error("Errore creazione portafoglio:", walletErr.message);
      }
    }

    revalidatePath(`/superadmin/tenants/${tenantId}`);
    return {
      success: true,
      message: invited
        ? `Invito inviato a ${cleanEmail}. Diventerà amministratore appena accetterà.`
        : `Utente ${cleanEmail} promosso ad amministratore del salone.`,
    };
  } catch (err: any) {
    console.error("Errore addTenantAdminAction:", err);
    return { error: err?.message || "Si è verificato un errore imprevisto." };
  }
}

export async function removeTenantAdminAction(tenantId: string, userId: string) {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: "Non autorizzato" };
  }

  if (!tenantId || !userId) {
    return { error: "ID salone ed ID utente sono obbligatori." };
  }

  const adminSupabase = createSupabaseAdminClient();

  try {
    // 1. Revoca i privilegi admin SOLO su questo salone: degradiamo l'appartenenza a 'customer'
    // (non eliminiamo la riga, così l'utente resta cliente del salone con il suo wallet/storico).
    const { error: downgradeErr } = await (adminSupabase as any)
      .from("tenant_customers")
      .update({ role: "customer" })
      .eq("customer_id", userId)
      .eq("tenant_id", tenantId);
    if (downgradeErr) {
      return { error: `Errore rimozione ruolo admin: ${downgradeErr.message}` };
    }

    // 2. Multi-salone: togliamo il flag generico app_metadata.role='admin' SOLO se l'utente
    // non è più amministratore di NESSUN altro salone.
    const { count: remainingAdminOf, error: countErr } = await (adminSupabase as any)
      .from("tenant_customers")
      .select("tenant_id", { count: "exact", head: true })
      .eq("customer_id", userId)
      .eq("role", "admin");

    if (!countErr && (remainingAdminOf ?? 0) === 0) {
      const { data: userData } = await adminSupabase.auth.admin.getUserById(userId);
      const appMetadata = { ...(userData?.user?.app_metadata ?? {}) };
      delete appMetadata.role; // non è più admin da nessuna parte
      const { error: updateAuthErr } = await adminSupabase.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
      if (updateAuthErr) {
        return { error: `Errore aggiornamento metadati auth: ${updateAuthErr.message}` };
      }
    }

    revalidatePath(`/superadmin/tenants/${tenantId}`);
    return { success: true, message: "Privilegi di amministratore rimossi con successo." };
  } catch (err: any) {
    console.error("Errore removeTenantAdminAction:", err);
    return { error: err?.message || "Si è verificato un errore imprevisto." };
  }
}
