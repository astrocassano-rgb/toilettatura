"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createTenantAction } from "./actions";
import { Building, Globe, Zap, AlertCircle, Loader2 } from "lucide-react";

export function NewTenantForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("LIGHT");
  const [endsAt, setEndsAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Genera lo slug in tempo reale mentre l'utente scrive il nome
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    
    // Converti in slug valido: minuscolo, rimuovi accenti, sostituisci spazi e speciali con -
    const suggestedSlug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Rimuove accenti
      .replace(/[^a-z0-9\s-]/g, "") // Rimuove caratteri non ammessi
      .trim()
      .replace(/\s+/g, "-") // Spazi diventano -
      .slice(0, 50);
    setSlug(suggestedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("slug", slug);
    formData.append("plan", plan);
    formData.append("subscription_ends_at", endsAt);

    const result = await createTenantAction(null, formData);
    
    if (result && result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/superadmin/tenants" as Route);
      router.refresh();
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md max-w-xl mx-auto">
      <CardHeader>
        <h3 className="text-lg font-semibold tracking-tight text-slate-50">Dettagli Nuovo Salone</h3>
        <p className="text-xs text-slate-500">Configura le credenziali di accesso e il profilo commerciale.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome Salone */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-slate-200">
              Nome del Salone
            </Label>
            <Input
              id="name"
              type="text"
              required
              placeholder="Es. Paw Spa Milano"
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
                placeholder="paw-spa-milano"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-xl pl-9"
              />
              <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            </div>
            {slug && (
              <p className="text-[11px] text-slate-500">
                Indirizzo web: <span className="font-mono text-violet-400 font-semibold">{slug}.dogwash24.it</span>
              </p>
            )}
          </div>

          {/* Piano commerciale */}
          <div className="space-y-2">
            <Label htmlFor="plan" className="text-sm font-medium text-slate-200">
              Piano Commerciale (Limiti)
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
              Scadenza Abbonamento (Opzionale)
            </Label>
            <Input
              id="endsAt"
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="bg-slate-950/40 border-slate-800 text-slate-100 rounded-xl"
            />
            <p className="text-[10px] text-slate-500">
              Lascia vuoto per non porre limiti temporali all&apos;account (es. abbonamento manuale o demo).
            </p>
          </div>

          {/* Pulsanti invio */}
          <div className="pt-2 flex justify-end gap-2">
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
              variant="primary"
              disabled={loading}
              className="rounded-xl min-w-[120px] gap-2 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Crea Salone"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
