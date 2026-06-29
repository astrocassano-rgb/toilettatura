"use server";

import { Suspense } from "react";
import InfoForm from "./info-form";

export default async function RichiediInfoPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-50 px-4 py-12 relative overflow-hidden">
      {/* Sfondo sfumato premium */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-teal-500/5 blur-[130px]" />
      </div>

      <Suspense fallback={
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/40 p-8 backdrop-blur-xl animate-pulse h-[600px] flex items-center justify-center">
          <p className="text-slate-400 text-sm">Caricamento modulo...</p>
        </div>
      }>
        <InfoForm />
      </Suspense>
    </div>
  );
}
