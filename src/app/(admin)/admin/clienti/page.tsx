import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Users, Search } from "lucide-react";
import type { Database } from "@/types/database";

type CustomerOverview = Database["public"]["Views"]["admin_customers_overview"]["Row"];
type SortKey = "bookings_upcoming" | "balance_credits" | "bookings_total";
type SearchParams = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";

function BalanceBadge({ credits }: { credits: number }) {
  if (credits >= 20) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200 ring-1 ring-inset ring-emerald-500/25">
        {credits} crediti
      </span>
    );
  }
  if (credits >= 5) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200 ring-1 ring-inset ring-amber-500/25">
        {credits} crediti
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-200 ring-1 ring-inset ring-rose-500/25">
      {credits} crediti
    </span>
  );
}

export default async function AdminClientiPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const sortRaw = typeof params.sort === "string" ? params.sort : "bookings_upcoming";
  const sort = (["bookings_upcoming", "balance_credits", "bookings_total"].includes(sortRaw)
    ? sortRaw
    : "bookings_upcoming") as SortKey;

  const { supabase } = await requireAdmin({ next: "/admin/clienti", mode: "notFound" });

  const { data } = await supabase
    .from("admin_customers_overview")
    .select("customer_id, email, first_name, last_name, phone, balance_credits, bookings_total, bookings_upcoming")
    .order(sort, { ascending: false })
    .limit(200);

  let customers = (data ?? []) as CustomerOverview[];

  // Filtro client-side su nome/email (il campo è già in memoria)
  if (q) {
    customers = customers.filter((c) => {
      const name = [c.first_name, c.last_name].filter(Boolean).join(" ").toLowerCase();
      return name.includes(q) || (c.email ?? "").toLowerCase().includes(q);
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Gestione</p>
          <h2 className="text-2xl font-semibold tracking-tight">Clienti</h2>
          <p className="text-sm text-slate-400">Saldo, prenotazioni e accesso rapido al profilo.</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-300 ring-1 ring-inset ring-slate-700">
          {customers.length} clienti
        </span>
      </header>

      {/* Barra filtri */}
      <Card>
        <CardContent className="pt-4">
          <form action="/admin/clienti" method="get" className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="q"
                name="q"
                type="search"
                placeholder="Cerca per nome o email…"
                defaultValue={q}
                className="h-11 pl-9"
              />
            </div>
            <select
              name="sort"
              defaultValue={sort}
              className="h-11 rounded-xl bg-slate-950/40 px-3 text-sm text-slate-50 ring-1 ring-inset ring-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <option value="bookings_upcoming">Ordina: pren. future</option>
              <option value="balance_credits">Ordina: saldo</option>
              <option value="bookings_total">Ordina: totale pren.</option>
            </select>
            <Button type="submit" variant="primary" className="h-11">
              Cerca
            </Button>
          </form>
          {q && (
            <p className="mt-2 text-xs text-slate-400">
              Ricerca attiva: &quot;<span className="font-semibold text-cyan-300">{q}</span>&quot; —{" "}
              <Link href="/admin/clienti" className="text-slate-400 underline underline-offset-2 hover:text-slate-200">
                rimuovi filtro
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {customers.length ? (
        <div className="grid gap-3">
          {customers.map((c) => {
            const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
            const label = fullName || c.email || c.customer_id;
            const balance = c.balance_credits ?? 0;
            return (
              <Card key={c.customer_id}>
                <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar iniziali */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #06b6d4, #14b8a6)" }}
                    >
                      {(fullName || c.email || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-50 truncate">{label}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {c.email ?? "—"}{c.phone ? ` · ${c.phone}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <BalanceBadge credits={balance} />
                        <span className="text-[11px] text-slate-500">
                          {c.bookings_total ?? 0} prenotazioni totali · {c.bookings_upcoming ?? 0} future
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/admin/clienti/${c.customer_id}`} className="shrink-0">
                    <Button variant="secondary">Apri</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/60">
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-lg font-semibold tracking-tight">
              {q ? "Nessun risultato" : "Nessun cliente"}
            </p>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            {q
              ? `Nessun cliente trovato per "${q}". Prova a modificare la ricerca.`
              : "Quando gli utenti si registrano, compariranno qui."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
