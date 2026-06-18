"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { format, parseISO, startOfDay, addMinutes, isSameDay, differenceInMinutes, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { PawPrint, Sparkles, AlertTriangle, Search, Plus, Calendar as CalendarIcon, Clock, User, Scissors, X, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { createAdminBooking } from "@/app/(admin)/admin/prenotazioni/actions";
import { useRouter } from "next/navigation";

type Booking = {
  id: string;
  station_id: string;
  start_time: string;
  end_time: string;
  service_type: string;
  status: string;
  customer_id: string;
  dog_id: string;
  total_credits: number;
};

type Station = {
  id: string;
  name: string;
  type: string;
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type Dog = {
  id: string;
  name: string;
  customer_id: string;
};

interface SmartAgendaProps {
  bookings: Booking[];
  stations: Station[];
  dogNames: Record<string, string>;
  customerNames: Record<string, string>;
  allDogs: Dog[];
  allProfiles: Profile[];
  maxConcurrentAssisted: number;
  selectedDateStr: string;
}

const SLOT_MINUTES = 30;

export function SmartAgenda({
  bookings,
  stations,
  dogNames,
  customerNames,
  allDogs,
  allProfiles,
  maxConcurrentAssisted,
  selectedDateStr,
}: SmartAgendaProps) {
  const router = useRouter();
  const gridContainerRef = useRef<HTMLDivElement>(null);
  
  // Normalize selected date
  const selectedDate = useMemo(() => {
    if (!selectedDateStr) return new Date();
    return parseISO(selectedDateStr.includes("T") ? selectedDateStr : `${selectedDateStr}T12:00:00`);
  }, [selectedDateStr]);

  const [selectedSlot, setSelectedSlot] = useState<{ stationId: string; time: Date } | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isPending, setIsPending] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Modal form states
  const [modalDate, setModalDate] = useState<string>("");
  const [modalTime, setModalTime] = useState<string>("");
  const [modalDuration, setModalDuration] = useState<number>(30);

  // Update current time indicator every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Initialize modal states when a slot is clicked
  useEffect(() => {
    if (selectedSlot) {
      setModalDate(format(selectedSlot.time, "yyyy-MM-dd"));
      setModalTime(format(selectedSlot.time, "HH:mm"));
      setModalDuration(30);
    }
  }, [selectedSlot]);

  const customerDogs = useMemo(() => {
    return allDogs.filter(d => d.customer_id === selectedCustomerId);
  }, [allDogs, selectedCustomerId]);

  async function handleCreate(formData: FormData) {
    try {
      setIsPending(true);
      
      const startDateTime = new Date(`${modalDate}T${modalTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + modalDuration * 60000);
      
      formData.set("start_time", startDateTime.toISOString());
      formData.set("end_time", endDateTime.toISOString());

      await createAdminBooking(formData);
      setSelectedSlot(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsPending(false);
    }
  }

  // Filter bookings for selected day
  const dailyBookings = useMemo(() => {
    return bookings.filter(b => {
      const bDate = parseISO(b.start_time);
      return isSameDay(bDate, selectedDate) && b.status !== 'CANCELLED';
    });
  }, [bookings, selectedDate]);

  // Dynamically compute START and END hours for the day to avoid empty grid space
  const { startHour, endHour } = useMemo(() => {
    if (dailyBookings.length === 0) {
      return { startHour: 8, endHour: 19 }; // Compact default
    }
    
    let minHour = 8;
    let maxHour = 19;

    dailyBookings.forEach((b) => {
      const start = parseISO(b.start_time).getHours();
      const end = parseISO(b.end_time).getHours() + 1;
      if (start < minHour) minHour = start;
      if (end > maxHour) maxHour = end;
    });

    const finalStart = Math.max(0, minHour - 1);
    const finalEnd = Math.min(24, maxHour + 1);

    return { startHour: finalStart, endHour: finalEnd };
  }, [dailyBookings]);

  // Calculate total slots based on dynamic hours
  const totalMinutes = (endHour - startHour) * 60;
  const numSlots = totalMinutes / SLOT_MINUTES;

  // Calculate operator/groomer load per slot
  const groomerLoad = useMemo(() => {
    const load = new Array(numSlots).fill(0);
    const baseDate = new Date(selectedDate);
    baseDate.setHours(startHour, 0, 0, 0);

    dailyBookings.forEach(b => {
      if (b.service_type === "ASSISTED_WASH" || b.service_type === "FULL_GROOMING") {
        const start = parseISO(b.start_time);
        const end = parseISO(b.end_time);
        
        for (let i = 0; i < numSlots; i++) {
          const slotStart = addMinutes(baseDate, i * SLOT_MINUTES);
          const slotEnd = addMinutes(slotStart, SLOT_MINUTES);
          
          if (start < slotEnd && end > slotStart) {
            load[i]++;
          }
        }
      }
    });
    return load;
  }, [dailyBookings, numSlots, selectedDate, startHour]);

  // Generate date carousel strip (5 days before, selected, 5 days after)
  const dateStrip = useMemo(() => {
    const dates = [];
    for (let i = -5; i <= 5; i++) {
      dates.push(addDays(selectedDate, i));
    }
    return dates;
  }, [selectedDate]);

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const params = new URLSearchParams(window.location.search);
    params.set("from", dateStr);
    params.set("to", dateStr);
    router.push(`/admin/prenotazioni?${params.toString()}`);
  };

  const hasBookingOnDay = (date: Date) => {
    return bookings.some(b => isSameDay(parseISO(b.start_time), date) && b.status !== 'CANCELLED');
  };

  const modalTimeOptions = useMemo(() => {
    const options = [];
    for (let h = startHour; h < endHour; h++) {
      options.push(`${String(h).padStart(2, "0")}:00`);
      options.push(`${String(h).padStart(2, "0")}:30`);
    }
    return options;
  }, [startHour, endHour]);

  // Current time line calculation
  const showCurrentTimeLine = isSameDay(selectedDate, currentTime);
  const currentTimePosition = useMemo(() => {
    if (!showCurrentTimeLine) return 0;
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startMins = startHour * 60;
    const diff = currentMins - startMins;
    // 1 minute = 1.6px (96px per hour)
    return diff * 1.6;
  }, [currentTime, showCurrentTimeLine, startHour]);

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl transition-all duration-300">
      
      {/* 1. APPLE-STYLE DATE STRIP CAROUSEL */}
      <div className="bg-slate-900/30 backdrop-blur-md border-b border-slate-800/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" /> Calendario Impegni
          </h3>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full font-semibold border border-slate-700/50">
            {format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none custom-scrollbar">
          {dateStrip.map((date, idx) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            const hasBookings = hasBookingOnDay(date);

            return (
              <button
                key={idx}
                onClick={() => handleDateClick(date)}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center justify-center w-14 py-3 rounded-xl border transition-all duration-300 relative overflow-hidden group",
                  isSelected
                    ? "bg-gradient-to-b from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 scale-105"
                    : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                )}
              >
                <span className="text-[9px] uppercase tracking-wider font-extrabold mb-1 opacity-70">
                  {format(date, "EEE", { locale: it }).slice(0, 3)}
                </span>
                <span className="text-lg font-black leading-none">
                  {format(date, "d")}
                </span>
                <span className="text-[9px] opacity-70 mt-1 font-medium">
                  {format(date, "MMM", { locale: it })}
                </span>
                
                {/* Dots indicator */}
                {hasBookings && (
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full mt-2 transition-all",
                    isSelected ? "bg-white scale-125" : isToday ? "bg-cyan-400" : "bg-slate-500"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. OPERATOR LOAD INDICATOR (Fresha Style) */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Carico Operatori ({maxConcurrentAssisted} max)
          </h3>
          <span className="text-[10px] text-slate-500 font-semibold">Orari di picco evidenziati</span>
        </div>
        <div className="flex w-full h-3 rounded-full overflow-hidden border border-slate-800/60 bg-slate-950/80 p-[1.5px]">
          {groomerLoad.map((load, i) => {
            const isOverloaded = load > maxConcurrentAssisted;
            const isFull = load === maxConcurrentAssisted;
            const isEmpty = load === 0;
            return (
              <div 
                key={i} 
                className={cn(
                  "flex-1 rounded-[2px] mx-[0.5px] transition-colors relative group",
                  isEmpty ? "bg-slate-800/20" : isOverloaded ? "bg-rose-500" : isFull ? "bg-amber-500" : "bg-emerald-500"
                )}
              >
                {/* Tooltip */}
                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900 text-slate-100 text-[10px] py-1.5 px-2.5 rounded-lg pointer-events-none whitespace-nowrap z-50 shadow-2xl border border-slate-800/80 font-bold transition-all">
                  {format(addMinutes(new Date().setHours(startHour, 0, 0, 0), i * SLOT_MINUTES), 'HH:mm')} - {load} prenotazioni assistite
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. GOOGLE CALENDAR STYLE GRID */}
      <div className="flex-1 overflow-auto relative custom-scrollbar bg-slate-950" ref={gridContainerRef}>
        <div className="min-w-[800px] flex relative select-none">
          
          {/* Time Axis Column */}
          <div className="w-16 flex-shrink-0 border-r border-slate-800 bg-slate-950 sticky left-0 z-20 shadow-2xl">
            <div className="h-12 border-b border-slate-800/80 bg-slate-950 sticky top-0 z-30" />
            {Array.from({ length: endHour - startHour }).map((_, i) => (
              <div key={i} className="h-24 border-b border-slate-800/30 relative">
                <span className="absolute -top-2.5 left-2.5 text-[10px] font-black tracking-tight text-slate-500 bg-slate-950 px-1 py-0.5 rounded border border-slate-800/60 shadow-md">
                  {String(startHour + i).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Stations Columns */}
          {stations.map(station => (
            <div key={station.id} className="flex-1 border-r border-slate-800/60 relative min-w-[200px] group/col">
              
              {/* Sticky Station Header */}
              <div className="h-12 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md sticky top-0 z-10 flex flex-col justify-center items-center px-2 text-center shadow-sm">
                <p className="text-sm font-bold text-slate-200 truncate w-full tracking-tight">{station.name}</p>
                <p className="text-[9px] text-cyan-400/80 font-extrabold uppercase tracking-widest mt-0.5">{station.type.replace('_', ' ')}</p>
              </div>

              {/* Grid Cells (Google Calendar Style) */}
              <div className="relative bg-slate-950" style={{ height: `${(endHour - startHour) * 96}px` }}>
                
                {/* Grid Divider Lines spanning across */}
                {Array.from({ length: (endHour - startHour) * 2 }).map((_, i) => {
                  const isHourLine = i % 2 === 0;
                  const time = addMinutes(new Date(selectedDate).setHours(startHour, 0, 0, 0), i * 30);
                  
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "h-12 border-b transition-colors cursor-pointer relative group/cell flex items-center justify-center",
                        isHourLine ? "border-slate-800/40" : "border-dashed border-slate-800/20",
                        "hover:bg-slate-900/30"
                      )}
                      onClick={() => {
                        setSelectedSlot({ stationId: station.id, time });
                      }}
                    >
                      {/* Plus icon on hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity bg-cyan-500/[0.03]">
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 text-cyan-400 text-[10px] font-black px-2 py-1 rounded-full shadow-lg">
                          <Plus className="w-3.5 h-3.5" />
                          <span>{format(time, 'HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Overlapping/Absolute Booking Cards */}
                {dailyBookings.filter(b => b.station_id === station.id).map(booking => {
                  const start = parseISO(booking.start_time);
                  const end = parseISO(booking.end_time);
                  
                  const startTotalMinutes = (start.getHours() * 60 + start.getMinutes()) - (startHour * 60);
                  const durationMins = differenceInMinutes(end, start);
                  
                  // Position & scale calculations
                  const top = startTotalMinutes * 1.6;
                  const height = durationMins * 1.6;

                  // Dynamic styles according to service type (Google Calendar look)
                  let accentColor = "from-cyan-500 to-blue-600";
                  let bgColors = "bg-cyan-500/[0.08] hover:bg-cyan-500/[0.12] border-cyan-500/30";
                  let textPrimary = "text-cyan-200";
                  let Icon = PawPrint;
                  let label = "Self-Service";

                  if (booking.service_type === "ASSISTED_WASH") {
                    accentColor = "from-blue-500 to-indigo-600";
                    bgColors = "bg-blue-500/[0.08] hover:bg-blue-500/[0.12] border-blue-500/30";
                    textPrimary = "text-blue-200";
                    Icon = Sparkles;
                    label = "Assistito";
                  } else if (booking.service_type === "FULL_GROOMING") {
                    accentColor = "from-fuchsia-500 to-pink-600";
                    bgColors = "bg-fuchsia-500/[0.08] hover:bg-fuchsia-500/[0.12] border-fuchsia-500/30";
                    textPrimary = "text-fuchsia-200";
                    Icon = Scissors;
                    label = "Grooming";
                  }

                  return (
                    <div
                      key={booking.id}
                      className={cn(
                        "absolute left-2 right-2 rounded-xl border flex flex-row overflow-hidden p-0 transition-all duration-300 hover:ring-2 hover:ring-white/10 hover:shadow-2xl hover:z-10 cursor-pointer active:scale-[0.98]",
                        bgColors
                      )}
                      style={{ top: `${top + 2}px`, height: `${height - 4}px` }}
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid triggering slot creation
                        // Populate modal for editing or viewing
                        setSelectedSlot({ stationId: booking.station_id, time: start });
                        setSelectedCustomerId(booking.customer_id);
                        setModalDuration(durationMins);
                      }}
                    >
                      {/* Left accent bar (Cal.com / Google Calendar style) */}
                      <div className={cn("w-1.5 shrink-0 bg-gradient-to-b", accentColor)} />

                      {/* Card Body */}
                      <div className="flex-1 flex flex-col p-2 min-w-0 justify-between">
                        
                        {/* Header info */}
                        <div className="flex items-center justify-between gap-1 mb-1 shrink-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Icon className={cn("w-3.5 h-3.5 shrink-0", textPrimary)} />
                            <span className={cn("text-[9px] font-black uppercase tracking-wider truncate", textPrimary)}>{label}</span>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 shrink-0">
                            {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                          </span>
                        </div>
                        
                        {/* Client & Dog details (only shown if height is enough) */}
                        {height >= 56 && (
                          <div className="flex-1 flex flex-col justify-center min-w-0">
                            <div className="text-xs font-black text-slate-100 truncate flex items-center gap-1">
                              <PawPrint className="w-3 h-3 text-slate-400 shrink-0" />
                              {dogNames[booking.dog_id] || "Cane sconosciuto"}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold truncate mt-0.5 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-500 shrink-0" />
                              {customerNames[booking.customer_id] || "Cliente"}
                            </div>
                          </div>
                        )}
                        
                        {/* Visual indicator of duration at the bottom of cards */}
                        {height >= 80 && (
                          <div className="text-[8px] text-slate-500 font-bold mt-1 shrink-0">
                            Durata: {durationMins} min
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* DYNAMIC CURRENT TIME INDICATOR LINE (Google Calendar Style) */}
          {showCurrentTimeLine && currentTimePosition > 0 && currentTimePosition < (endHour - startHour) * 96 && (
            <div 
              className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
              style={{ top: `${currentTimePosition}px` }}
            >
              {/* The Line Indicator */}
              <div className="w-16 shrink-0 flex justify-end pr-1.5">
                <span className="text-[9px] font-black text-rose-500 bg-rose-950/60 border border-rose-500/30 px-1 py-0.5 rounded shadow">
                  {format(currentTime, 'HH:mm')}
                </span>
              </div>
              <div className="flex-1 h-[2px] bg-rose-500 relative">
                {/* Pulse dot at the beginning */}
                <span className="absolute -left-1 -top-[4px] w-[10px] h-[10px] bg-rose-500 rounded-full shadow-lg ring-4 ring-rose-500/20 animate-ping" />
                <span className="absolute -left-1 -top-[4px] w-[10px] h-[10px] bg-rose-500 rounded-full shadow-md" />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 4. ADMIN BOOKING MODAL (ADJUSTABLE DATE/TIME/DURATION) */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="font-semibold text-slate-200">Nuova Prenotazione (Bypass Admin)</h3>
              <button onClick={() => setSelectedSlot(null)} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form action={handleCreate} className="p-5 space-y-4">
              <input type="hidden" name="station_id" value={selectedSlot.stationId} />
              
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-sm text-slate-300">
                <p><strong>Postazione:</strong> {stations.find(s => s.id === selectedSlot.stationId)?.name}</p>
              </div>

              {/* DATE & TIME ADJUSTMENT FIELDS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Data</label>
                  <input
                    type="date"
                    required
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Ora Inizio</label>
                  <select
                    value={modalTime}
                    onChange={(e) => setModalTime(e.target.value)}
                    className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    {modalTimeOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DURATION FIELD */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Durata Servizio</label>
                <select
                  value={modalDuration}
                  onChange={(e) => setModalDuration(Number(e.target.value))}
                  className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value={30}>30 minuti</option>
                  <option value={45}>45 minuti</option>
                  <option value={60}>1 ora (60 min)</option>
                  <option value={90}>1 ora e 30 min (90 min)</option>
                  <option value={120}>2 ore (120 min)</option>
                  <option value={150}>2 ore e 30 min (150 min)</option>
                  <option value={180}>3 ore (180 min)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200">Seleziona Cliente</label>
                <select 
                  name="customer_id" 
                  required 
                  className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">Cerca o seleziona...</option>
                  {allProfiles.map(p => {
                    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
                    return <option key={p.id} value={p.id}>{fullName || p.email}</option>;
                  })}
                </select>
              </div>

              {selectedCustomerId && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-semibold text-slate-200">Scegli Cane</label>
                  <select name="dog_id" required className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors">
                    {customerDogs.length === 0 && <option value="">Nessun cane registrato</option>}
                    {customerDogs.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200">Tipologia di Servizio</label>
                <select name="service_type" required className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors">
                  <option value="SELF_SERVICE">Self Service (Nessuna assistenza)</option>
                  <option value="ASSISTED_WASH">Lavaggio Assistito</option>
                  <option value="FULL_GROOMING">Toelettatura Completa</option>
                </select>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={isPending || !selectedCustomerId || customerDogs.length === 0} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl py-3 font-semibold transition-all">
                  {isPending ? "Salvataggio..." : "Conferma ed Inserisci"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded CSS for Custom Webkit Scrollbars */}
      <style jsx global>{`
        /* Hide scrollbars for week strip carousel */
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Premium custom scrollbars for main grid */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(2, 6, 23, 0.4);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(51, 65, 85, 0.6);
          border: 2px solid rgb(2, 6, 23);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.8);
        }
      `}</style>
    </div>
  );
}
