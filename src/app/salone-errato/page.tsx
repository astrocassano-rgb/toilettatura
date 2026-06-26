"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ShieldAlert, LogOut, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SaloneErratoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const fromSalon = searchParams?.get("from") || "questo salone";
  const belongsToSalon = searchParams?.get("belongsTo") || "un altro salone";
  const belongsToSlug = searchParams?.get("belongsToSlug");

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      // Usiamo window.location per forzare un ricaricamento pulito della sessione
      window.location.href = "/login";
    } catch (err) {
      console.error("Errore durante la disconnessione:", err);
      setLoading(false);
    }
  };

  const getSalonUrl = (slug: string) => {
    if (typeof window === "undefined") return "#";
    const hostname = window.location.hostname;
    const port = window.location.port;
    if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
      return `http://${slug}.localhost${port ? `:${port}` : ""}`;
    }
    return `https://${slug}.app.dogwash24.it`;
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center p-4">
      {/* Background radial gradient decorativo */}
      <div className="absolute inset-0 -z-10 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)]" />
      </div>

      <Card className="w-full max-w-md border-rose-500/20 bg-slate-950/40 backdrop-blur-md shadow-2xl shadow-rose-950/15">
        <CardHeader className="flex flex-col items-center text-center space-y-2 pb-2">
          <div className="rounded-2xl p-3 bg-rose-500/10 text-rose-400">
            <ShieldAlert className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-50">Accesso Non Consentito</h2>
          <p className="text-xs text-slate-500">
            Fuga di sessione rilevata o account appartenente ad un altro salone.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 text-center">
          <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-850/80 text-sm text-slate-300 leading-relaxed text-left space-y-2.5">
            <p>
              Stai provando ad accedere a <span className="font-semibold text-violet-300">{fromSalon}</span>.
            </p>
            <p>
              Tuttavia, il tuo account attuale è registrato e collegato a{" "}
              <span className="font-semibold text-emerald-300">{belongsToSalon}</span>.
            </p>
            <p className="text-xs text-slate-500">
              Nel sistema DogWash24, ogni account utente appartiene strettamente ad un singolo salone per garantire la sicurezza del portafoglio e delle prenotazioni.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSignOut}
              disabled={loading}
              variant="primary"
              className="w-full rounded-xl gap-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-lg shadow-rose-950/40"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Disconnettiti ed Accedi
                </>
              )}
            </Button>

            {belongsToSlug && (
              <a href={getSalonUrl(belongsToSlug)} className="w-full">
                <Button
                  variant="secondary"
                  type="button"
                  className="w-full rounded-xl gap-2 hover:bg-slate-900"
                >
                  <span>Vai al tuo salone ({belongsToSalon})</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SaloneErratoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SaloneErratoContent />
    </Suspense>
  );
}
