import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Dog = Database["public"]["Tables"]["dogs"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
type Tx = Database["public"]["Tables"]["token_transactions"]["Row"];

export const dynamic = "force-dynamic";

function fmtDateTime(value: string) {
  const d = new Date(value);
  const day = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "2-digit", month: "short" }).format(d);
  const time = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(d);
  return `${day} · ${time}`;
}

export default async function AdminClienteDettaglioPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const { supabase } = await requireAdmin({ next: `/admin/clienti/${customerId}`, mode: "notFound" });

  const [{ data: profile }, { data: dogs }, { data: wallet }, { data: bookings }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", customerId).maybeSingle(),
    supabase.from("dogs").select("*").eq("owner_id", customerId).order("created_at", { ascending: false }),
    supabase.from("wallets").select("*").eq("customer_id", customerId).maybeSingle(),
    supabase.from("bookings").select("*").eq("customer_id", customerId).order("start_time", { ascending: false }).limit(30)
  ]);

  if (!profile) notFound();

  const profileRow = profile as Profile;
  const dogsRows = (dogs ?? []) as Dog[];
  const walletRow = (wallet ?? null) as Wallet | null;
  const bookingsRows = (bookings ?? []) as Booking[];

  const walletId = walletRow?.id ?? null;
  const { data: txs } = walletId
    ? await supabase.from("token_transactions").select("*").eq("wallet_id", walletId).order("created_at", { ascending: false }).limit(30)
    : { data: [] as Tx[] };

  const txRows = (txs ?? []) as Tx[];
  const fullName = [profileRow.first_name, profileRow.last_name].filter(Boolean).join(" ").trim();
  const title = fullName || profileRow.email || customerId;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/admin/clienti">
          <Button variant="ghost" className="px-0">Clienti</Button>
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm leading-relaxed text-slate-200">Profilo, cani, prenotazioni e wallet.</p>
      </header>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Profilo</p>
          <p className="text-lg font-semibold tracking-tight">Dati cliente</p>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-slate-200">
          <div>Email: {profileRow.email ?? "—"}</div>
          <div>Telefono: {profileRow.phone ?? "—"}</div>
          <div>ID: {profileRow.id}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Wallet</p>
          <p className="text-lg font-semibold tracking-tight">Saldo e ricarica manuale</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <p className="text-sm font-semibold text-slate-50">{walletRow?.balance_credits ?? 0} crediti</p>
            <p className="mt-1 text-xs text-slate-300">Saldo reale da database.</p>
          </div>

          <form action="/api/admin/wallet/adjust" method="post" className="grid gap-3">
            <input type="hidden" name="customer_id" value={customerId} />
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount_credits">Crediti (positivo = accredito, negativo = storno)</Label>
                <Input id="amount_credits" name="amount_credits" placeholder="es. 10 oppure -5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Input id="reason" name="reason" placeholder="es. Bonus test / Rimborso manuale" />
              </div>
            </div>
            <Button variant="primary" type="submit">Applica</Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Cani</p>
            <p className="text-lg font-semibold tracking-tight">Profili cane</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {dogsRows.length ? (
              dogsRows.map((d) => (
                <div key={d.id} className="rounded-2xl bg-slate-950/40 p-3 text-sm text-slate-200 ring-1 ring-inset ring-slate-800">
                  <div className="font-semibold text-slate-50">{d.name}</div>
                  <div className="text-xs text-slate-300">{d.size} · {d.weight ?? "—"} kg</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-300">Nessun cane inserito.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Movimenti</p>
            <p className="text-lg font-semibold tracking-tight">Token transactions</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {txRows.length ? (
              txRows.map((t) => (
                <div key={t.id} className="rounded-2xl bg-slate-950/40 p-3 text-sm text-slate-200 ring-1 ring-inset ring-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-50">{t.type}</div>
                    <div className="text-sm font-semibold">{t.amount_credits} crediti</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-300">{fmtDateTime(t.created_at)}{t.note ? ` · ${t.note}` : ""}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-300">Nessun movimento.</div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Prenotazioni</p>
          <p className="text-lg font-semibold tracking-tight">Storico recente</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {bookingsRows.length ? (
            bookingsRows.map((b) => (
              <div key={b.id} className="rounded-2xl bg-slate-950/40 p-3 text-sm text-slate-200 ring-1 ring-inset ring-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-50">{fmtDateTime(b.start_time)} – {fmtDateTime(b.end_time).split(" · ")[1]}</div>
                    <div className="text-xs text-slate-300">Stato: {b.status} · {b.total_credits} crediti</div>
                  </div>
                  <Link href={`/prenotazioni/${b.id}`}>
                    <Button variant="secondary">Dettagli</Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-300">Nessuna prenotazione.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
