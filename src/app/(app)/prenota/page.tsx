"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, Clock3, Droplets, Lock, PawPrint, RefreshCw, Sparkles, type LucideIcon } from "lucide-react";
import { estimateDurationForBundle, getPrimaryService, getServiceSummary, normalizeServiceBundle, serializeServiceBundle, SERVICE_LABELS, type StationType } from "@/lib/booking-planner";
import { tryCreateSupabaseBrowserClient } from "@/lib/supabase/optional";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { WeekAvailabilityCalendar } from "@/components/availability/week-availability-calendar";
import type { Database } from "@/types/database";

type Station = Database["public"]["Tables"]["stations"]["Row"];
type AvailabilityRow = Database["public"]["Functions"]["get_booking_availability"]["Returns"][number];
type PublicSuggestedSlot = {
  key: string;
  stationId: string;
  stationName: string;
  start: Date;
  end: Date;
  label: string;
  availableCount: number;
};

const slotMinutes = 15;
const dayHours = { start: 8, end: 20 };
const calendarDays = 90;

const serviceOptions: { value: StationType; label: string; subtitle: string; Icon: LucideIcon }[] = [
  { value: "WASH_BASIN", label: "Lavaggio", subtitle: "Bagno completo e rapido", Icon: Sparkles },
  { value: "DRYING_ZONE", label: "Asciugatura", subtitle: "Per il pelo dopo il lavaggio", Icon: Droplets },
  { value: "GROOMING_TABLE", label: "Toelettatura", subtitle: "Per sistemare il cane con calma", Icon: PawPrint }
];

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

