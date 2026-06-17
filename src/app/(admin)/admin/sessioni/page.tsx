import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SessionCountdown } from "@/components/sessions/session-countdown";
import { isSessionLive } from "@/lib/active-sessions";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Database } from "@/types/database";

type SessionRow = Database["public"]["Tables"]["active_sessions"]["Row"];
type Booking = Pick<Database["public"]["Tables"]["bookings"]["Row"], "id" | "dog_id" | "station_id" | "start_time" | "end_time" | "status">;
type Dog = Pick<Database["public"]["Tables"]["dogs"]["Row"], "id" | "name">;
type Station = Pick<Database["public"]["Tables"]["stations"]["Row"], "id" | "name">;
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "email" | "first_name" | "last_name">;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function AdminSessioniPage() {
  const { supabase } = await requireAdmin({ next: "/admin/sessioni", mode: "notFound" });
  const { data: sessions } = await supabase.from("active_sessions").select("*").order("activated_at", { ascending: false });

  const liveSessions = ((sessions ?? []) as SessionRow[]).filter((session) => isSessionLive(session));
  const bookingIds = Array.from(new Set(liveSessions.map((session) => session.booking_id).filter(Boolean))) as string[];
  const dogIds = new Set<string>();
  const stationIds = new Set<string>();
  const customerIds = new Set<string>();

  liveSessions.forEach((session) => {
    customerIds.add(session.customer_id);
    stationIds.add(session.station_id);
  });

  const { data: bookings } = bookingIds.length
    ? await supabase.from("bookings").select("id, dog_id, station_id, start_time, end_time, status").in("id", bookingIds)
    : { data: [] as Booking[] };

  for (const booking of (bookings ?? []) as Booking[]) {
    dogIds.add(booking.dog_id);
    stationIds.add(booking.station_id);
  }

  const [{ data: dogs }, { data: stations }, { data: profiles }] = await Promise.all([
    dogIds.size ? supabase.from("dogs").select("id, name").in("id", Array.from(dogIds)) : Promise.resolve({ data: [] as Dog[] }),
    stationIds.size ? supabase.from("stations").select("id, name").in("id", Array.from(stationIds)) : Promise.resolve({ data: [] as Station[] }),
    customerIds.size
      ? supabase.from("profiles").select("id, email, first_name, last_name").in("id", Array.from(customerIds))
      : Promise.resolve({ data: [] as Profile[] })
  ]);

  const bookingById = new Map<string, Booking>();
  for (const booking of (bookings ?? []) as Booking[]) bookingById.set(booking.id, booking);

  const dogNameById = new Map<string, string>();
  for (const dog of (dogs ?? []) as Dog[]) dogNameById.set(dog.id, dog.name);

  const stationNameById = new Map<string, string>();
  for (const station of (stations ?? []) as Station[]) stationNameById.set(station.id, station.name);

  const customerNameById = new Map<string, string>();
  for (const profile of (profiles ?? []) as Profile[]) {
    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
    customerNameById.set(profile.id, fullName || profile.email || profile.id);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Sessioni live</h2>
        <p className="text-sm leading-relaxed text-slate-200">Controllo operativo delle sessioni attive H24 in struttura.</p>
      </header>

      {liveSessions.length ? (
        <div className="grid gap-3">
          {liveSessions.map((session) => {
            const booking = session.booking_id ? bookingById.get(session.booking_id) : null;
            const stationName = stationNameById.get(session.station_id) ?? "Postazione";
            const dogName = booking ? dogNameById.get(booking.dog_id) ?? "Cane" : "Sessione libera";
            const customerName = customerNameById.get(session.customer_id) ?? "Cliente";

            return (
              <Card key={session.id}>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-50">
                        {stationName} · {dogName}
                      </p>
                      <p className="text-xs text-slate-300">{customerName}</p>
                      <p className="text-[11px] text-slate-400">
                        Avviata: {formatDateTime(session.activated_at)}
                        {booking ? ` · Prenotazione ${formatDateTime(booking.start_time)} - ${new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(booking.end_time))}` : ""}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-right ring-1 ring-inset ring-emerald-500/30">
                      <p className="text-xs font-medium text-emerald-200">Tempo residuo</p>
                      <p className="text-xl font-semibold tracking-tight text-slate-50">
                        <SessionCountdown activatedAt={session.activated_at} remainingSeconds={session.remaining_seconds} />
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <form action="/api/admin/sessions/stop" method="post">
                      <input type="hidden" name="session_id" value={session.id} />
                      <Button type="submit" variant="primary" className="w-full">
                        Chiudi sessione
                      </Button>
                    </form>
                    {booking ? (
                      <form action="/api/admin/bookings/status" method="post">
                        <input type="hidden" name="booking_id" value={booking.id} />
                        <input type="hidden" name="status" value="COMPLETED" />
                        <Button type="submit" variant="secondary" className="w-full" disabled={booking.status === "COMPLETED" || booking.status === "CANCELLED"}>
                          Segna prenotazione completata
                        </Button>
                      </form>
                    ) : (
                      <div />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Nessuna sessione</p>
            <p className="text-lg font-semibold tracking-tight">Struttura libera</p>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Qui compariranno le sessioni attive avviate dai clienti dalla loro prenotazione.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
