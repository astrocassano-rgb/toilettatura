import { createClient } from "@supabase/supabase-js";
import { Clock, Users, CalendarDays, BellRing, CheckCircle2, XCircle } from "lucide-react";

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type WaitlistEntry = {
  id: string;
  date: string;
  service_type: string;
  status: string;
  notified_at: string | null;
  created_at: string;
  customer_id: string;
  dog_id: string | null;
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

type Dog = {
  id: string;
  name: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  WAITING: { label: "In attesa", color: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  NOTIFIED: { label: "Notificato", color: "bg-blue-500/15 text-blue-300 ring-blue-500/30" },
  EXPIRED: { label: "Scaduto", color: "bg-slate-700/40 text-slate-400 ring-slate-600/30" },
};

const SERVICE_LABELS: Record<string, string> = {
  SELF_SERVICE: "Self-Service",
  ASSISTED_WASH: "Lavaggio Assistito",
  FULL_GROOMING: "Toelettatura Completa",
};

export default async function AdminWaitlistPage() {
  const serviceRole = createServiceRoleClient();

  // Recupera il tenant dell'admin (default tenant per ora)
  const tenantId = "00000000-0000-0000-0000-000000000000";

  const { data: entries } = await serviceRole
    .from("booking_waitlist")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(200);

  const waitlistEntries = (entries ?? []) as WaitlistEntry[];

  if (waitlistEntries.length === 0) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Lista d&apos;Attesa</h1>
          <p className="text-sm text-slate-400">
            Clienti che hanno richiesto notifica per un giorno pieno
          </p>
        </header>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center space-y-3">
          <Users className="mx-auto h-10 w-10 text-slate-600" />
          <p className="text-slate-400 text-sm">Nessun cliente in lista d&apos;attesa</p>
        </div>
      </div>
    );
  }

  // Carica profili e cani per mostrare i nomi
  const customerIds = Array.from(new Set(waitlistEntries.map((e) => e.customer_id)));
  const dogIds = Array.from(new Set(waitlistEntries.map((e) => e.dog_id).filter(Boolean))) as string[];

  const [{ data: profiles }, { data: dogs }] = await Promise.all([
    serviceRole.from("profiles").select("id, first_name, last_name, phone").in("id", customerIds),
    dogIds.length
      ? serviceRole.from("dogs").select("id, name").in("id", dogIds)
      : Promise.resolve({ data: [] as Dog[] }),
  ]);

  const profileMap = new Map<string, Profile>();
  for (const p of (profiles ?? []) as Profile[]) profileMap.set(p.id, p);

  const dogMap = new Map<string, string>();
  for (const d of (dogs ?? []) as Dog[]) dogMap.set(d.id, d.name);

  // Statistiche rapide
  const waiting = waitlistEntries.filter((e) => e.status === "WAITING").length;
  const notified = waitlistEntries.filter((e) => e.status === "NOTIFIED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Lista d&apos;Attesa</h1>
        <p className="text-sm text-slate-400">
          Clienti che hanno richiesto notifica per un giorno pieno
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-1">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">In attesa</span>
          </div>
          <p className="text-3xl font-black text-slate-100">{waiting}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-1">
          <div className="flex items-center gap-2 text-blue-400">
            <BellRing className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Notificati</span>
          </div>
          <p className="text-3xl font-black text-slate-100">{notified}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Totale</span>
          </div>
          <p className="text-3xl font-black text-slate-100">{waitlistEntries.length}</p>
        </div>
      </div>

      {/* Tabella */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Data</div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Servizio</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Cane</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Stato</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Iscrizione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {waitlistEntries.map((entry) => {
                const profile = profileMap.get(entry.customer_id);
                const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "—";
                const dogName = entry.dog_id ? (dogMap.get(entry.dog_id) ?? "—") : "—";
                const statusInfo = STATUS_LABELS[entry.status] ?? STATUS_LABELS.EXPIRED;
                const createdDate = new Date(entry.created_at);

                return (
                  <tr key={entry.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-200">
                        {new Date(entry.date + "T12:00:00").toLocaleDateString("it-IT", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs font-medium">
                      {SERVICE_LABELS[entry.service_type] ?? entry.service_type}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-200">{fullName}</p>
                        {profile?.phone && (
                          <p className="text-[11px] text-slate-500 font-mono">{profile.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{dogName}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const si = STATUS_LABELS[entry.status] ?? { label: "Sconosciuto", color: "bg-slate-700/40 text-slate-400 ring-slate-600/30" };
                        return (
                          <>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${si.color}`}>
                              {entry.status === "NOTIFIED" ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : entry.status === "EXPIRED" ? (
                                <XCircle className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {si.label}
                            </span>
                            {entry.notified_at && (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {new Date(entry.notified_at).toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {createdDate.toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
