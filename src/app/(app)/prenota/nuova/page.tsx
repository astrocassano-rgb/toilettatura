"use client";

import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import BookingWizardClient from "./booking-wizard-client";
import PrenotaColonneClient from "./prenota-colonne-client";

export default function NuovaPrenotazionePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-300">Caricamento prenotazione...</div>}>
      <NuovaPrenotazioneContent />
    </Suspense>
  );
}

function NuovaPrenotazioneContent() {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={mode === "simple" ? "primary" : "secondary"}
          className="w-full"
          onClick={() => setMode("simple")}
        >
          Vista semplice
        </Button>
        <Button
          type="button"
          variant={mode === "advanced" ? "primary" : "secondary"}
          className="w-full"
          onClick={() => setMode("advanced")}
        >
          Vista avanzata
        </Button>
      </div>

      {mode === "simple" ? <BookingWizardClient /> : <PrenotaColonneClient />}
    </div>
  );
}
