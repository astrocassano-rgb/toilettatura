"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Clock, Lock, Plus, RefreshCw } from "lucide-react";
import { getPrimaryService, parseServiceBundle } from "@/lib/booking-planner";
import { tryCreateSupabaseBrowserClient } from "@/lib/supabase/optional";
import type { Database } from "@/types/database";

type Station = Database["public"]["Tables"]["stations"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type AvailabilityRow = Database["public"]["Functions"]["get_booking_availability"]["Returns"][number];
type StationType = Database["public"]["Enums"]["station_type"];

const slotMinutes = 15;
const dayHours = { start: 0, end: 24 };
const calendarDays = 90;

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

function toIso(d: Date) {
  return d.toISOString();
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hhmm(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function isValidLocalDateParts(day: number, month: number, year: number) {
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function pad2(value: string) {
  return value.padStart(2, "0");
}

export default function PrenotaColonneClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialServiceType = useMemo(() => {
    return getPrimaryService(parseServiceBundle(searchParams?.get("services") ?? searchParams?.get("service")));
  }, [searchParams]);
  const initialDuration = useMemo(() => {
    const value = Number(searchParams?.get("duration"));
    return [15, 30, 45, 60].includes(value) ? value : 30;
  }, [searchParams]);
  const initialDay = useMemo(() => {
    const value = searchParams?.get("day");
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return startOfLocalDay(new Date());
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? startOfLocalDay(new Date()) : startOfLocalDay(parsed);
  }, [searchParams]);

  const calendarStart = useMemo(() => startOfLocalDay(new Date()), []);
  const calendar = useMemo(() => Array.from({ length: calendarDays }, (_, i) => addDays(calendarStart, i)), [calendarStart]);

  const [day, setDay] = useState<Date>(initialDay);
  const [stations, setStations] = useState<Station[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dogs, setDogs] = useState<Database["public"]["Tables"]["dogs"]["Row"][]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [availabilityHint, setAvailabilityHint] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<StationType | "">(initialServiceType);
  const [selectedDogId, setSelectedDogId] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(initialDuration);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dayPart, setDayPart] = useState("");
  const [monthPart, setMonthPart] = useState("");
  const [yearPart, setYearPart] = useState("");
  const [showCalendarCard, setShowCalendarCard] = useState(false);

  const supabase = useMemo(() => tryCreateSupabaseBrowserClient(), []);

  useEffect(() => {
    async function loadDogs() {
      if (!supabase) return;
      const { data } = await supabase.from("dogs").select("*").order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setDogs(data);
        if (!selectedDogId && data[0]?.id) setSelectedDogId(data[0].id);
      }
    }
    void loadDogs();
  }, [supabase, selectedDogId]);

  useEffect(() => {
    if (serviceType) return;
    const first = stations[0]?.type;
    if (first) setServiceType(first);
  }, [stations, serviceType]);

  useEffect(() => {
    setDay(initialDay);
    setDurationMinutes(initialDuration);
    if (initialServiceType) setServiceType(initialServiceType);
  }, [initialDay, initialDuration, initialServiceType]);

  const calendarStartKey = useMemo(() => ymd(calendarStart), [calendarStart]);
  const calendarEndKey = useMemo(() => {
    const last = calendar[calendar.length - 1] ?? calendarStart;
    return ymd(last);
  }, [calendar, calendarStart]);

  useEffect(() => {
    setDayPart(String(day.getDate()).padStart(2, "0"));
    setMonthPart(String(day.getMonth() + 1).padStart(2, "0"));
    setYearPart(String(day.getFullYear()));
  }, [day]);

  const dayStart = useMemo(() => new Date(day.getFullYear(), day.getMonth(), day.getDate(), dayHours.start, 0, 0, 0), [
    day
  ]);
  const dayEnd = useMemo(() => new Date(day.getFullYear(), day.getMonth(), day.getDate(), dayHours.end, 0, 0, 0), [day]);

  const availabilityFrom = useMemo(
    () => new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate(), dayHours.start, 0, 0, 0),
    [calendarStart]
  );
  const availabilityTo = useMemo(() => {
    const last = calendar[calendar.length - 1] ?? calendarStart;
    return new Date(last.getFullYear(), last.getMonth(), last.getDate(), dayHours.end, 0, 0, 0);
  }, [calendar, calendarStart]);

  const slots = useMemo(() => {
    const out: { start: Date; end: Date; label: string }[] = [];
    let cursor = new Date(dayStart);
    while (cursor < dayEnd) {
      const end = addMinutes(cursor, slotMinutes);
      out.push({ start: cursor, end, label: hhmm(cursor) });
      cursor = end;
    }
    return out;
  }, [dayStart, dayEnd]);

  const isConfigured = Boolean(supabase);

  const loadStations = async () => {
    if (!supabase) return;
    try {
      const { data: stationsData, error: stationsErr } = await supabase
        .from("stations")
        .select("*")
        .order("created_at", { ascending: true });
      if (stationsErr) throw stationsErr;
      setStations(stationsData ?? []);
    } catch (e: any) {
      setMessage(e?.message ?? "Errore caricamento postazioni.");
    }
  };

  const loadBookingsForDay = async () => {
    if (!supabase) return;
    try {
      const { data: bookingsData, error: bookingsErr } = await supabase
        .from("bookings")
        .select("*")
        .gte("start_time", toIso(dayStart))
        .lt("start_time", toIso(dayEnd))
        .in("status", ["PENDING", "CONFIRMED"]);
      if (bookingsErr) throw bookingsErr;
      setBookings(bookingsData ?? []);
    } catch (e: any) {
      setMessage(e?.message ?? "Errore caricamento prenotazioni.");
    }
  };

  const loadAvailability = async () => {
    if (!supabase) return;
    setAvailabilityHint(null);
    try {
      const args = {
        p_from: toIso(availabilityFrom),
        p_to: toIso(availabilityTo)
      } as Database["public"]["Functions"]["get_booking_availability"]["Args"];

      const { data, error } = await supabase.rpc("get_booking_availability", args);
      if (error) throw error;
      setAvailability(data ?? []);
      setAvailabilityLoaded(true);
    } catch (e: any) {
      setAvailability([]);
      setAvailabilityLoaded(false);
      const msg = e?.message ?? "Disponibilità giorni non disponibile.";
      setAvailabilityHint(
        msg.includes("get_booking_availability")
          ? "Disponibilità giorni non attiva: esegui la migrazione 0002_booking_availability.sql su Supabase."
          : msg
      );
    }
  };

  const loadAll = async () => {
    if (!supabase) return;
    setLoading(true);
    setMessage(null);
    try {
      await Promise.all([loadStations(), loadAvailability(), loadBookingsForDay()]);
    } catch (e: any) {
      setMessage(e?.message ?? "Errore caricamento dati.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    setLoading(true);
    setMessage(null);
    void loadBookingsForDay().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, dayStart.getTime(), dayEnd.getTime()]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("bookings-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          void loadAll();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const createBooking = async (stationId: string, start: Date) => {
    if (!supabase) return;
    if (!selectedDogId) {
      setMessage("Seleziona un cane prima di prenotare.");
      return;
    }

    const end = addMinutes(start, durationMinutes);
    setLoading(true);
    setMessage(null);
    try {
      const args = {
        p_station_id: stationId,
        p_dog_id: selectedDogId,
        p_start_time: toIso(start),
        p_end_time: toIso(end)
      } as Database["public"]["Functions"]["create_booking"]["Args"];

      const { data, error } = await supabase.rpc("create_booking", args);
      if (error) throw error;
      const first = data?.[0];
      setMessage(
        first
          ? `Prenotazione confermata. Costo: ${first.total_credits} crediti.`
          : "Prenotazione confermata."
      );
      await loadAll();
    } catch (e: any) {
      setMessage(e?.message ?? "Errore durante la prenotazione.");
    } finally {
      setLoading(false);
    }
  };

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

  const isSlotOccupied = (stationId: string, slotStart: Date, slotEnd: Date) => {
    return bookings.some((b) => {
      if (b.station_id !== stationId) return false;
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return overlaps(slotStart, slotEnd, bStart, bEnd);
    });
  };

  const stationsForService = useMemo(() => {
    if (!serviceType) return stations;
    return stations.filter((s) => s.type === serviceType);
  }, [serviceType, stations]);

  const selectedDayKey = useMemo(() => ymd(day), [day]);

  const dayLabel = useMemo(() => {
    const d = new Date(day);
    return d.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" });
  }, [day]);

  if (!isConfigured) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Nuova prenotazione</h2>
          <p className="text-sm leading-relaxed text-slate-200">
            Per usare la prenotazione reale serve collegare Supabase in <span className="font-medium">.env.local</span>.
          </p>
        </header>

        <Card>
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Configurazione mancante</p>
            <p className="text-lg font-semibold tracking-tight">Supabase non configurato</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <p className="text-sm font-semibold">Imposta queste variabili</p>
              <p className="mt-1 text-xs text-slate-300">
                NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-blue-500/15 p-2 ring-1 ring-inset ring-blue-500/30">
                  <Lock className="h-5 w-5 text-blue-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Motore prenotazioni</p>
                  <p className="mt-1 text-xs text-slate-300">
                    Le RPC create_booking/cancel_booking vivono su Postgres e garantiscono coerenza + anti-overlap.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Nuova prenotazione</h2>
        <p className="text-sm leading-relaxed text-slate-200">
          {dayLabel}. Seleziona un cane, la durata e poi tocca uno slot libero nella colonna della postazione.
        </p>
      </header>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Controlli</p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-semibold tracking-tight">Calendario a colonne</p>
            <Button variant="ghost" size="md" className="h-10 w-10 px-0" onClick={loadAll} aria-label="Aggiorna">
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 overflow-hidden">
          {message ? (
            <div className="rounded-2xl bg-slate-950/40 p-3 text-sm text-slate-200 ring-1 ring-inset ring-slate-800">
              {message}
            </div>
          ) : null}

          <div className="grid min-w-0 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-200">Servizio</p>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as StationType)}
                  className="h-12 w-full rounded-xl bg-slate-950/40 px-3 text-sm text-slate-50 ring-1 ring-inset ring-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
                >
                  {[15, 30, 45, 60].map((m) => (
                    <option key={m} value={m}>
                      {m} minuti
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-200">Cane</p>
              {dogs.length ? (
                <select
                  value={selectedDogId}
                  onChange={(e) => setSelectedDogId(e.target.value)}
                  className="h-12 w-full rounded-xl bg-slate-950/40 px-3 text-sm text-slate-50 ring-1 ring-inset ring-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {dogs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Button variant="secondary" className="w-full" onClick={() => router.push("/cani/nuovo")}>
                  <Plus className="h-5 w-5" />
                  Aggiungi cane
                </Button>
              )}
            </div>

            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <p className="text-xs font-medium text-slate-200">Disponibilità</p>
                <span className="text-xs text-slate-300">Per {durationMinutes} min</span>
              </div>

              <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                <p className="text-sm font-semibold text-slate-50">Data</p>
                <p className="mt-1 text-xs text-slate-300">GG / MM / AAAA oppure calendario.</p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Input
                    inputMode="numeric"
                    placeholder="GG"
                    maxLength={2}
                    value={dayPart}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setDayPart(value);
                      const d = Number(value);
                      const m = Number(monthPart);
                      const y = Number(yearPart);
                      if (!isValidLocalDateParts(d, m, y)) return;
                      const key = `${y}-${pad2(String(m))}-${pad2(String(d))}`;
                      if (key < calendarStartKey || key > calendarEndKey) return;
                      setDay(startOfLocalDay(new Date(`${key}T00:00:00`)));
                    }}
                  />
                  <Input
                    inputMode="numeric"
                    placeholder="MM"
                    maxLength={2}
                    value={monthPart}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setMonthPart(value);
                      const d = Number(dayPart);
                      const m = Number(value);
                      const y = Number(yearPart);
                      if (!isValidLocalDateParts(d, m, y)) return;
                      const key = `${y}-${pad2(String(m))}-${pad2(String(d))}`;
                      if (key < calendarStartKey || key > calendarEndKey) return;
                      setDay(startOfLocalDay(new Date(`${key}T00:00:00`)));
                    }}
                  />
                  <Input
                    inputMode="numeric"
                    placeholder="AAAA"
                    maxLength={4}
                    value={yearPart}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setYearPart(value);
                      const d = Number(dayPart);
                      const m = Number(monthPart);
                      const y = Number(value);
                      if (!isValidLocalDateParts(d, m, y)) return;
                      const key = `${y}-${pad2(String(m))}-${pad2(String(d))}`;
                      if (key < calendarStartKey || key > calendarEndKey) return;
                      setDay(startOfLocalDay(new Date(`${key}T00:00:00`)));
                    }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowCalendarCard((v) => !v)}>
                    {showCalendarCard ? "Chiudi calendario" : "Apri calendario"}
                  </Button>
                  <div className="text-xs text-slate-300">{dayLabel}</div>
                </div>

                {showCalendarCard ? (
                  <div className="mt-3 rounded-2xl bg-slate-900/40 p-3 ring-1 ring-inset ring-slate-800">
                    <p className="text-xs font-medium text-slate-200">Calendario</p>
                    <div className="mt-2">
                      <Input
                        type="date"
                        min={calendarStartKey}
                        max={calendarEndKey}
                        value={selectedDayKey}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!value) return;
                          setDay(startOfLocalDay(new Date(`${value}T00:00:00`)));
                          setShowCalendarCard(false);
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              {availabilityHint ? (
                <div className="rounded-2xl bg-slate-950/40 p-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-800">
                  {availabilityHint}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/40 p-3 ring-1 ring-inset ring-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-300" />
                <p className="text-sm font-semibold">Orari</p>
              </div>
              <p className="text-xs text-slate-300">
                Slot da {slotMinutes} min · {dayHours.start}:00–{dayHours.end}:00
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Postazioni · {serviceType ? serviceLabels[serviceType] : "Tutte"}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Lock className="h-4 w-4" />
            <span>Anti-overlap DB</span>
          </div>
        </div>

        {stationsForService.length ? (
          <div className="grid gap-3">
            {stationsForService.map((s) => (
              <Card key={s.id} className="overflow-hidden">
                <CardHeader className="space-y-1">
                  <p className="text-xs font-medium text-slate-300">{s.type}</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold tracking-tight">{s.name}</p>
                    <span
                      className={
                        s.status === "AVAILABLE"
                          ? "rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-200 ring-1 ring-inset ring-emerald-500/30"
                          : "rounded-full bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-200 ring-1 ring-inset ring-amber-500/30"
                      }
                    >
                      {s.status === "AVAILABLE" ? "Disponibile" : s.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {slots.map((slot) => {
                      const occupied = isSlotOccupied(s.id, slot.start, slot.end);
                      const disabled = loading || s.status !== "AVAILABLE" || occupied || !dogs.length;
                      return (
                        <button
                          key={`${s.id}-${slot.label}`}
                          disabled={disabled}
                          onClick={() => createBooking(s.id, slot.start)}
                          className={
                            "h-11 shrink-0 rounded-xl px-4 text-sm font-medium ring-1 ring-inset transition-colors " +
                            (occupied
                              ? "bg-slate-950/40 text-slate-500 ring-slate-900"
                              : disabled
                                ? "bg-slate-950/40 text-slate-500 ring-slate-800"
                                : "bg-blue-500/15 text-blue-100 ring-blue-500/30 hover:bg-blue-500/20")
                          }
                          title={occupied ? "Occupato" : "Prenota"}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>
                      {s.cost_per_minute} crediti/min
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      <span>Tap su slot libero</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-semibold">Nessuna postazione trovata</p>
              <p className="mt-1 text-xs text-slate-300">
                Inserisci righe in stations su Supabase (oppure seed). Poi ricarica.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
