"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SessionCountdown } from "@/components/sessions/session-countdown";
import { RotateCw, Zap, User, CheckCircle2 } from "lucide-react";
import type { Database } from "@/types/database";

type SessionRow = Database["public"]["Tables"]["active_sessions"]["Row"];
type Booking = Pick<Database["public"]["Tables"]["bookings"]["Row"], "id" | "dog_id" | "station_id" | "start_time" | "end_time" | "status">;
type Dog = Pick<Database["public"]["Tables"]["dogs"]["Row"], "id" | "name">;
type Station = Pick<Database["public"]["Tables"]["stations"]["Row"], "id" | "name">;
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "email" | "first_name" | "last_name">;

interface SessioniLiveClientProps {
  initialSessions: SessionRow[];
  initialBookings: Booking[];
  initialDogs: Dog[];
  initialStations: Station[];
  initialProfiles: Profile[];
}

interface LivePayload {
  sessions: SessionRow[];
  bookings: Booking[];
  profiles: Profile[];
  stations: Station[];
  dogs: Dog[];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function SessioniLiveClient({
  initialSessions,
  initialBookings,
  initialDogs,
  initialStations,
  initialProfiles,
}: SessioniLiveClientProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [bookings, setBookings] = useState(initialBookings);
  const [dogs, setDogs] = useState(initialDogs);
  const [stations, setStations] = useState(initialStations);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => void refresh(true), 15000);
    return () => clearInterval(interval);
  }, []);

  async function refresh(silent = false) {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/sessions/live");
      if (!res.ok) throw new Error("Errore caricamento sessioni");
      const data = await res.json() as LivePayload;
      setSessions(data.sessions);
      setBookings(data.bookings);
      setDogs(data.dogs);
      setStations(data.stations);
      setProfiles(data.profiles);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[sessioni-live] polling error:", err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }

  async function stopSession(sessionId: string) {
    if (!confirm("Interrompere questa sessione? Il cliente perderà l'accesso immediato alla postazione.")) return;
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("session_id", sessionId);
      const res = await fetch("/api/admin/sessions/stop", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Impossibile arrestare la sessione.");
      setMessage({ text: "Sessione interrotta con successo.", type: "success" });
      await refresh(false);
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Errore.", type: "error" });
    }
  }

  // Build lookup maps
  const bookingById = new Map<string, Booking>(bookings.map((b) => [b.id, b]));
  const dogNameById = new Map<string, string>(dogs.map((d) => [d.id, d.name]));
  const stationNameById = new Map<string, string>(stations.map((s) => [s.id, s.name]));
  const customerById = new Map<string, Profile>(profiles.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      {/* Header con contatore live e refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-slate-900/40 p-4 ring-1 ring-inset ring-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Live badge pulsante */}
          {sessions.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              <span className="text-sm font-bold text-emerald-200">
                {sessions.length} session{sessions.length === 1 ? "e" : "i"} live
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400">Nessuna sessione attiva</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500">
            Aggiornato: {lastUpdated.toLocaleTimeString("it-IT")} · auto ogni 15s
          </span>
          <Button
            variant="secondary"
            size="md"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
        </div>
      </div>

      {/* Messaggio globale */}
      {message && (
        <div className={`rounded-2xl px-4 py-3 text-sm font-medium ring-1 ring-inset ${
          message.type === "success"
            ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25"
            : "bg-rose-500/10 text-rose-200 ring-rose-500/25"
        }`}>
          {message.text}
        </div>
      )}

      {sessions.length ? (
        <div className="grid gap-3">
          {sessions.map((session) => {
            const booking = session.booking_id ? bookingById.get(session.booking_id) : null;
            const stationName = stationNameById.get(session.station_id) ?? "Postazione";
            const dogName = booking ? dogNameById.get(booking.dog_id) ?? "Cane" : "—";
            const customer = customerById.get(session.customer_id);
            const customerName = customer
              ? [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() || customer.email || "Cliente"
              : "Cliente";

            return (
              <Card key={session.id} className="border-emerald-500/15 bg-emerald-950/5">
                <CardContent className="space-y-4 pt-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      {/* Station + dog */}
                      <p className="text-sm font-bold text-slate-50 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
                        {stationName}
                        {dogName !== "—" && <> · 🐶 {dogName}</>}
                      </p>
                      {/* Customer */}
                      <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <User className="h-3 w-3" />
                        {customerName}
                        {customer && (
                          <Link
                            href={`/admin/clienti/${customer.id}`}
                            className="ml-1 text-cyan-400 underline underline-offset-2 hover:text-cyan-200"
                          >
                            Profilo
                          </Link>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Avviata: {formatDateTime(session.activated_at)}
                        {booking && (
                          <> · Prenotazione {formatDateTime(booking.start_time)} – {formatTime(booking.end_time)}</>
                        )}
                      </p>
                    </div>

                    {/* Countdown */}
                    <div className="shrink-0 rounded-2xl bg-emerald-500/10 px-5 py-3 text-right ring-1 ring-inset ring-emerald-500/25">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Tempo residuo</p>
                      <p className="text-xl font-bold text-slate-50">
                        <SessionCountdown activatedAt={session.activated_at} remainingSeconds={session.remaining_seconds} />
                      </p>
                    </div>
                  </div>

                  {/* Azioni */}
                  <div className="grid gap-2 md:grid-cols-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/25 hover:bg-rose-500/20"
                      onClick={() => void stopSession(session.id)}
                    >
                      Chiudi sessione
                    </Button>
                    {booking ? (
                      <form action="/api/admin/bookings/status" method="post">
                        <input type="hidden" name="booking_id" value={booking.id} />
                        <input type="hidden" name="status" value="COMPLETED" />
                        <Button
                          type="submit"
                          variant="secondary"
                          className="w-full"
                          disabled={booking.status === "COMPLETED" || booking.status === "CANCELLED"}
                        >
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
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <p className="text-lg font-semibold tracking-tight">Struttura libera</p>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            Nessuna sessione attiva al momento. La pagina si aggiorna automaticamente ogni 15 secondi.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
