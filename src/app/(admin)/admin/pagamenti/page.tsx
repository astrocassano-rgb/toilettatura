import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Database } from "@/types/database";

type Tx = Database["public"]["Tables"]["token_transactions"]["Row"];
type Wallet = Pick<Database["public"]["Tables"]["wallets"]["Row"], "id" | "customer_id">;
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "email" | "first_name" | "last_name">;
type SearchParams = Record<string, string | string[] | undefined>;
type PeriodFilter = "7d" | "30d" | "90d" | "all";
type MovementFilter = "ALL" | "CHARGE" | "DEBIT" | "BONUS";

export const dynamic = "force-dynamic";

function fmt(value: string) {
  const d = new Date(value);
  const day = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(d);
  return `${day} · ${time}`;
}

function fmtDay(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" }).format(new Date(value));
}

function fmtCompactCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function fmtCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek(now: Date) {
  const date = new Date(now);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function inferChargePack(amountCredits: number) {
  if (amountCredits === 10) return "Starter";
  if (amountCredits === 30) return "Premium";
  if (amountCredits === 65) return "Max";
  return "Custom";
}

function frequencyLabel(count: number) {
  if (count >= 8) return "Molto alta";
  if (count >= 4) return "Alta";
  if (count >= 2) return "Media";
  if (count === 1) return "Bassa";
  return "Nessuna";
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function resolvePeriodStart(period: PeriodFilter, now: Date) {
  if (period === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (period === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return null;
}

function isIsoDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toUtcIsoStart(day: string) {
  return `${day}T00:00:00.000Z`;
}

function toUtcIsoNextDayStart(day: string) {
  const [y, m, d] = day.split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0)).toISOString();
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function nextMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export default async function AdminPagamentiPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const periodRaw = typeof params.period === "string" ? params.period : "30d";
  const movementRaw = typeof params.type === "string" ? params.type : "ALL";
  const fromRaw = typeof params.from === "string" ? params.from : "";
  const toRaw = typeof params.to === "string" ? params.to : "";
  const period = (["7d", "30d", "90d", "all"].includes(periodRaw) ? periodRaw : "30d") as PeriodFilter;
  const movementType = (["ALL", "CHARGE", "DEBIT", "BONUS"].includes(movementRaw) ? movementRaw : "ALL") as MovementFilter;

  const { supabase } = await requireAdmin({ next: "/admin/pagamenti", mode: "notFound" });

  const { data: txs } = await supabase
    .from("token_transactions")
    .select("id, wallet_id, type, amount_credits, amount_currency, stripe_intent_id, note, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  const allRows = (txs ?? []) as Tx[];
  const walletIds = Array.from(new Set(allRows.map((t) => t.wallet_id))).filter(Boolean);

  const { data: wallets } = walletIds.length ? await supabase.from("wallets").select("id, customer_id").in("id", walletIds) : { data: [] as Wallet[] };
  const walletRows = (wallets ?? []) as Wallet[];

  const customerIds = Array.from(new Set(walletRows.map((w) => w.customer_id))).filter(Boolean);
  const { data: profiles } = customerIds.length
    ? await supabase.from("profiles").select("id, email, first_name, last_name").in("id", customerIds)
    : { data: [] as Profile[] };

  const walletToCustomer: Record<string, string> = {};
  for (const w of walletRows) walletToCustomer[w.id] = w.customer_id;

  const customerLabel: Record<string, string> = {};
  for (const p of (profiles ?? []) as Profile[]) {
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
    customerLabel[p.id] = fullName || p.email || p.id;
  }

  const now = new Date();
  const fromStartIso = fromRaw && isIsoDay(fromRaw) ? toUtcIsoStart(fromRaw) : null;
  const toNextIso = toRaw && isIsoDay(toRaw) ? toUtcIsoNextDayStart(toRaw) : null;
  const explicitStart = fromStartIso ? new Date(fromStartIso) : null;
  const explicitEnd = toNextIso ? new Date(toNextIso) : null;
  const fallbackStart = resolvePeriodStart(period, now);
  const windowStart = explicitStart ?? fallbackStart ?? null;
  const windowEnd = explicitEnd && windowStart && explicitEnd < windowStart ? null : explicitEnd ?? now;
  const rows = allRows.filter((t) => {
    const createdAt = new Date(t.created_at);
    if (windowStart && createdAt < windowStart) return false;
    if (windowEnd && createdAt >= windowEnd) return false;
    if (movementType !== "ALL" && t.type !== movementType) return false;
    return true;
  });

  const exportParams = new URLSearchParams();
  exportParams.set("period", period);
  exportParams.set("type", movementType);
  if (fromRaw) exportParams.set("from", fromRaw);
  if (toRaw) exportParams.set("to", toRaw);
  const exportHref = `/api/admin/payments/export?${exportParams.toString()}`;
  const resetHref = "/admin/pagamenti";

  const totals = rows.reduce(
    (acc, t) => {
      if (t.type === "CHARGE") acc.charged += t.amount_credits;
      if (t.type === "BONUS") acc.bonus += t.amount_credits;
      if (t.type === "DEBIT") acc.debit += t.amount_credits;
      return acc;
    },
    { charged: 0, bonus: 0, debit: 0 }
  );

  const periods = [
    { key: "day", label: "Oggi", start: startOfToday(now) },
    { key: "week", label: "Settimana", start: startOfWeek(now) },
    { key: "month", label: "Mese", start: startOfMonth(now) }
  ] as const;

  const periodStats = periods.map((period) => {
    const periodRows = rows.filter((t) => new Date(t.created_at) >= period.start);
    const chargeRows = periodRows.filter((t) => t.type === "CHARGE");
    const chargeCustomers = new Set(
      chargeRows
        .map((t) => walletToCustomer[t.wallet_id])
        .filter(Boolean)
    );

    return {
      ...period,
      chargeCount: chargeRows.length,
      chargeCredits: chargeRows.reduce((sum, t) => sum + t.amount_credits, 0),
      chargeCurrency: chargeRows.reduce((sum, t) => sum + Number(t.amount_currency ?? 0), 0),
      debitCredits: periodRows.filter((t) => t.type === "DEBIT").reduce((sum, t) => sum + t.amount_credits, 0),
      bonusCredits: periodRows.filter((t) => t.type === "BONUS").reduce((sum, t) => sum + t.amount_credits, 0),
      uniqueCustomers: chargeCustomers.size
    };
  });

  const chargeRows = rows.filter((t) => t.type === "CHARGE");
  const purchaseByCustomer = new Map<
    string,
    {
      customerId: string;
      label: string;
      credits: number;
      currency: number;
      purchases: number;
      lastPurchaseAt: string;
      packCounts: Record<string, number>;
    }
  >();

  for (const tx of chargeRows) {
    const customerId = walletToCustomer[tx.wallet_id];
    if (!customerId) continue;
    const current = purchaseByCustomer.get(customerId) ?? {
      customerId,
      label: customerLabel[customerId] ?? customerId,
      credits: 0,
      currency: 0,
      purchases: 0,
      lastPurchaseAt: tx.created_at,
      packCounts: {}
    };
    current.credits += tx.amount_credits;
    current.currency += Number(tx.amount_currency ?? 0);
    current.purchases += 1;
    if (new Date(tx.created_at) > new Date(current.lastPurchaseAt)) current.lastPurchaseAt = tx.created_at;
    const pack = inferChargePack(tx.amount_credits);
    current.packCounts[pack] = (current.packCounts[pack] ?? 0) + 1;
    purchaseByCustomer.set(customerId, current);
  }

  const customerPurchaseRows = Array.from(purchaseByCustomer.values())
    .sort((a, b) => b.purchases - a.purchases || b.credits - a.credits)
    .slice(0, 12);

  const topValueCustomers = Array.from(purchaseByCustomer.values())
    .sort((a, b) => b.currency - a.currency || b.credits - a.credits || b.purchases - a.purchases)
    .slice(0, 5);

  const packStats = chargeRows.reduce<Record<string, { count: number; credits: number; currency: number }>>((acc, tx) => {
    const pack = inferChargePack(tx.amount_credits);
    acc[pack] ??= { count: 0, credits: 0, currency: 0 };
    acc[pack].count += 1;
    acc[pack].credits += tx.amount_credits;
    acc[pack].currency += Number(tx.amount_currency ?? 0);
    return acc;
  }, {});

  const packRows = Object.entries(packStats)
    .map(([pack, stats]) => ({ pack, ...stats }))
    .sort((a, b) => b.count - a.count || b.credits - a.credits);

  const bestPack = packRows[0]?.pack ?? "N/D";
  const bestPackCount = packRows[0]?.count ?? 0;
  const repeatCustomers = customerPurchaseRows.filter((row) => row.purchases > 1).length;
  const chargeCurrencyTotal = chargeRows.reduce((sum, tx) => sum + Number(tx.amount_currency ?? 0), 0);
  const avgTicketCurrency = chargeRows.length ? chargeCurrencyTotal / chargeRows.length : 0;
  const avgTicketCredits = chargeRows.length ? chargeRows.reduce((sum, tx) => sum + tx.amount_credits, 0) / chargeRows.length : 0;
  const monthStat = periodStats.find((period) => period.key === "month");

  const dailySeries = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    const key = dayKey(date);
    const sameDayRows = chargeRows.filter((tx) => dayKey(new Date(tx.created_at)) === key);
    return {
      key,
      label: fmtDay(date.toISOString()),
      count: sameDayRows.length,
      credits: sameDayRows.reduce((sum, tx) => sum + tx.amount_credits, 0),
      currency: sameDayRows.reduce((sum, tx) => sum + Number(tx.amount_currency ?? 0), 0)
    };
  });

  const maxDailyCount = Math.max(1, ...dailySeries.map((day) => day.count));
  const maxDailyCredits = Math.max(1, ...dailySeries.map((day) => day.credits));
  const currentMonthStart = monthStart(now);
  const previousMonthStart = monthStart(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const nextCurrentMonthStart = nextMonthStart(now);
  const currentMonthCharges = allRows.filter((t) => t.type === "CHARGE" && new Date(t.created_at) >= currentMonthStart && new Date(t.created_at) < nextCurrentMonthStart);
  const previousMonthCharges = allRows.filter((t) => t.type === "CHARGE" && new Date(t.created_at) >= previousMonthStart && new Date(t.created_at) < currentMonthStart);
  const currentMonthRevenue = currentMonthCharges.reduce((sum, t) => sum + Number(t.amount_currency ?? 0), 0);
  const previousMonthRevenue = previousMonthCharges.reduce((sum, t) => sum + Number(t.amount_currency ?? 0), 0);
  const revenueDelta = previousMonthRevenue === 0 ? (currentMonthRevenue > 0 ? 100 : 0) : ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
  const deltaTone = revenueDelta > 0 ? "text-emerald-300" : revenueDelta < 0 ? "text-rose-300" : "text-slate-300";
  const filteredLabel =
    fromRaw || toRaw
      ? `dal ${fromRaw || "—"} al ${toRaw || "—"}`
      : period === "all"
        ? "tutto lo storico caricato"
        : `filtro ${period}`;

  const allChargeRows = allRows.filter((t) => t.type === "CHARGE");
  const firstPurchaseByCustomer = new Map<string, string>();
  for (const tx of allChargeRows) {
    const customerId = walletToCustomer[tx.wallet_id];
    if (!customerId) continue;
    const existing = firstPurchaseByCustomer.get(customerId);
    if (!existing || new Date(tx.created_at) < new Date(existing)) {
      firstPurchaseByCustomer.set(customerId, tx.created_at);
    }
  }

  const payingCustomers = new Set(
    rows
      .filter((t) => t.type === "CHARGE")
      .map((t) => walletToCustomer[t.wallet_id])
      .filter((value): value is string => Boolean(value))
  );

  let newCustomers = 0;
  let returningCustomers = 0;
  const analysisStart = windowStart ?? new Date(0);
  const analysisEnd = windowEnd ?? now;
  for (const customerId of payingCustomers) {
    const firstPurchaseAt = firstPurchaseByCustomer.get(customerId);
    if (!firstPurchaseAt) continue;
    const firstDate = new Date(firstPurchaseAt);
    if (firstDate >= analysisStart && firstDate < analysisEnd) newCustomers += 1;
    else returningCustomers += 1;
  }

  const chargeRowsFiltered = rows.filter((t) => t.type === "CHARGE");
  const chargeCurrencyFiltered = chargeRowsFiltered.reduce((sum, t) => sum + Number(t.amount_currency ?? 0), 0);
  const chargedCreditsFiltered = chargeRowsFiltered.reduce((sum, t) => sum + t.amount_credits, 0);
  const bonusCreditsFiltered = rows.filter((t) => t.type === "BONUS").reduce((sum, t) => sum + t.amount_credits, 0);
  const arppu = payingCustomers.size ? chargeCurrencyFiltered / payingCustomers.size : 0;
  const purchasesPerPayer = payingCustomers.size ? chargeRowsFiltered.length / payingCustomers.size : 0;
  const bonusRate = chargedCreditsFiltered > 0 ? bonusCreditsFiltered / chargedCreditsFiltered : 0;

  const alerts: { label: string; tone: "emerald" | "amber" | "rose" }[] = [];
  if (revenueDelta <= -20) alerts.push({ label: "Ricavi mese in calo > 20% vs mese precedente", tone: "rose" });
  if (bonusRate >= 0.2) alerts.push({ label: "Bonus/rimborsi alti (>= 20% dei crediti acquistati nel periodo)", tone: "amber" });
  if (payingCustomers.size === 0) alerts.push({ label: "Nessuna ricarica nel periodo selezionato", tone: "amber" });

  const monthSeries = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    const monthCharges = allChargeRows.filter((t) => {
      const d = new Date(t.created_at);
      return d >= monthDate && d < monthEnd;
    });
    const monthCustomers = new Set(monthCharges.map((t) => walletToCustomer[t.wallet_id]).filter((value): value is string => Boolean(value)));
    return {
      key: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("it-IT", { month: "short" }).format(monthDate),
      revenue: monthCharges.reduce((sum, t) => sum + Number(t.amount_currency ?? 0), 0),
      count: monthCharges.length,
      customers: monthCustomers.size
    };
  });
  const maxMonthRevenue = Math.max(1, ...monthSeries.map((m) => m.revenue));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Pagamenti / Wallet</h2>
        <p className="text-sm leading-relaxed text-slate-200">Ledger crediti con lettura operativa e finanziaria: chi ricarica, quanto, con che frequenza e andamento nel tempo.</p>
      </header>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Filtri</p>
          <p className="text-lg font-semibold tracking-tight">Periodo, tipo ed export</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action="/admin/pagamenti" method="get" className="grid gap-3 md:grid-cols-6">
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="period" className="text-sm font-medium text-slate-200">Periodo</label>
              <select
                id="period"
                name="period"
                defaultValue={period}
                className="h-11 w-full rounded-xl bg-slate-950/40 px-3 text-sm text-slate-50 ring-1 ring-inset ring-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <option value="7d">Ultimi 7 giorni</option>
                <option value="30d">Ultimi 30 giorni</option>
                <option value="90d">Ultimi 90 giorni</option>
                <option value="all">Storico caricato</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="type" className="text-sm font-medium text-slate-200">Tipo movimento</label>
              <select
                id="type"
                name="type"
                defaultValue={movementType}
                className="h-11 w-full rounded-xl bg-slate-950/40 px-3 text-sm text-slate-50 ring-1 ring-inset ring-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <option value="ALL">Tutti</option>
                <option value="CHARGE">Solo ricariche</option>
                <option value="DEBIT">Solo consumi</option>
                <option value="BONUS">Solo bonus/rimborsi</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="from" className="text-sm font-medium text-slate-200">Da</label>
              <Input id="from" name="from" type="date" defaultValue={fromRaw} className="h-11" />
            </div>
            <div className="space-y-2">
              <label htmlFor="to" className="text-sm font-medium text-slate-200">A</label>
              <Input id="to" name="to" type="date" defaultValue={toRaw} className="h-11" />
            </div>
            <div className="grid grid-cols-2 gap-2 md:col-span-6">
              <Button type="submit" variant="primary" className="w-full">Applica</Button>
              <Link href={resetHref} className="w-full">
                <Button type="button" variant="secondary" className="w-full">Reset</Button>
              </Link>
            </div>
          </form>
          <div className="flex flex-col gap-2 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
            <span>Vista attuale: {filteredLabel} · tipo {movementType}</span>
            <a
              href={exportHref}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900/70 px-4 text-base font-medium text-slate-50 ring-1 ring-inset ring-slate-800 transition-colors hover:bg-slate-900 active:bg-slate-950"
            >
              Esporta CSV
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Riepilogo</p>
          <p className="text-lg font-semibold tracking-tight">Movimenti filtrati</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-xs text-slate-300">CHARGE</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{totals.charged}</p>
          </div>
          <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-xs text-slate-300">BONUS</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{totals.bonus}</p>
          </div>
          <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-xs text-slate-300">DEBIT</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{totals.debit}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">KPI</p>
          <p className="text-lg font-semibold tracking-tight">Controllo rapido business</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-xs text-slate-300">Ricavo mese</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{fmtCurrency(monthStat?.chargeCurrency ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-400">{monthStat?.chargeCount ?? 0} ricariche nel mese corrente</p>
          </div>
          <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-xs text-slate-300">Ticket medio</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{fmtCurrency(avgTicketCurrency)}</p>
            <p className="mt-1 text-xs text-slate-400">{avgTicketCredits.toFixed(1)} crediti medi per ricarica</p>
          </div>
          <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-xs text-slate-300">Clienti ricorrenti</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{repeatCustomers}</p>
            <p className="mt-1 text-xs text-slate-400">Con almeno 2 acquisti negli ultimi movimenti</p>
          </div>
          <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-xs text-slate-300">Pacchetto top</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{bestPack}</p>
            <p className="mt-1 text-xs text-slate-400">{bestPackCount} acquisti registrati</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Confronto Mese</p>
          <p className="text-lg font-semibold tracking-tight">Mese corrente vs mese precedente</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-xs text-slate-300">Ricavo mese corrente</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{fmtCurrency(currentMonthRevenue)}</p>
            <p className="mt-1 text-xs text-slate-400">{currentMonthCharges.length} ricariche</p>
          </div>
          <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-xs text-slate-300">Ricavo mese precedente</p>
            <p className="mt-1 text-xl font-semibold text-slate-50">{fmtCurrency(previousMonthRevenue)}</p>
            <p className="mt-1 text-xs text-slate-400">{previousMonthCharges.length} ricariche</p>
          </div>
          <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-xs text-slate-300">Variazione</p>
            <p className={`mt-1 text-xl font-semibold ${deltaTone}`}>{revenueDelta >= 0 ? "+" : ""}{revenueDelta.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-slate-400">Calcolata sempre sulle ricariche (`CHARGE`)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Direzionale</p>
          <p className="text-lg font-semibold tracking-tight">Clienti, valore e segnali</p>
        </CardHeader>
        <CardContent className="grid gap-3 xl:grid-cols-2">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <p className="text-xs text-slate-300">Nuovi clienti (periodo)</p>
              <p className="mt-1 text-xl font-semibold text-slate-50">{newCustomers}</p>
              <p className="mt-1 text-xs text-slate-400">Primo acquisto nel periodo selezionato</p>
            </div>
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <p className="text-xs text-slate-300">Clienti ricorrenti (periodo)</p>
              <p className="mt-1 text-xl font-semibold text-slate-50">{returningCustomers}</p>
              <p className="mt-1 text-xs text-slate-400">Hanno già acquistato in passato</p>
            </div>
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <p className="text-xs text-slate-300">ARPPU (periodo)</p>
              <p className="mt-1 text-xl font-semibold text-slate-50">{fmtCurrency(arppu)}</p>
              <p className="mt-1 text-xs text-slate-400">Ricavo / clienti acquirenti</p>
            </div>
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <p className="text-xs text-slate-300">Frequenza acquisto</p>
              <p className="mt-1 text-xl font-semibold text-slate-50">{purchasesPerPayer.toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-400">Ricariche per cliente (periodo)</p>
            </div>
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800 md:col-span-2">
              <p className="text-xs text-slate-300">Bonus / rimborsi</p>
              <p className="mt-1 text-xl font-semibold text-slate-50">{(bonusRate * 100).toFixed(1)}%</p>
              <p className="mt-1 text-xs text-slate-400">Incidenza bonus su crediti acquistati nel periodo</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <p className="text-sm font-semibold text-slate-50">Alert principali</p>
              <div className="mt-2 space-y-2 text-sm">
                {alerts.length ? (
                  alerts.map((a) => (
                    <div
                      key={a.label}
                      className={
                        a.tone === "rose"
                          ? "rounded-xl bg-rose-500/10 px-3 py-2 text-rose-200 ring-1 ring-inset ring-rose-500/30"
                          : a.tone === "amber"
                            ? "rounded-xl bg-amber-500/10 px-3 py-2 text-amber-200 ring-1 ring-inset ring-amber-500/30"
                            : "rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-200 ring-1 ring-inset ring-emerald-500/30"
                      }
                    >
                      {a.label}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-200 ring-1 ring-inset ring-emerald-500/30">
                    Nessun alert critico rilevato.
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-400">Basato su storico caricato (max 1000 movimenti).</p>
            </div>

            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <p className="text-sm font-semibold text-slate-50">Storico 6 mesi (ricavo CHARGE)</p>
              <div className="mt-3 space-y-3">
                {monthSeries.map((m) => (
                  <div key={m.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="uppercase tracking-wide">{m.label}</span>
                      <span>{fmtCompactCurrency(m.revenue)} · {m.count} ricariche · {m.customers} clienti</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-900 ring-1 ring-inset ring-slate-800">
                      <div
                        className="h-3 rounded-full bg-blue-400/80"
                        style={{ width: `${Math.max(m.revenue ? 8 : 0, (m.revenue / maxMonthRevenue) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Andamento</p>
          <p className="text-lg font-semibold tracking-tight">Totali giornalieri, settimanali e mensili</p>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-3">
          {periodStats.map((period) => (
            <div key={period.key} className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-300">{period.label}</p>
              <p className="mt-2 text-lg font-semibold text-slate-50">{period.chargeCount} ricariche</p>
              <p className="mt-1 text-sm text-slate-200">{period.uniqueCustomers} clienti acquirenti</p>
              <div className="mt-3 space-y-1 text-sm text-slate-300">
                <p>Crediti acquistati: <span className="font-semibold text-slate-50">{period.chargeCredits}</span></p>
                <p>Ricavo registrato: <span className="font-semibold text-slate-50">{fmtCurrency(period.chargeCurrency)}</span></p>
                <p>Crediti usati: <span className="font-semibold text-slate-50">{period.debitCredits}</span></p>
                <p>Bonus / rimborsi: <span className="font-semibold text-slate-50">{period.bonusCredits}</span></p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Trend 7 giorni</p>
            <p className="text-lg font-semibold tracking-tight">Ricariche recenti</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {dailySeries.map((day) => (
              <div key={day.key} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                  <span>{day.label}</span>
                  <span>{day.count} ricariche · {day.credits} crediti · {fmtCompactCurrency(day.currency)}</span>
                </div>
                <div className="grid grid-cols-[1fr_1fr] gap-2">
                  <div className="h-3 rounded-full bg-slate-900 ring-1 ring-inset ring-slate-800">
                    <div
                      className="h-3 rounded-full bg-blue-400/80"
                      style={{ width: `${Math.max(day.count ? 8 : 0, (day.count / maxDailyCount) * 100)}%` }}
                    />
                  </div>
                  <div className="h-3 rounded-full bg-slate-900 ring-1 ring-inset ring-slate-800">
                    <div
                      className="h-3 rounded-full bg-emerald-400/80"
                      style={{ width: `${Math.max(day.credits ? 8 : 0, (day.credits / maxDailyCredits) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-4 text-[11px] text-slate-400">
              <span>Barra blu: numero ricariche</span>
              <span>Barra verde: crediti acquistati</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Pacchetti</p>
            <p className="text-lg font-semibold tracking-tight">Distribuzione vendite</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {packRows.length ? (
              packRows.map((pack) => (
                <div key={pack.pack} className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-50">{pack.pack}</p>
                    <p className="text-xs text-slate-300">{pack.count} vendite</p>
                  </div>
                  <div className="mt-2 text-sm text-slate-300">
                    <p>Crediti: <span className="font-semibold text-slate-50">{pack.credits}</span></p>
                    <p>Valore: <span className="font-semibold text-slate-50">{fmtCurrency(pack.currency)}</span></p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-300">Nessun pacchetto registrato.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Top valore</p>
          <p className="text-lg font-semibold tracking-tight">Clienti con spesa maggiore</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {topValueCustomers.length ? (
            topValueCustomers.map((row, index) => (
              <div key={row.customerId} className="flex flex-col gap-3 rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-50">#{index + 1} {row.label}</p>
                  <p className="text-xs text-slate-300">{row.purchases} acquisti · ultimo {fmt(row.lastPurchaseAt)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-50">{fmtCurrency(row.currency)}</p>
                    <p className="text-xs text-slate-300">{row.credits} crediti</p>
                  </div>
                  <Link href={`/admin/clienti/${row.customerId}`}>
                    <Button variant="secondary">Apri cliente</Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-300">Ancora nessun cliente con spesa tracciata.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Clienti che acquistano</p>
          <p className="text-lg font-semibold tracking-tight">Frequenza e tipo di ricarica</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {customerPurchaseRows.length ? (
            customerPurchaseRows.map((row) => {
              const packSummary = Object.entries(row.packCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([pack, count]) => `${pack} x${count}`)
                .join(" · ");

              return (
                <div key={row.customerId} className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-50">{row.label}</p>
                      <p className="text-xs text-slate-300">
                        {row.purchases} acquisti · frequenza {frequencyLabel(row.purchases)} · ultimo acquisto {fmt(row.lastPurchaseAt)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">{packSummary || "Tipo pacchetto non riconosciuto"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-50">{row.credits} crediti</p>
                        <p className="text-xs text-slate-300">{fmtCurrency(row.currency)}</p>
                      </div>
                      <Link href={`/admin/clienti/${row.customerId}`}>
                        <Button variant="secondary">Apri cliente</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-slate-300">Nessun acquisto crediti trovato negli ultimi movimenti.</div>
          )}
        </CardContent>
      </Card>

      {rows.length ? (
        <div className="grid gap-3">
          {rows.map((t) => {
            const customerId = walletToCustomer[t.wallet_id];
            const customer = customerId ? customerLabel[customerId] ?? customerId : "Cliente";
            const pack = t.type === "CHARGE" ? inferChargePack(t.amount_credits) : null;
            return (
              <Card key={t.id}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-50">
                        {t.type} · {t.amount_credits} crediti
                      </p>
                      <p className="text-xs text-slate-300 truncate">
                        {customer} · {fmt(t.created_at)}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {pack ? `Pacchetto: ${pack}` : "Movimento wallet"}
                        {` · Valore: ${fmtCurrency(Number(t.amount_currency ?? 0))}`}
                        {t.note ? ` · ${t.note}` : ""}
                      </p>
                    </div>
                    {customerId ? (
                      <Link href={`/admin/clienti/${customerId}`}>
                        <Button variant="secondary">Apri cliente</Button>
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-sm text-slate-400">Nessun movimento.</CardContent>
        </Card>
      )}
    </div>
  );
}
