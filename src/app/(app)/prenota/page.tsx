"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Lock, RefreshCw } from "lucide-react";
import { tryCreateSupabaseBrowserClient } from "@/lib/supabase/optional";
import type { Database } from "@/types/database";

type Station = Database["public"]["Tables"]["stations"]["Row"];
type AvailabilityRow = Database["public"]["Functions"]["get_booking_availability"]["Returns"][number];
type StationType = Database["public"]["Enums"]["station_type"];

const slotMinutes = 15;
const dayHours = { start: 8, end: 20 };
const calendarDays = 14;

const serviceLabels: Record<StationType, string> = {
  WASH_BASIN: "Lavaggio",
  DRYING_ZONE: "Asciugatura",
  GROOMING_TABLE: "Toelettatura"
};

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, days: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function PrenotaPage() {
  const supabase = useMemo(() => tryCreateSupabaseBrowserClient(), []);
  const isConfigured = Boolean(supabase);

  const calendarStart = useMemo(() => startOfLocalDay(new Date()), []);
  const calendar = useMemo(() => Array.from({ length: calendarDays }, (_, i) => addDays(calendarStart, i)), [calendarStart]);

  const [stations, setStations] = useState<Station[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [availabilityHint, setAvailabilityHint] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<StationType>("WASH_BASIN");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [isLogged, setIsLogged] = useState<boolean>(false);

  const availabilityFrom = useMemo(
    () => new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate(), dayHours.start, 0, 0, 0),
    [calendarStart]
  );
  const availabilityTo = useMemo(() => {
    const last = calendar[calendar.length - 1] ?? calendarStart;
    return new Date(last.getFullYear(), last.getMonth(), last.getDate(), dayHours.end, 0, 0, 0);
  }, [calendar, calendarStart]);

  useEffect(() => {
    async function checkSession() {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setIsLogged(Boolean(data.session));
    }
    void checkSession();
  }, [supabase]);

  useEffect(() => {
    async function loadAvailability() {
      if (!supabase) return;
      setLoading(true);
      setAvailabilityHint(null);
      try {
        const { data: stationsData, error: stationsError } = await supabase
          .from("stations")
          .select("*")
          .order("created_at", { ascending: true });
        if (stationsError) throw stationsError;
        setStations(stationsData ?? []);

        const args = { p_from: availabilityFrom.toISOString(), p_to: availabilityTo.toISOString() } as Database["public"]["Functions"]["get_booking_availability"]["Args"];
        const { data: availData, error: availError } = await supabase.rpc("get_booking_availability", args);
        if (availError) throw availError;
        setAvailability(availData ?? []);
        setAvailabilityLoaded(true);
      } catch (e: any) {
        setAvailabilityLoaded(false);
        const msg = e?.message ?? "Disponibilità non disponibile.";
        setAvailabilityHint(
          msg.includes("get_booking_availability")
            ? "Disponibilità giorni non attiva: esegui la migrazione 0002_booking_availability.sql su Supabase."
            : msg
        );
      } finally {
        setLoading(false);
      }
    }

    if (!supabase) return;
    void loadAvailability();
  }, [availabilityFrom, availabilityTo, supabase]);

  const stationsForService = useMemo(() => {
    return stations.filter((s) => s.type === serviceType);
  }, [serviceType, stations]);

  const availabilityByStation = useMemo(() => {
    const map = new Map<string, { start: Date; end: Date }[]>();
    for (const row of availability) {
      const arr = map.get(row.station_id) ?? [];
      arr.push({ start: new Date(row.start_time), end: new Date(row.end_time) });
      map.set(row.station_id, arr);
    }
    for (const [stationId, arr] of map.entries()) {
      arr.sort((a, b) => a.start.getTime() - b.start.getTime());
      map.set(stationId, arr);
    }
    return map;
  }, [availability]);

  const daySummaries = useMemo(() => {
    const availableStations = stationsForService.filter((s) => s.status === "AVAILABLE");
    const startSlotsCount = Math.max(
      0,
      Math.floor(((dayHours.end - dayHours.start) * 60 - durationMinutes) / slotMinutes) + 1
    );

    return calendar.map((d) => {
      const key = ymd(d);
      const labelWeekday = d.toLocaleDateString("it-IT", { weekday: "short" });
      const labelMonth = d.toLocaleDateString("it-IT", { month: "short" });
      const labelDay = String(d.getDate()).padStart(2, "0");

      if (!availabilityLoaded || !availableStations.length || startSlotsCount === 0) {
        return {
          key,
          weekday: labelWeekday,
          day: labelDay,
          month: labelMonth,
          status: availabilityLoaded ? "NON_DISPONIBILE" : "SCONOSCIUTO"
        } as const;
      }

      const businessStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), dayHours.start, 0, 0, 0);
      const totalCount = availableStations.length * startSlotsCount;
      let freeCount = 0;

      for (const station of availableStations) {
        const intervals = availabilityByStation.get(station.id) ?? [];
        for (let i = 0; i < startSlotsCount; i++) {
          const start = addMinutes(businessStart, i * slotMinutes);
          const end = addMinutes(start, durationMinutes);
          const occupied = intervals.some((it) => overlaps(start, end, it.start, it.end));
          if (!occupied) freeCount += 1;
        }
      }

      const ratio = totalCount ? freeCount / totalCount : 0;
      const status =
        freeCount === 0 ? "PIENO" : ratio >= 0.55 ? "LIBERO" : ratio >= 0.2 ? "DISPONIBILE" : "QUASI_PIENO";

      return {
        key,
        weekday: labelWeekday,
        day: labelDay,
        month: labelMonth,
        status
      } as const;
    });
  }, [availabilityByStation, availabilityLoaded, calendar, durationMinutes, stationsForService]);

  if (!isConfigured) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Prenota</h2>
          <p className="text-sm leading-relaxed text-slate-200">
            Disponibilità e prenotazioni richiedono Supabase configurato in <span className="font-medium">.env.local</span>.
          </p>
        </header>

        <Card>
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Configurazione</p>
            <p className="text-lg font-semibold tracking-tight">Supabase non configurato</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <p className="text-sm font-semibold">Imposta queste variabili</p>
              <p className="mt-1 text-xs text-slate-300">NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Disponibilità</h2>
        <p className="text-sm leading-relaxed text-slate-200">
          Anteprima in tempo reale. Per confermare una prenotazione serve accedere e registrare almeno un cane.
        </p>
      </header>

      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-300">Selezione</p>
              <p className="text-lg font-semibold tracking-tight">Servizio e durata</p>
            </div>
            <Button
              variant="ghost"
              size="md"
              className="h-10 w-10 px-0"
              onClick={() => {
                if (!supabase) return;
                setLoading(true);
                setAvailabilityHint(null);
                void (async () => {
                  try {
                    const { data: stationsData } = await supabase.from("stations").select("*").order("created_at", { ascending: true });
                    setStations(stationsData ?? []);
                    const args = { p_from: availabilityFrom.toISOString(), p_to: availabilityTo.toISOString() } as Database["public"]["Functions"]["get_booking_availability"]["Args"];
                    const { data: availData } = await supabase.rpc("get_booking_availability", args);
                    setAvailability(availData ?? []);
                    setAvailabilityLoaded(true);
                  } catch (e: any) {
                    setAvailabilityLoaded(false);
                    setAvailabilityHint(e?.message ?? "Disponibilità non disponibile.");
                  } finally {
                    setLoading(false);
                  }
                })();
              }}
              aria-label="Aggiorna"
              disabled={loading}
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 overflow-hidden">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-200">Servizio</p>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as StationType)}
                className="h-12 w-full rounded-xl bg-slate-950/40 px-3 text-sm text-slate-50 ring-1 ring-inset ring-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                disabled={loading}
              >
                {Object.entries(serviceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-200">Durata</p>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="h-12 w-full rounded-xl bg-slate-950/40 px-3 text-sm text-slate-50 ring-1 ring-inset ring-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                disabled={loading}
              >
                {[15, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} minuti
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <p className="text-xs font-medium text-slate-200">Calendario</p>
              <span className="text-xs text-slate-300">Per {durationMinutes} min</span>
            </div>

            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
              {daySummaries.map((d) => {
                const dot =
                  d.status === "LIBERO"
                    ? "bg-emerald-400"
                    : d.status === "DISPONIBILE"
                      ? "bg-amber-400"
                      : d.status === "QUASI_PIENO" || d.status === "PIENO"
                        ? "bg-rose-400"
                        : "bg-slate-500";

                const base = "shrink-0 rounded-2xl px-3 py-2 text-left ring-1 ring-inset bg-slate-950/40 ring-slate-800";

                return (
                  <div key={d.key} className={base}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium text-slate-300">{d.weekday}</span>
                      <span className={`h-2 w-2 rounded-full ${dot}`} />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-base font-semibold text-slate-50">{d.day}</span>
                      <span className="text-[11px] text-slate-300">{d.month}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300">
                      {d.status === "SCONOSCIUTO"
                        ? "—"
                        : d.status === "NON_DISPONIBILE"
                          ? "N/D"
                          : d.status === "LIBERO"
                            ? "Libero"
                            : d.status === "DISPONIBILE"
                              ? "Disponibile"
                              : d.status === "QUASI_PIENO"
                                ? "Quasi pieno"
                                : "Pieno"}
                    </div>
                  </div>
                );
              })}
            </div>

            {availabilityHint ? (
              <div className="rounded-2xl bg-slate-950/40 p-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-800">
                {availabilityHint}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Prenotazione</p>
          <p className="text-lg font-semibold tracking-tight">Conferma con account</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <div className="mt-0.5 rounded-xl bg-blue-500/15 p-2 ring-1 ring-inset ring-blue-500/30">
              <Lock className="h-5 w-5 text-blue-200" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Per prenotare</p>
              <p className="text-xs text-slate-300">
                Accesso richiesto per associare la prenotazione al tuo profilo, al tuo cane e al wallet crediti.
              </p>
            </div>
          </div>

          {isLogged ? (
            <Link href="/prenota/nuova">
              <Button className="w-full" variant="primary" disabled={loading}>
                <CalendarDays className="h-5 w-5" />
                Nuova prenotazione
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button className="w-full" variant="primary" disabled={loading}>
                <CalendarDays className="h-5 w-5" />
                Accedi per prenotare
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