function hhmm(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
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
  const [selectedServices, setSelectedServices] = useState<StationType[]>(["WASH_BASIN"]);
  const [wizardStarted, setWizardStarted] = useState(false);
  const [publicStep, setPublicStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [previewDayKey, setPreviewDayKey] = useState("");
  const [selectedPreviewSlot, setSelectedPreviewSlot] = useState<PublicSuggestedSlot | null>(null);

  const primaryService = useMemo(() => getPrimaryService(selectedServices), [selectedServices]);
  const publicEstimate = useMemo(() => estimateDurationForBundle(selectedServices, null), [selectedServices]);
  const durationMinutes = publicEstimate.suggestedMinutes;

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
      const { data } = await safeGetSession(supabase);
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
        const { data: stationsData, error: stationsError } = await supabase.from("stations").select("*").order("created_at", { ascending: true });
        if (stationsError) throw stationsError;
        setStations(stationsData ?? []);

        const args = {
          p_from: availabilityFrom.toISOString(),
          p_to: availabilityTo.toISOString()
        } as Database["public"]["Functions"]["get_booking_availability"]["Args"];
        const { data: availData, error: availError } = await supabase.rpc("get_booking_availability", args);
        if (availError) throw availError;
        setAvailability(availData ?? []);
        setAvailabilityLoaded(true);
      } catch (e: any) {
        setAvailabilityLoaded(false);
        const msg = e?.message ?? "Disponibilita non disponibile.";
        const lower = String(msg).toLowerCase();
        setAvailabilityHint(
          msg.includes("get_booking_availability")
            ? "Disponibilita giorni non attiva: esegui la migrazione 0002_booking_availability.sql su Supabase."
            : lower.includes("failed to fetch") || lower.includes("fetch failed") || lower.includes("name not resolved") || lower.includes("dns")
              ? "Connessione a Supabase non riuscita. Controlla URL e chiavi del progetto e riavvia il server."
              : msg
        );
      } finally {
        setLoading(false);
      }
    }

    if (!supabase) return;
    void loadAvailability();
  }, [availabilityFrom, availabilityTo, supabase]);

  const stationsForService = useMemo(
    () => stations.filter((station) => station.type === primaryService && station.status === "AVAILABLE"),
    [primaryService, stations]
  );

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
    const startSlotsCount = Math.max(0, Math.floor(((dayHours.end - dayHours.start) * 60 - durationMinutes) / slotMinutes) + 1);

    return calendar.map((day) => {
      const key = ymd(day);
      const labelWeekday = day.toLocaleDateString("it-IT", { weekday: "short" });
      const labelMonth = day.toLocaleDateString("it-IT", { month: "short" });
      const labelDay = String(day.getDate()).padStart(2, "0");

      if (!availabilityLoaded || !stationsForService.length || startSlotsCount === 0) {
        return { key, weekday: labelWeekday, day: labelDay, month: labelMonth, status: availabilityLoaded ? "NON_DISPONIBILE" : "SCONOSCIUTO" } as const;
      }

      const businessStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), dayHours.start, 0, 0, 0);
      const totalCount = stationsForService.length * startSlotsCount;
      let freeCount = 0;

      for (const station of stationsForService) {
        const intervals = availabilityByStation.get(station.id) ?? [];
        for (let i = 0; i < startSlotsCount; i++) {
          const start = addMinutes(businessStart, i * slotMinutes);
          const end = addMinutes(start, durationMinutes);
          const occupied = intervals.some((it) => overlaps(start, end, it.start, it.end));
          if (!occupied) freeCount += 1;
        }
      }

      const ratio = totalCount ? freeCount / totalCount : 0;
      const status = freeCount === 0 ? "PIENO" : ratio >= 0.55 ? "LIBERO" : ratio >= 0.2 ? "DISPONIBILE" : "QUASI_PIENO";
      return { key, weekday: labelWeekday, day: labelDay, month: labelMonth, status } as const;
    });
  }, [availabilityByStation, availabilityLoaded, calendar, durationMinutes, stationsForService]);

  const weekTimeWindows = useMemo(() => {
    const startSlotsCount = Math.max(0, Math.floor(((dayHours.end - dayHours.start) * 60 - durationMinutes) / slotMinutes) + 1);

    return calendar.map((day) => {
      const key = ymd(day);
      const label = day.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "short" });
      const businessStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), dayHours.start, 0, 0, 0);

      if (!availabilityLoaded || !stationsForService.length || startSlotsCount === 0) {
        return { key, label, ranges: [] as { from: string; to: string }[], available: false };
      }

      const ranges: { from: string; to: string }[] = [];
      for (let i = 0; i < startSlotsCount; i++) {
        const start = addMinutes(businessStart, i * slotMinutes);
        const end = addMinutes(start, durationMinutes);
        const anyFree = stationsForService.some((station) => {
          const intervals = availabilityByStation.get(station.id) ?? [];
          return !intervals.some((it) => overlaps(start, end, it.start, it.end));
        });
        if (anyFree) {
          ranges.push({ from: hhmm(start), to: hhmm(end) });
        }
      }

      return { key, label, ranges, available: ranges.length > 0 };
    });
  }, [availabilityByStation, availabilityLoaded, calendar, durationMinutes, stationsForService]);

  const suggestedDayKey = useMemo(() => {
    return weekTimeWindows.find((day) => day.available)?.key ?? daySummaries[0]?.key ?? ymd(calendarStart);
  }, [calendarStart, daySummaries, weekTimeWindows]);

  useEffect(() => {
    if (!previewDayKey || !weekTimeWindows.some((item) => item.key === previewDayKey)) {
      setPreviewDayKey(suggestedDayKey);
    }
  }, [previewDayKey, suggestedDayKey, weekTimeWindows]);

  const selectedPreviewDay = useMemo(() => {
    return weekTimeWindows.find((day) => day.key === previewDayKey) ?? weekTimeWindows[0] ?? null;
  }, [previewDayKey, weekTimeWindows]);

  const publicSuggestedSlots = useMemo(() => {
    const results: PublicSuggestedSlot[] = [];
    if (!selectedPreviewDay || !stationsForService.length) return results;

    const selectedDate = startOfLocalDay(new Date(`${selectedPreviewDay.key}T00:00:00`));
    const businessStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), dayHours.start, 0, 0, 0);
    const startSlotsCount = Math.max(0, Math.floor(((dayHours.end - dayHours.start) * 60 - durationMinutes) / slotMinutes) + 1);

    for (let i = 0; i < startSlotsCount; i++) {
      const start = addMinutes(businessStart, i * slotMinutes);
      const end = addMinutes(start, durationMinutes);
      const freeStations = stationsForService.filter((station) => {
        const intervals = availabilityByStation.get(station.id) ?? [];
        return !intervals.some((it) => overlaps(start, end, it.start, it.end));
      });
      if (!freeStations.length) continue;

      const first = freeStations[0];
      if (!first) continue;
      results.push({
        key: `${selectedPreviewDay.key}-${first.id}-${start.toISOString()}`,
        stationId: first.id,
        stationName: first.name,
        start,
        end,
        label: hhmm(start),
        availableCount: freeStations.length
      });
    }

    return results;
  }, [availabilityByStation, durationMinutes, selectedPreviewDay, stationsForService]);

  useEffect(() => {
    setSelectedPreviewSlot((current) => {
      if (!current) return publicSuggestedSlots[0] ?? null;
      return publicSuggestedSlots.find((slot) => slot.key === current.key) ?? publicSuggestedSlots[0] ?? null;
    });
  }, [publicSuggestedSlots]);

  const bookingIntentHref = useMemo(() => {
    const params = new URLSearchParams({
      services: serializeServiceBundle(selectedServices),
      duration: String(durationMinutes),
      day: previewDayKey || suggestedDayKey
    });
    if (selectedPreviewSlot) {
      params.set("time", selectedPreviewSlot.label);
    }
    return `/prenota/nuova?${params.toString()}`;
  }, [durationMinutes, previewDayKey, selectedPreviewSlot, selectedServices, suggestedDayKey]);

  const loginIntentHref = useMemo(() => {
    const params = new URLSearchParams({ next: bookingIntentHref });
    return `/login?${params.toString()}`;
  }, [bookingIntentHref]);

  const weekSummary = useMemo(() => {
    if (!availabilityLoaded) return "Carichiamo i giorni liberi in tempo reale.";
    const availableDays = weekTimeWindows.filter((day) => day.available).length;
    if (!availableDays) return "Nessuna disponibilita nei prossimi giorni visibili.";
    return `${availableDays} ${availableDays === 1 ? "giorno libero" : "giorni liberi"} nel calendario disponibile.`;
  }, [availabilityLoaded, weekTimeWindows]);

  const calendarWindowStart = useMemo(() => {
    const key = previewDayKey || suggestedDayKey || ymd(calendarStart);
    return startOfLocalDay(new Date(`${key}T00:00:00`));
  }, [calendarStart, previewDayKey, suggestedDayKey]);

  function toggleService(service: StationType) {
    setSelectedServices((current) => {
      if (current.includes(service)) {
        const next = current.filter((item) => item !== service);
        return next.length ? normalizeServiceBundle(next) : current;
      }
      return normalizeServiceBundle([...current, service]);
    });
  }

  if (!isConfigured) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Prenota</h2>
          <p className="text-sm leading-relaxed text-slate-200">
            Disponibilita e prenotazioni richiedono Supabase configurato in <span className="font-medium">.env.local</span>.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Prenota senza confusione</h2>
        <p className="text-sm leading-relaxed text-slate-200">
          Seleziona i servizi che ti servono, guarda i giorni disponibili e poi accedi per completare la prenotazione con il tuo cane.
        </p>
      </header>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Come funziona</p>
          <p className="text-lg font-semibold tracking-tight">Un percorso guidato, un passo alla volta</p>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-sm font-semibold text-slate-50">1. Scegli uno o piu servizi</p>
            <p className="mt-1 text-sm text-slate-300">Ad esempio lavaggio + asciugatura nella stessa prenotazione guidata.</p>
          </div>
          <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-sm font-semibold text-slate-50">2. Guarda i giorni liberi</p>
            <p className="mt-1 text-sm text-slate-300">Ti mostriamo gli orari in base al servizio principale e al tempo stimato.</p>
          </div>
          <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-sm font-semibold text-slate-50">3. {isLogged ? "Conferma e continua" : "Accedi e conferma"}</p>
            <p className="mt-1 text-sm text-slate-300">
              {isLogged
                ? "Sei gia dentro: ti accompagniamo direttamente all'ultimo passaggio della prenotazione."
                : "Dopo il login adattiamo il tempo al tuo cane e completiamo la prenotazione."}
            </p>
          </div>

          <Button className="w-full" variant="primary" onClick={() => { setWizardStarted(true); setPublicStep(1); }}>
            <CalendarDays className="h-5 w-5" />
            PRENOTA
          </Button>
        </CardContent>
      </Card>

      {wizardStarted ? (
        <>
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-300">Step 1</p>
                  <p className="text-lg font-semibold tracking-tight">Quali servizi vuoi fare?</p>
                </div>
                <Button variant="ghost" size="md" className="h-10 w-10 px-0" onClick={() => void (async () => {
                  if (!supabase) return;
                  setLoading(true);
                  try {
                    const { data: stationsData } = await supabase.from("stations").select("*").order("created_at", { ascending: true });
                    setStations(stationsData ?? []);
                    const args = { p_from: availabilityFrom.toISOString(), p_to: availabilityTo.toISOString() } as Database["public"]["Functions"]["get_booking_availability"]["Args"];
                    const { data: availData } = await supabase.rpc("get_booking_availability", args);
                    setAvailability(availData ?? []);
                    setAvailabilityLoaded(true);
                  } finally {
                    setLoading(false);
                  }
                })()} disabled={loading}>
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {serviceOptions.map(({ value, label, subtitle, Icon }) => {
                  const selected = selectedServices.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleService(value)}
                      className={
                        "rounded-3xl p-4 text-left ring-1 ring-inset transition-colors " +
                        (selected ? "bg-blue-500/15 ring-blue-500/30" : "bg-slate-950/40 ring-slate-800 hover:bg-slate-950/50")
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-slate-900 p-3 ring-1 ring-inset ring-slate-800">
                          <Icon className="h-5 w-5 text-slate-100" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-base font-semibold text-slate-50">{label}</p>
                            {selected ? (
                              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-inset ring-emerald-500/30">
                                Selezionato
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                <p className="text-sm font-semibold text-slate-50">Hai scelto</p>
                <p className="mt-1 text-sm text-slate-300">{getServiceSummary(selectedServices)}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Tempo stimato iniziale: {durationMinutes} minuti. Dopo il login lo adattiamo al cane in base a taglia e peso.
                </p>
              </div>

              <Button className="w-full" variant="primary" onClick={() => setPublicStep(2)}>
                Continua con giorno e orario
              </Button>
            </CardContent>
          </Card>

          {publicStep >= 2 ? (
            <Card>
              <CardHeader className="space-y-1">
                <p className="text-xs font-medium text-slate-300">Step 2</p>
                <p className="text-lg font-semibold tracking-tight">Scegli il giorno</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs leading-relaxed text-slate-300">{weekSummary}</p>

                <WeekAvailabilityCalendar
                  startDay={calendarWindowStart}
                  stations={stationsForService.map((s) => ({ id: s.id, name: s.name }))}
                  availability={availability}
                  slotMinutes={slotMinutes}
                  durationMinutes={durationMinutes}
                  hours={dayHours}
                  selected={previewDayKey ? { dayKey: previewDayKey, label: selectedPreviewSlot?.label ?? "" } : null}
                  onSelect={(cell) => {
                    if (!cell.availableCount) return;
                    setPreviewDayKey(cell.dayKey);
                    setSelectedPreviewSlot({
                      key: `${cell.dayKey}-${cell.stationId}-${cell.start.toISOString()}`,
                      stationId: cell.stationId,
                      stationName: cell.stationName || "Postazione",
                      start: cell.start,
                      end: cell.end,
                      label: cell.label,
                      availableCount: cell.availableCount
                    });
                  }}
                  onPrevWeek={() => {
                    const prev = addDays(calendarWindowStart, -7);
                    if (prev < calendarStart) {
                      setPreviewDayKey(ymd(calendarStart));
                      return;
                    }
                    setPreviewDayKey(ymd(prev));
                  }}
                  onNextWeek={() => {
                    const next = addDays(calendarWindowStart, 7);
                    const last = calendar[calendar.length - 1] ?? calendarStart;
                    const lastKey = ymd(last);
                    const nextKey = ymd(next);
                    setPreviewDayKey(nextKey > lastKey ? lastKey : nextKey);
                  }}
                />

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {daySummaries.map((day) => {
                    const selected = day.key === selectedPreviewDay?.key;
                    const dot =
                      day.status === "LIBERO" ? "bg-emerald-400" :
                      day.status === "DISPONIBILE" ? "bg-amber-400" :
                      day.status === "QUASI_PIENO" || day.status === "PIENO" ? "bg-rose-400" :
                      "bg-slate-500";

                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => setPreviewDayKey(day.key)}
                        className={
                          "shrink-0 rounded-2xl px-3 py-3 text-left ring-1 ring-inset transition-colors " +
                          (selected ? "bg-blue-500/15 ring-blue-500/30" : "bg-slate-950/40 ring-slate-800 hover:bg-slate-950/50")
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-medium text-slate-300">{day.weekday}</span>
                          <span className={`h-2 w-2 rounded-full ${dot}`} />
                        </div>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-base font-semibold text-slate-50">{day.day}</span>
                          <span className="text-[11px] text-slate-300">{day.month}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {availabilityHint ? (
                  <div className="rounded-2xl bg-slate-950/40 p-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-800">
                    {availabilityHint}
                  </div>
                ) : null}

                <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-50">{selectedPreviewDay?.label ?? "Orari del giorno"}</p>
                      <p className="text-xs text-slate-300">Servizio principale: {SERVICE_LABELS[primaryService]}</p>
                    </div>
                    <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-inset ring-emerald-500/30">
                      {selectedPreviewDay?.available ? "Disponibile" : "N/D"}
                    </div>
                  </div>

                  {publicSuggestedSlots.length ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {publicSuggestedSlots.slice(0, 12).map((slot) => {
                        const selected = selectedPreviewSlot?.key === slot.key;
                        return (
                          <button
                            key={slot.key}
                            type="button"
                            onClick={() => setSelectedPreviewSlot(slot)}
                            className={
                              "rounded-2xl px-3 py-3 text-left ring-1 ring-inset transition-colors " +
                              (selected ? "bg-blue-500/15 ring-blue-500/30" : "bg-slate-900 ring-slate-800 hover:bg-slate-900/80")
                            }
                          >
                            <p className="text-sm font-semibold text-slate-50">{slot.label}</p>
                            <p className="mt-1 text-[11px] text-slate-300">
                              {slot.availableCount > 1 ? `${slot.availableCount} postazioni libere` : slot.stationName}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-300">Per questo giorno non ci sono orari disponibili.</p>
                  )}
                </div>

                <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-slate-200" />
                    <div>
                      <p className="text-sm font-semibold text-slate-50">Scelta attuale</p>
                      <p className="text-xs text-slate-300">
                        {selectedPreviewDay?.label ?? "Giorno"} · {selectedPreviewSlot?.label ?? "Seleziona un orario"}
                      </p>
                    </div>
                  </div>
                </div>

                <Button className="w-full" variant="primary" onClick={() => setPublicStep(3)} disabled={!selectedPreviewSlot}>
                  Continua alla conferma
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {publicStep >= 3 ? (
            <Card>
              <CardHeader className="space-y-1">
                <p className="text-xs font-medium text-slate-300">Step 3</p>
                <p className="text-lg font-semibold tracking-tight">{isLogged ? "Conferma e continua" : "Accedi e conferma"}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                  <div className="mt-0.5 rounded-xl bg-blue-500/15 p-2 ring-1 ring-inset ring-blue-500/30">
                    <Lock className="h-5 w-5 text-blue-200" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Scelte pronte</p>
                    <p className="text-xs text-slate-300">
                      {getServiceSummary(selectedServices)} · {durationMinutes} min stimati · {selectedPreviewDay?.label ?? "giorno da definire"} · {selectedPreviewSlot?.label ?? "orario da definire"}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                    <div>
                      <p className="text-sm font-semibold text-slate-50">
                        {isLogged ? "Ultimo passaggio pronto" : "Dopo il login facciamo l’ultimo passo"}
                      </p>
                      <p className="text-xs text-slate-300">
                        {isLogged
                          ? "Portiamo le tue scelte nella prenotazione guidata e completiamo la conferma."
                          : "Ti facciamo scegliere il cane e ti suggeriamo il tempo piu adatto in base alla sua taglia e al suo peso."}
                      </p>
                    </div>
                  </div>
                </div>

                {isLogged ? (
                  <Link href={bookingIntentHref as Route}>
                    <Button className="w-full" variant="primary" disabled={loading}>
                      <CalendarDays className="h-5 w-5" />
                      Continua prenotazione
                    </Button>
                  </Link>
                ) : (
                  <Link href={loginIntentHref as Route}>
                    <Button className="w-full" variant="primary" disabled={loading}>
                      <CalendarDays className="h-5 w-5" />
                      Accedi per prenotare
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
