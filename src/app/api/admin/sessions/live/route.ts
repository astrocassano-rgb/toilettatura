import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSessionLive } from "@/lib/active-sessions";
import type { Database } from "@/types/database";

type SessionRow = Database["public"]["Tables"]["active_sessions"]["Row"];
type Booking = Pick<Database["public"]["Tables"]["bookings"]["Row"], "id" | "dog_id" | "station_id" | "start_time" | "end_time" | "status">;
type Dog = Pick<Database["public"]["Tables"]["dogs"]["Row"], "id" | "name">;
type Station = Pick<Database["public"]["Tables"]["stations"]["Row"], "id" | "name">;
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "email" | "first_name" | "last_name">;

function isAdminUser(user: Record<string, unknown> | null) {
  if (!user) return false;
  const meta = user.app_metadata as Record<string, unknown> | undefined;
  return meta?.role === "admin";
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user as Record<string, unknown> | null;

  if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });
  if (!isAdminUser(user)) return Response.json({ error: "Non autorizzato" }, { status: 403 });

  const { data: rawSessions } = await supabase.from("active_sessions").select("*").order("activated_at", { ascending: false });
  const liveSessions = ((rawSessions ?? []) as SessionRow[]).filter(isSessionLive);

  const bookingIds = Array.from(new Set(liveSessions.map((s) => s.booking_id).filter(Boolean))) as string[];
  const customerIds = Array.from(new Set(liveSessions.map((s) => s.customer_id)));
  const stationIds = Array.from(new Set(liveSessions.map((s) => s.station_id)));

  const [
    { data: bookings },
    { data: profiles },
    { data: stations },
  ] = await Promise.all([
    bookingIds.length
      ? supabase.from("bookings").select("id, dog_id, station_id, start_time, end_time, status").in("id", bookingIds)
      : Promise.resolve({ data: [] as Booking[] }),
    customerIds.length
      ? supabase.from("profiles").select("id, email, first_name, last_name").in("id", customerIds)
      : Promise.resolve({ data: [] as Profile[] }),
    stationIds.length
      ? supabase.from("stations").select("id, name").in("id", stationIds)
      : Promise.resolve({ data: [] as Station[] }),
  ]);

  const dogIds = Array.from(new Set((bookings ?? []).map((b: Booking) => b.dog_id).filter(Boolean)));
  const { data: dogs } = dogIds.length
    ? await supabase.from("dogs").select("id, name").in("id", dogIds)
    : { data: [] as Dog[] };

  return Response.json({ sessions: liveSessions, bookings: bookings ?? [], profiles: profiles ?? [], stations: stations ?? [], dogs: dogs ?? [] });
}
