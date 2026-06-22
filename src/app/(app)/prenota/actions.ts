"use server";

import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sendBookingConfirmationWhatsApp(
  userId: string, 
  details: {
    stationName: string;
    dogName: string;
    startTime: string;
    serviceLabel: string;
  }
) {
  // Uscita silenziosa se mancano i dati necessari
  if (!userId) return;

  try {
    // Usa il client server autenticato (non richiede SUPABASE_SERVICE_ROLE_KEY)
    const supabase = await createSupabaseServerClient();

    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", userId)
      .maybeSingle();

    const profile = profileRaw as { phone: string | null } | null;
    if (!profile?.phone) return;


    const dateStr = format(new Date(details.startTime), "EEEE d MMMM 'alle' HH:mm", { locale: it });

    const message = `🐾 *DogWash24 - Prenotazione Confermata!*\n\nCiao! Ti confermiamo l'appuntamento per *${details.dogName}*.\n\n🗓️ Quando: ${dateStr}\n📍 Postazione: ${details.stationName}\n✂️ Servizio: ${details.serviceLabel}\n\nTi aspettiamo!`;

    await sendWhatsAppMessage({ to: profile.phone, message });
  } catch (err) {
    // Non-critico: la prenotazione è già confermata, la notifica WhatsApp è best-effort
    console.warn("[sendBookingConfirmationWhatsApp] Errore non bloccante:", err);
  }
}
