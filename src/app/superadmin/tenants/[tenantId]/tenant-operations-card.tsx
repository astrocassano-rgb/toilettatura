"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import {
  Settings2, CalendarPlus, PauseCircle, PlayCircle, Loader2, BadgeCheck, CalendarClock,
} from "lucide-react";
import {
  extendSubscriptionAction, suspendTenantAction, reactivateTenantAction, changePlanAction,
} from "./actions";

interface Props {
  tenantId: string;
  plan: string;
  subscriptionEndsAt: string | null;
}

const PLANS = ["LIGHT", "PRO", "ENTERPRISE"] as const;

type ActionResult = { success?: boolean; message?: string; error?: string };

export function TenantOperationsCard({ tenantId, plan, subscriptionEndsAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(plan);

  const ends = subscriptionEndsAt ? new Date(subscriptionEndsAt) : null;
  const isExpired = ends ? ends.getTime() < Date.now() : false;

  // Esegue una server action, mostra il toast e ricarica i dati lato server.
  const run = (key: string, fn: () => Promise<ActionResult>) => {
    setBusy(key);
    startTransition(async () => {
      try {
        const res = await fn();
        if (res?.error) toast.error(res.error);
        else {
          toast.success(res?.message || "Operazione completata.");
          router.refresh();
        }
      } catch (err: any) {
        toast.error(err?.message || "Errore imprevisto.");
      } finally {
        setBusy(null);
      }
    });
  };

  const disabled = isPending || busy !== null;

  return (
    <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md max-w-xl mx-auto">
      <Toaster richColors theme="dark" position="bottom-right" />
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="rounded-xl p-2.5 bg-cyan-500/15 text-cyan-300">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Azioni Operative</h3>
          <p className="text-xs text-slate-500">Gestisci abbonamento e piano commerciale del salone.</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stato attuale */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/20 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400">Scadenza:</span>
            <span className="font-medium text-slate-100">
              {ends ? ends.toLocaleDateString("it-IT") : "Senza scadenza"}
            </span>
          </div>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
            isExpired
              ? "bg-rose-500/15 text-rose-300 ring-rose-500/20"
              : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20"
          }`}>
            {isExpired ? "Scaduto/Sospeso" : "Attivo"}
          </span>
        </div>

        {/* Proroga abbonamento */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Proroga abbonamento</p>
          <div className="flex flex-wrap gap-2">
            {[1, 3, 12].map((m) => (
              <Button
                key={m}
                variant="secondary"
                disabled={disabled}
                onClick={() => run(`extend-${m}`, () => extendSubscriptionAction(tenantId, m))}
                className="gap-1.5 rounded-xl"
              >
                {busy === `extend-${m}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                +{m} mes{m === 1 ? "e" : "i"}
              </Button>
            ))}
          </div>
        </div>

        {/* Sospendi / Riattiva */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stato del salone</p>
          <div className="flex flex-wrap gap-2">
            {isExpired ? (
              <Button
                variant="primary"
                disabled={disabled}
                onClick={() => run("reactivate", () => reactivateTenantAction(tenantId, 12))}
                className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 border-none text-white shadow-lg shadow-emerald-900/20"
              >
                {busy === "reactivate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                Riattiva (+12 mesi)
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={disabled}
                onClick={() => run("suspend", () => suspendTenantAction(tenantId))}
                className="gap-1.5 rounded-xl text-rose-300 border-rose-500/10 hover:bg-rose-950/20 hover:text-rose-200"
              >
                {busy === "suspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                Sospendi salone
              </Button>
            )}
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            La sospensione imposta la scadenza a ora: i clienti vengono reindirizzati alla pagina &quot;abbonamento scaduto&quot;.
          </p>
        </div>

        {/* Cambio piano */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Piano commerciale</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPlan}
              disabled={disabled}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:border-violet-500/50 focus:outline-none"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Button
              variant="primary"
              disabled={disabled || selectedPlan === plan}
              onClick={() => run("plan", () => changePlanAction(tenantId, selectedPlan))}
              className="gap-1.5 rounded-xl"
            >
              {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
              Aggiorna piano
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
