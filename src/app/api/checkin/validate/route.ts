import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRemainingSeconds } from "@/lib/active-sessions";
import { startOrGetBookingSession, type BookingSessionActivationRecord } from "@/lib/session-activation";
import { verifyCheckinToken } from "@/lib/checkin-token";

function extractToken(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { token?: string };
      return typeof parsed.token === "string" ? parsed.token : "";
    } catch {
      return "";
    }
  }

  return trimmed;
}

export async function POST(request: Request) {
  let rawToken = "";
  let stationId = "";

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    rawToken = typeof body?.token === "string" ? body.token : typeof body?.qr === "string" ? body.qr : "";
    stationId = typeof body?.station_id === "string" ? body.station_id : "";
  } else {
    const form = await request.formData();
    rawToken = String(form.get("token") ?? form.get("qr") ?? "");
    stationId = String(form.get("station_id") ?? "");
  }

  const token = extractToken(rawToken);
  if (!token) {
    return Response.json({ error: "Token check-in mancante." }, { status: 400 });
  }

  const payload = verifyCheckinToken(token);
  if (!payload) {
    return Response.json({ error: "QR non valido o manomesso." }, { status: 400 });
  }

  const nowMs = Date.now();
  const validFromMs = new Date(payload.valid_from).getTime();
  const validUntilMs = new Date(payload.valid_until).getTime();
  if (nowMs < validFromMs || nowMs >= validUntilMs) {
    return Response.json({ error: "QR fuori finestra temporale." }, { status: 409 });
  }

  if (stationId && stationId !== payload.station_id) {
    return Response.json({ error: "QR non valido per questa postazione." }, { status: 409 });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (error: any) {
    return Response.json({ error: String(error?.message ?? "Client admin non disponibile.") }, { status: 500 });
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("id, customer_id, station_id, start_time, end_time, status")
    .eq("id", payload.booking_id)
    .maybeSingle();
  const bookingRecord = booking as BookingSessionActivationRecord | null;

  if (!bookingRecord) {
    return Response.json({ error: "Prenotazione non trovata." }, { status: 404 });
  }

  if (
    bookingRecord.customer_id !== payload.customer_id ||
    bookingRecord.station_id !== payload.station_id ||
    bookingRecord.start_time !== payload.valid_from ||
    bookingRecord.end_time !== payload.valid_until
  ) {
    return Response.json({ error: "QR non coerente con la prenotazione." }, { status: 409 });
  }

  const result = await startOrGetBookingSession(bookingRecord);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const { data: station } = await admin.from("stations").select("name").eq("id", bookingRecord.station_id).maybeSingle();
  const remainingSeconds = getRemainingSeconds(result.session);

  return Response.json({
    ok: true,
    station_id: bookingRecord.station_id,
    station_name: station?.name ?? "Postazione",
    booking_id: bookingRecord.id,
    start_at: bookingRecord.start_time,
    end_at: bookingRecord.end_time,
    remaining_seconds: remainingSeconds,
    activated_at: result.session.activated_at,
    session_id: result.session.id,
    already_active: result.already_active
  });
}
