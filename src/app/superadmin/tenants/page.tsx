import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/auth/require-superadmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  Building,
  Plus,
  ArrowLeft,
  Settings,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminTenantsPage() {
  await requireSuperAdmin({ next: "/superadmin/tenants", mode: "notFound" });
  const adminSupabase = createSupabaseAdminClient();

  const { data: tenants, error } = await adminSupabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Errore recupero saloni:", error.message);
  }

  const list = tenants || [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-violet-400">
            <ShieldCheck className="h-5 w-5" />
            <Link href={"/superadmin" as Route} className="text-xs font-semibold uppercase tracking-widest hover:underline">
              Dashboard
            </Link>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Gestione Saloni</h2>
          <p className="text-sm text-slate-400">Abilita, disabilita e gestisci gli abbonamenti e i dettagli dei tuoi partner.</p>
        </div>
        <div className="flex gap-2">
          <Link href={"/superadmin" as Route}>
            <Button variant="secondary" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Torna alla Home
            </Button>
          </Link>
          <Link href={"/superadmin/tenants/new" as Route}>
            <Button variant="primary" className="gap-2 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20">
              <Plus className="h-4 w-4" />
              Nuovo Salone
            </Button>
          </Link>
        </div>
      </header>

      <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
        <CardHeader>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Tutti i Saloni</h3>
          <p className="text-xs text-slate-500">Lista completa dei saloni abilitati sulla piattaforma.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Salone</th>
                  <th className="px-4 py-3">Slug Indirizzo</th>
                  <th className="px-4 py-3">Piano Attivo</th>
                  <th className="px-4 py-3">Stato Abbonamento</th>
                  <th className="px-4 py-3">Registrazione</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {list.map((tenant) => {
                  const ends = tenant.subscription_ends_at ? new Date(tenant.subscription_ends_at) : null;
                  const isExpired = ends ? ends < new Date() : false;
                  const created = new Date(tenant.created_at);

                  return (
                    <tr key={tenant.id} className="transition-all hover:bg-slate-900/10">
                      <td className="px-4 py-4 font-semibold text-slate-50">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-violet-400" />
                          {tenant.name}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-400">
                        {tenant.slug === "default" ? (
                          <a
                            href="https://app.dogwash24.it"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:text-violet-300 hover:underline transition-all"
                          >
                            app.dogwash24.it
                          </a>
                        ) : (
                          <a
                            href={`https://${tenant.slug}.app.dogwash24.it`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:text-violet-300 hover:underline transition-all"
                          >
                            {tenant.slug}.app.dogwash24.it
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                          tenant.plan === "ENTERPRISE"
                            ? "bg-purple-500/15 text-purple-300 ring-purple-500/20"
                            : tenant.plan === "PRO"
                              ? "bg-cyan-500/15 text-cyan-300 ring-cyan-500/20"
                              : "bg-slate-800 text-slate-400 ring-slate-700"
                        }`}>
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                          isExpired
                            ? "bg-rose-500/15 text-rose-300 ring-rose-500/20"
                            : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20"
                        }`}>
                          {isExpired ? "Scaduto" : "Attivo"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-400">
                        {created.toLocaleDateString("it-IT")}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/superadmin/tenants/${tenant.id}` as Route}>
                          <Button variant="secondary" className="h-9 px-3 gap-1">
                            <Settings className="h-3.5 w-3.5" />
                            Gestisci
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-sm text-slate-500">
                      Nessun salone configurato nel sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
