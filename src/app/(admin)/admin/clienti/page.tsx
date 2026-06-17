import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Database } from "@/types/database";

type CustomerOverview = Database["public"]["Views"]["admin_customers_overview"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminClientiPage() {
  const { supabase } = await requireAdmin({ next: "/admin/clienti", mode: "notFound" });

  const { data } = await supabase
    .from("admin_customers_overview")
    .select("customer_id, email, first_name, last_name, phone, balance_credits, bookings_total, bookings_upcoming")
    .order("bookings_upcoming", { ascending: false })
    .limit(100);

  const customers = (data ?? []) as CustomerOverview[];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Clienti</h2>
        <p className="text-sm leading-relaxed text-slate-200">Lista rapida clienti con saldo e conteggio prenotazioni.</p>
      </header>

      {customers.length ? (
        <div className="grid gap-3">
          {customers.map((c) => {
            const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
            const label = fullName || c.email || c.customer_id;
            return (
              <Card key={c.customer_id}>
                <CardContent className="flex flex-col gap-3 pt-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-50 truncate">{label}</p>
                    <p className="text-xs text-slate-300 truncate">
                      {c.email ?? "—"} · {c.phone ?? "—"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Saldo: {c.balance_credits ?? 0} crediti · Prenotazioni: {c.bookings_total} · Future: {c.bookings_upcoming}
                    </p>
                  </div>
                  <Link href={`/admin/clienti/${c.customer_id}`}>
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
            <p className="text-xs font-medium text-slate-300">Vuoto</p>
            <p className="text-lg font-semibold tracking-tight">Nessun cliente</p>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">Quando gli utenti si registrano, compariranno qui.</CardContent>
        </Card>
      )}
    </div>
  );
}

