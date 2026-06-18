import { requireAdmin } from "@/lib/auth/require-admin";
import { CouponsClient } from "./coupons-client";
import type { Database } from "@/types/database";

type Coupon = Database["public"]["Tables"]["coupons"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const { supabase } = await requireAdmin({ next: "/admin/coupons", mode: "notFound" });

  const { data } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  const coupons = (data ?? []) as Coupon[];
  const now = new Date().toISOString();
  const active = coupons.filter((c) => {
    const notExpired = !c.expires_at || c.expires_at > now;
    const notExhausted = c.max_uses === null || (c.current_uses ?? 0) < c.max_uses;
    return notExpired && notExhausted;
  }).length;
  const expired = coupons.length - active;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Promozioni</p>
          <h2 className="text-2xl font-semibold tracking-tight">Gestione Coupon</h2>
          <p className="text-sm text-slate-400">
            Crea e gestisci i codici promozionali per accreditare token gratuiti nel wallet degli utenti.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200 ring-1 ring-inset ring-emerald-500/25">
            {active} attivi
          </span>
          {expired > 0 && (
            <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-400 ring-1 ring-inset ring-slate-700">
              {expired} scaduti/esauriti
            </span>
          )}
        </div>
      </header>

      <CouponsClient initialCoupons={coupons} />
    </div>
  );
}
