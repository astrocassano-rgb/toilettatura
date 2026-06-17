import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startOrGetBookingSession, type BookingSessionActivationRecord } from "@/lib/session-activation";

export async function POST(_: Request, context: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, station_id, start_time, end_time, status")
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .maybeSingle();
  const bookingRecord = booking as BookingSessionActivationRecord | null;

  if (!bookingRecord) {
    return Response.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  try {
    const result = await startOrGetBookingSession(bookingRecord);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ ok: true, session: result.session, already_active: result.already_active });
  } catch (error: any) {
    return Response.json({ error: String(error?.message ?? "Errore avvio sessione.") }, { status: 500 });
  }
}
