"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PawPrint, Save } from "lucide-react";
import { tryCreateSupabaseBrowserClient } from "@/lib/supabase/optional";
import type { Database } from "@/types/database";

type DogSize = Database["public"]["Enums"]["dog_size"];

const sizes: { value: DogSize; label: string }[] = [
  { value: "SMALL", label: "Piccolo" },
  { value: "MEDIUM", label: "Medio" },
  { value: "LARGE", label: "Grande" },
  { value: "GIANT", label: "Gigante" }
];

export default function NuovoCanePage() {
  const router = useRouter();
  const supabase = tryCreateSupabaseBrowserClient();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState<DogSize>("MEDIUM");
  const [weightKg, setWeightKg] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canSave = useMemo(() => name.trim().length >= 2 && !isSaving, [name, isSaving]);

  const saveDog = async () => {
    if (!supabase || !canSave) return;
    setIsSaving(true);
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      alert("Devi effettuare l'accesso per aggiungere un cane.");
      setIsSaving(false);
      return;
    }

    const weight = weightKg.trim() ? Number(weightKg.replace(",", ".")) : null;
    const finalWeight = weight && Number.isFinite(weight) && weight > 0 ? Math.round(weight * 10) / 10 : null;

    const { error } = await supabase.from("dogs").insert({
      owner_id: userData.user.id,
      name: name.trim(),
      breed: breed.trim() || null,
      size,
      weight: finalWeight,
      notes: notes.trim() || null
    });

    setIsSaving(false);
    if (!error) {
      router.push("/cani");
    } else {
      alert("Errore durante il salvataggio: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Registra un cane</h2>
        <p className="text-sm leading-relaxed text-slate-200">Inserisci i dati principali. Puoi aggiornarli in qualsiasi momento.</p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Scheda</p>
            <p className="text-lg font-semibold tracking-tight">Dati del cane</p>
          </div>
          <div className="rounded-2xl bg-slate-950/40 p-3 ring-1 ring-inset ring-slate-800">
            <PawPrint className="h-5 w-5 text-blue-300" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Luna" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="breed">Razza (opzionale)</Label>
            <Input id="breed" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Es. Labrador" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="size">Taglia</Label>
              <select
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value as DogSize)}
                className="h-12 w-full rounded-xl bg-slate-950/40 px-3 text-sm text-slate-50 ring-1 ring-inset ring-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {sizes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg, opzionale)</Label>
              <Input
                id="weight"
                inputMode="decimal"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Es. 12.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note (opzionale)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergie, preferenze, ecc." />
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => router.back()}
              type="button"
            >
              Annulla
            </Button>
            <Button
              className="flex-1"
              variant="primary"
              disabled={!canSave}
              onClick={saveDog}
              type="button"
            >
              <Save className="h-5 w-5" />
              Salva
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

