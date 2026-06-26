"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { updateTenantAction, deleteTenantAction } from "./actions";
import { Globe, AlertCircle, Loader2, Trash2, ShieldAlert } from "lucide-react";
import type { Database } from "@/types/database";

type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

export function EditTenantForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [plan, setPlan] = useState(tenant.plan);
  const [endsAt, setEndsAt] = useState(
    tenant.subscription_ends_at 
      ? new Date(tenant.subscription_ends_at).toISOString().split("T")[0] || ""
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("tenant_id", tenant.id);
    formData.append("name", name);
    formData.append("slug", slug);
    formData.append("plan", plan);
    formData.append("subscription_ends_at", endsAt);

    const result = await updateTenantAction(null, formData);
    
    if (result && result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/superadmin/tenants" as Route);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("tenant_id", tenant.id);

    const result = await deleteTenantAction(null, formData);

    if (result && result.error) {
      setError(result.error);
      setDeleteLoading(false);
      setShowConfirmDelete(false);
    } else {
      router.push("/superadmin/tenants" as Route);
      router.refresh();
    }
  };

  const handleSuspend = () => {
    // Sospendi impostando la data a ieri
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setEndsAt(yesterday.toISOString().split("T")[0] || "");
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md">
        <CardHeader>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Modifica Salone</h3>
          <p className="text-xs text-slate-500">Gestisci i parametri commerciali e lo stato dell&apos;abbonamento.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ID (Sola lettura) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-400">ID Salone</Label>
              <div className="font-mono text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-850 text-slate-500">
                {tenant.id}
              </div>
            </div>

            {/* Nome Salone */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-200">
                Nome del Salone
              </Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-xl"
              />
            </div>

            {/* Slug URL */}
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-medium text-slate-200">
                Sotto-dominio (Slug)
              </Label>
              <div className="relative">
                <Input
                  id="slug"
                  type="text"
                  required
                  placeholder="paw-spa"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-xl pl-9"
                />
                <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              </div>
              {slug && (
                <p className="text-[11px] text-slate-500">
                  {"Indirizzo web: "}
                  <a
                    href={`https://${slug}.app.dogwash24.it`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-violet-400 hover:text-violet-300 font-semibold underline decoration-violet-500/30 hover:decoration-violet-500/70 transition-all"
                  >
                    {slug}.app.dogwash24.it
                  </a>
                </p>
              )}
            </div>

            {/* Piano commerciale */}
            <div className="space-y-2">
              <Label htmlFor="plan" className="text-sm font-medium text-slate-200">
                Piano Commerciale
              </Label>
              <select
                id="plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="h-11 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 text-sm text-slate-100 ring-offset-slate-950 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="LIGHT">LIGHT (Max 100 prenotazioni/mese)</option>
                <option value="PRO">PRO (Postazioni illimitate, SMS notifiche)</option>
                <option value="ENTERPRISE">ENTERPRISE (Personalizzazioni totali)</option>
              </select>
            </div>

            {/* Scadenza abbonamento */}
            <div className="space-y-2">
              <Label htmlFor="endsAt" className="text-sm font-medium text-slate-200">
                Scadenza Abbonamento
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="endsAt"
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="bg-slate-950/40 border-slate-800 text-slate-100 rounded-xl"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSuspend}
                  className="rounded-xl border-rose-500/20 hover:bg-rose-950/20 hover:text-rose-200 whitespace-nowrap text-xs"
                >
                  Sospendi Salone
                </Button>
              </div>
              <p className="text-[10px] text-slate-500">
                L&apos;abbonamento scadrà alla fine del giorno impostato. Se sospendi il salone, la scadenza verrà impostata ad ieri bloccando immediatamente tutte le prenotazioni.
              </p>
            </div>

            {/* Pulsanti invio */}
            <div className="pt-2 flex justify-between gap-2">
              {!showConfirmDelete && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowConfirmDelete(true)}
                  className="rounded-xl border-rose-500/30 text-rose-400 hover:bg-rose-950/25 hover:text-rose-300 gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina Salone
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => router.push("/superadmin/tenants" as Route)}
                  className="rounded-xl"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  variant="primary"
                  className="rounded-xl min-w-[120px] gap-2 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    "Salva Modifiche"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Pannello conferma eliminazione */}
      {showConfirmDelete && (
        <Card className="border-rose-500/30 bg-rose-950/10 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="rounded-xl p-2 bg-rose-500/15 text-rose-300">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-rose-100">Sei assolutamente sicuro?</h3>
              <p className="text-xs text-rose-300/80">L&apos;azione è irreversibile.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              L&apos;eliminazione del salone cancellerà **definitivamente** tutti i dati associati, inclusi i profili dei clienti locali, le postazioni, i crediti dei portafogli, lo storico delle transazioni e le sessioni attive.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={deleteLoading}
                onClick={() => setShowConfirmDelete(false)}
                className="rounded-xl"
              >
                Annulla
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={deleteLoading}
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5 shadow-lg shadow-rose-900/30"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  "Conferma Eliminazione"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
