"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, CheckCircle2, Clock3, Droplets, Lock, PawPrint, RefreshCw, Sparkles, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { estimateDurationForBundle, getPrimaryService, getServiceSummary, normalizeServiceBundle, serializeServiceBundle, SERVICE_LABELS, type StationType } from "@/lib/booking-planner";
import { tryCreateSupabaseBrowserClient } from "@/lib/supabase/optional";
import { safeGetSession } from "@/lib/supabase/safe-session";
import type { Database } from "@/types/database";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";

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
const dayHours = { start: 0, end: 24 };
const calendarDays = 90;
const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

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
  const [selectedFascia, setSelectedFascia] = useState<"night" | "morning" | "afternoon" | "evening">("morning");
  const [loading, setLoading] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [previewDayKey, setPreviewDayKey] = useState("");
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date(calendarStart.getFullYear(), calendarStart.getMonth(), 1));

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

  const availableDaysSet = useMemo(() => {
    return new Set(weekTimeWindows.filter((w) => w.available).map((w) => w.key));
  }, [weekTimeWindows]);

  const suggestedDayKey = useMemo(() => {
    return weekTimeWindows.find((day) => day.available)?.key ?? weekTimeWindows[0]?.key ?? ymd(calendarStart);
  }, [calendarStart, weekTimeWindows]);

  const fasciaSlots = useMemo(() => {
    const startHour = {
      night: 0,
      morning: 6,
      afternoon: 12,
      evening: 18
    }[selectedFascia];

    return Array.from({ length: 24 }, (_, i) => {
      const totalMinutes = startHour * 60 + i * 15;
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    });
  }, [selectedFascia]);

  const dayKey = previewDayKey || suggestedDayKey;

  const daySlotsInfo = useMemo(() => {
    if (!dayKey || !stationsForService.length) return [];

    const [y, m, d] = dayKey.split("-").map(Number);
    if (!y || !m || !d) return [];

    return fasciaSlots.map((timeLabel) => {
      const [sh, sm] = timeLabel.split(":").map(Number);
      const slotStart = new Date(y, m - 1, d, sh, sm, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
      const isPast = slotStart.getTime() < Date.now();

      let isAvailable = false;
      let freeStationsCount = 0;
      
      if (!isPast) {
        const freeStations = stationsForService.filter((station) => {
          const intervals = availabilityByStation.get(station.id) ?? [];
          return !intervals.some((it) => overlaps(slotStart, slotEnd, it.start, it.end));
        });
        isAvailable = freeStations.length > 0;
        freeStationsCount = freeStations.length;
      }

      const params = new URLSearchParams({
        services: serializeServiceBundle(selectedServices),
        duration: String(durationMinutes),
        day: dayKey,
        time: timeLabel
      });
      const bookingHref = `/prenota/nuova?${params.toString()}`;
      const loginHref = `/login?next=${encodeURIComponent(bookingHref)}`;

      return {
        time: timeLabel,
        isPast,
        isAvailable,
        freeStationsCount,
        bookingHref,
        loginHref
      };
    });
  }, [dayKey, fasciaSlots, durationMinutes, stationsForService, availabilityByStation, selectedServices]);

  const calendarEndKey = useMemo(() => {
    const last = calendar[calendar.length - 1] ?? calendarStart;
    return ymd(last);
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
        const msg = e?.message ?? "Disponibilità non disponibile.";
        const lower = String(msg).toLowerCase();
        setAvailabilityHint(
          msg.includes("get_booking_availability")
            ? "Disponibilità giorni non attiva: esegui la migrazione 0002_booking_availability.sql su Supabase."
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

  const selectedPreviewDay = useMemo(() => {
    return weekTimeWindows.find((day) => day.key === dayKey) ?? weekTimeWindows[0] ?? null;
  }, [dayKey, weekTimeWindows]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDay = (key: string) => {
    setPreviewDayKey(key);
  };

  const { calendarYear, calendarMonth, offset, daysInMonth } = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const tot = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const off = firstDay === 0 ? 6 : firstDay - 1;
    return {
      calendarYear: y,
      calendarMonth: m,
      offset: off,
      daysInMonth: Array.from({ length: tot }, (_, i) => i + 1)
    };
  }, [currentMonth]);

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
            Disponibilità e prenotazioni richiedono Supabase configurato in <span className="font-medium">.env.local</span>.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto pb-10">
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      <header className="space-y-2 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Calendario Disponibilità
        </h2>
        <p className="text-sm leading-relaxed text-slate-400">
          Visualizza gli orari di apertura H24 liberi o occupati ed avvia la prenotazione del tuo slot preferito.
        </p>
      </header>

      <Card className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Servizi</p>
            <p className="text-sm font-semibold text-slate-200">Scegli i trattamenti</p>
          </div>
          <Button
            variant="ghost"
            size="md"
            className="h-9 w-9 p-0 rounded-xl hover:bg-slate-800/50"
            onClick={() => void (async () => {
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
            })()}
            disabled={loading}
            aria-label="Aggiorna disponibilità"
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-300", loading && "animate-spin")} />
          </Button>
        </div>

        <div className="grid gap-2">
          {serviceOptions.map(({ value, label, subtitle, Icon }) => {
            const selected = selectedServices.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleService(value)}
                className={cn(
                  "rounded-2xl p-3 text-left ring-1 ring-inset transition-all duration-200 cursor-pointer flex w-full items-center gap-3",
                  selected
                    ? "bg-blue-500/10 ring-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.08)]"
                    : "bg-slate-950/40 ring-slate-800/80 hover:bg-slate-900/40"
                )}
              >
                <div className={cn(
                  "rounded-xl p-2.5 ring-1 ring-inset transition-colors shrink-0",
                  selected ? "bg-blue-500/20 ring-blue-400/30" : "bg-slate-900 ring-slate-850"
                )}>
                  <Icon className={cn("h-4 w-4", selected ? "text-blue-200" : "text-slate-300")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-100">{label}</p>
                    {selected && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                        Attivo
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-slate-950/50 p-3 ring-1 ring-inset ring-slate-800/80 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Tempo stimato per i servizi scelti:</p>
          <p className="text-slate-300">
            <span className="text-blue-400 font-bold">{durationMinutes} minuti</span> ({getServiceSummary(selectedServices)})
          </p>
        </div>
      </Card>

      <Card className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Data Prenotazione</p>
          <p className="text-xs text-slate-400 font-semibold">{selectedPreviewDay?.label ?? "—"}</p>
        </div>

        <div className="rounded-2xl bg-slate-950/60 p-3 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="h-7 w-7 p-0 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
              onClick={handlePrevMonth}
              disabled={currentMonth.getFullYear() === calendarStart.getFullYear() && currentMonth.getMonth() === calendarStart.getMonth()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-xs font-bold text-slate-200 capitalize tracking-wide">
              {currentMonth.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="h-7 w-7 p-0 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
              onClick={handleNextMonth}
              disabled={
                calendar[calendar.length - 1]
                  ? currentMonth.getFullYear() === calendar[calendar.length - 1]!.getFullYear() &&
                    currentMonth.getMonth() === calendar[calendar.length - 1]!.getMonth()
                  : false
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {WEEKDAYS.map((dayName) => (
              <div key={dayName}>{dayName}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: offset }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-8" />
            ))}
            {daysInMonth.map((d) => {
              const cellDate = new Date(calendarYear, calendarMonth, d);
              const cellKey = ymd(cellDate);
              
              const isBeforeStart = cellKey < ymd(calendarStart);
              const isAfterEnd = cellKey > calendarEndKey;
              const isAvailable = availableDaysSet.has(cellKey);
              const isDisabled = isBeforeStart || isAfterEnd || !isAvailable;
              const isSelected = cellKey === dayKey;
              const isToday = cellKey === ymd(new Date());

              return (
                <button
                  key={d}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(cellKey)}
                  className={cn(
                    "h-8 w-8 text-xs rounded-xl flex items-center justify-center mx-auto transition-all relative cursor-pointer",
                    isSelected
                      ? "bg-blue-600 text-slate-50 font-bold shadow-md shadow-blue-600/30 scale-105"
                      : isToday && !isDisabled
                      ? "border border-blue-500/30 text-blue-400 font-semibold hover:bg-slate-800/40"
                      : !isDisabled
                      ? "text-slate-200 hover:bg-slate-800/40"
                      : "text-slate-650 opacity-20 pointer-events-none"
                  )}
                >
                  <span className="relative flex flex-col items-center justify-center w-full h-full">
                    <span className={cn(isSelected && "translate-y-[-2px]")}>{d}</span>
                    {isAvailable && !isSelected && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl p-4 space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Orari H24 del giorno</p>
          <p className="text-sm font-semibold text-slate-200">Seleziona la fascia oraria di interesse:</p>
        </div>

        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
          {[
            { key: "night", label: "Notte", desc: "00-06" },
            { key: "morning", label: "Mattina", desc: "06-12" },
            { key: "afternoon", label: "Pome", desc: "12-18" },
            { key: "evening", label: "Sera", desc: "18-24" }
          ].map((fascia) => {
            const active = selectedFascia === fascia.key;
            return (
              <button
                key={fascia.key}
                type="button"
                onClick={() => setSelectedFascia(fascia.key as any)}
                className={cn(
                  "py-2 rounded-xl text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-200",
                  active
                    ? "bg-blue-500/15 text-blue-200 ring-1 ring-inset ring-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <span className="text-xs font-bold">{fascia.label}</span>
                <span className="text-[9px] opacity-70 mt-0.5">{fascia.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          {daySlotsInfo.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {daySlotsInfo.map((slot) => {
                if (slot.isAvailable) {
                  return (
                    <Link
                      key={slot.time}
                      href={(isLogged ? slot.bookingHref : slot.loginHref) as Route}
                      className="group block"
                    >
                      <div className="rounded-2xl p-3 text-center transition-all duration-200 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 ring-1 ring-inset ring-blue-500/20 hover:ring-blue-500/40 hover:from-blue-500/15 hover:to-cyan-500/10 cursor-pointer shadow-[0_4px_12px_rgba(59,130,246,0.05)] active:scale-98">
                        <p className="text-sm font-bold text-slate-100 group-hover:text-blue-200 transition-colors">
                          {slot.time}
                        </p>
                        <p className="text-[10px] font-medium text-emerald-400 mt-1">
                          Libero
                        </p>
                        <div className="mt-2 text-[9px] font-bold text-slate-100 uppercase tracking-wider bg-blue-600/30 rounded-lg py-1 px-2 ring-1 ring-inset ring-blue-400/30">
                          Prenota
                        </div>
                      </div>
                    </Link>
                  );
                } else {
                  return (
                    <div
                      key={slot.time}
                      className="rounded-2xl p-3 text-center bg-slate-950/40 ring-1 ring-inset ring-slate-900/60 opacity-40 select-none flex flex-col justify-between h-full min-h-[96px]"
                    >
                      <p className="text-sm font-bold text-slate-500 line-through">
                        {slot.time}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-550 mt-1">
                        {slot.isPast ? "Passato" : "Occupato"}
                      </p>
                      <div className="mt-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-900 border border-slate-800 rounded-lg py-1 px-2">
                        Non disp.
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">
              Caricamento slot orari in corso...
            </div>
          )}
        </div>
      </Card>

      {availabilityHint && (
        <div className="rounded-2xl bg-red-950/20 p-3 text-xs text-red-200 border border-red-500/20">
          {availabilityHint}
        </div>
      )}
    </div>
  );
}
