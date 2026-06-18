"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Registra l'errore in console (o invialo a Sentry)
    console.error("Admin Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/50 p-6 text-center backdrop-blur-md">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 ring-1 ring-inset ring-rose-500/20">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight text-slate-100">Errore di Caricamento</h2>
      <p className="mb-6 max-w-md text-sm text-slate-400">
        Si è verificato un problema imprevisto durante il rendering della dashboard. Riprova o contatta il supporto tecnico se il problema persiste.
      </p>
      
      <div className="mb-8 rounded-xl bg-slate-950 p-3 text-xs font-mono text-slate-500">
        {error.message || "Errore sconosciuto"}
        {error.digest && <div className="mt-1">Digest: {error.digest}</div>}
      </div>

      <button
        onClick={() => reset()}
        className="flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95"
      >
        <RotateCcw className="h-4 w-4" />
        Riprova a caricare
      </button>
    </div>
  );
}
