// @ts-nocheck
/* eslint-disable */
/**
 * DELETE /api/bookings/[bookingId]
 *
 * Cancella una prenotazione chiamando la RPC `cancel_booking` esistente,
 * poi notifica via WhatsApp tutti i clienti in lista d'attesa per lo
 * stesso giorno e servizio (status WAITING → NOTIFIED).
 *
 * Il client autenticato deve essere il proprietario della prenotazione
 * (la RPC cancel_booking lo verifica internamente).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { format } from "date-fns";
import { it } from "date-fns/locale";

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await context.params;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId mancante" }, { status: 400 });
    }

    // ① Client autenticato dell'utente
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    // ② Recupera i dati della prenotazione PRIMA di cancellarla (data, servizio, tenant)
    const { data: bookingData, error: bookingFetchErr } = await supabase
      .from("bookings")
      .select("id, start_time, service_type, tenant_id, customer_id, status")
      .eq("id", bookingId)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (bookingFetchErr || !bookingData) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
    }

    if (bookingData.status === "CANCELLED" || bookingData.status === "COMPLETED") {
      return NextResponse.json(
        { error: "La prenotazione non è cancellabile (già cancellata o completata)" },
        { status: 400 }
      );
    }

    // ③ Chiama la RPC cancel_booking esistente (gestisce rimborso wallet)
    const { data: cancelResult, error: cancelErr } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
    });

    if (cancelErr) {
      console.error("[DELETE /api/bookings/[bookingId]] Errore RPC:", cancelErr);
      return NextResponse.json(
        { error: cancelErr.message ?? "Errore durante la cancellazione" },
        { status: 500 }
      );
    }

    const result = Array.isArray(cancelResult) ? cancelResult[0] : cancelResult;

    // ④ Notifica i clienti in lista d'attesa (best-effort, non bloccante)
    // Eseguiamo in background senza await per non rallentare la risposta
    notifyWaitlist({
      bookingDate: bookingData.start_time,
      serviceType: bookingData.service_type as string,
      tenantId: bookingData.tenant_id as string,
    }).catch((e) =>
      console.warn("[DELETE /api/bookings/[bookingId]] Errore notifica waitlist:", e)
    );

    return NextResponse.json({
      cancelled: result?.cancelled ?? true,
      refunded: result?.refunded ?? false,
      refund_credits: result?.refund_credits ?? 0,
    });
  } catch (err: any) {
    console.error("[DELETE /api/bookings/[bookingId]] Errore inatteso:", err);
    return NextResponse.json({ error: err?.message ?? "Errore interno" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifica waitlist — eseguita in background con service_role
// ─────────────────────────────────────────────────────────────────────────────
async function notifyWaitlist({
  bookingDate,
  serviceType,
  tenantId,
}: {
  bookingDate: string;
  serviceType: string;
  tenantId: string;
}) {
  const serviceRole = createServiceRoleClient();

  // Data del giorno cancellato (solo YYYY-MM-DD)
  const cancelledDay = bookingDate.slice(0, 10);

  // Recupera tutti i clienti WAITING per quel giorno e servizio
  const { data: waitlistEntries, error: fetchErr } = await serviceRole
    .from("booking_waitlist")
    .select("id, customer_id")
    .eq("tenant_id", tenantId)
    .eq("date", cancelledDay)
    .eq("service_type", serviceType)
    .eq("status", "WAITING")
    .order("created_at", { ascending: true });

  if (fetchErr || !waitlistEntries?.length) {
    // Nessuno in lista d'attesa per quel giorno — nulla da fare
    return;
  }

  const customerIds = waitlistEntries.map((e) => e.customer_id);

  // Recupera i telefoni di tutti i clienti in coda
  const { data: profiles } = await serviceRole
    .from("profiles")
    .select("id, first_name, phone")
    .in("id", customerIds);

  const profileMap = new Map<string, { first_name: string | null; phone: string | null }>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, { first_name: p.first_name, phone: p.phone });
  }

  const dateLabel = format(new Date(cancelledDay + "T12:00:00"), "EEEE d MMMM", { locale: it });
  const serviceLabel =
    serviceType === "FULL_GROOMING"
      ? "Toelettatura Completa"
      : serviceType === "ASSISTED_WASH"
      ? "Lavaggio Assistito"
      : "Self-Service";

  // Invia notifica WhatsApp e aggiorna status a NOTIFIED
  const notifiedIds: string[] = [];
  const now = new Date().toISOString();

  for (const entry of waitlistEntries) {
    const profile = profileMap.get(entry.customer_id);
    if (!profile?.phone) continue;

    const name = profile.first_name ?? "Cliente";
    const message =
      `🐾 *DogWash24 – Posto Libero!*\n\n` +
      `Ciao ${name}! Si è liberato un posto per il *${dateLabel}*` +
      ` per il servizio *${serviceLabel}*.\n\n` +
      `Sei in lista d'attesa: prenota subito prima che si riempia di nuovo! 👇\n` +
      `https://app.dogwash24.it/prenota`;

    await sendWhatsAppMessage({ to: profile.phone, message }).catch((e) =>
      console.warn(`[notifyWaitlist] WhatsApp fallito per ${entry.customer_id}:`, e)
    );

    notifiedIds.push(entry.id);
  }

  // Aggiorna status a NOTIFIED per chi è stato contattato
  if (notifiedIds.length > 0) {
    await serviceRole
      .from("booking_waitlist")
      .update({ status: "NOTIFIED", notified_at: now })
      .in("id", notifiedIds);
  }

  console.log(
    `[notifyWaitlist] Notificati ${notifiedIds.length}/${waitlistEntries.length} clienti in attesa per ${cancelledDay} (${serviceType})`
  );
}
