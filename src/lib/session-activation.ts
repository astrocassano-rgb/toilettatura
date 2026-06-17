import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSessionLive } from "@/lib/active-sessions";
import type { Database } from "@/types/database";

export type BookingSessionActivationRecord = Pick<
  Database["public"]["Tables"]["bookings"]["Row"],
  "id" | "customer_id" | "station_id" | "start_time" | "end_time" | "status"
>;

function isAllowedStatus(status: string) {
  return status === "CONFIRMED" || status === "PENDING";
}

export async function startOrGetBookingSession(booking: BookingSessionActivationRecord) {
  if (!isAllowedStatus(booking.status)) {
    return { ok: false as const, status: 400, error: "Questa prenotazione non puo avviare una sessione." };
  }

  const nowMs = Date.now();
  const startMs = new Date(booking.start_time).getTime();
  const endMs = new Date(booking.end_time).getTime();

  if (nowMs < startMs) {
    return { ok: false as const, status: 409, error: "Il check-in si apre all'orario prenotato." };
  }

  if (nowMs >= endMs) {
    return { ok: false as const, status: 409, error: "La finestra della prenotazione e gia terminata." };
  }

  const admin = createSupabaseAdminClient();
  const [{ data: bookingSessions }, { data: stationSessions }] = await Promise.all([
    admin.from("active_sessions").select("*").eq("booking_id", booking.id),
    admin.from("active_sessions").select("*").eq("station_id", booking.station_id)
  ]);

  const staleIds = [...(bookingSessions ?? []), ...(stationSessions ?? [])]
    .filter((session, index, all) => all.findIndex((item) => item.id === session.id) === index)
    .filter((session) => !isSessionLive(session))
    .map((session) => session.id);

  if (staleIds.length) {
    await admin.from("active_sessions").delete().in("id", staleIds);
  }

  const existingLiveForBooking = (bookingSessions ?? []).find((session) => isSessionLive(session));
  if (existingLiveForBooking) {
    return { ok: true as const, session: existingLiveForBooking, already_active: true };
  }

  const busyStation = (stationSessions ?? []).find((session) => session.booking_id !== booking.id && isSessionLive(session));
  if (busyStation) {
    return { ok: false as const, status: 409, error: "La postazione risulta gia occupata da una sessione attiva." };
  }

  const remainingSeconds = Math.max(1, Math.ceil((endMs - nowMs) / 1000));
  const { data: createdSession, error } = await admin
    .from("active_sessions")
    .insert({
      booking_id: booking.id,
      station_id: booking.station_id,
      customer_id: booking.customer_id,
      remaining_seconds: remainingSeconds,
      is_paused: false,
      activated_at: new Date(nowMs).toISOString()
    })
    .select("*")
    .single();

  if (error || !createdSession) {
    return { ok: false as const, status: 400, error: error?.message ?? "Impossibile creare la sessione." };
  }

  return { ok: true as const, session: createdSession, already_active: false };
}
