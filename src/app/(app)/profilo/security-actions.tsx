"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tryCreateSupabaseBrowserClient } from "@/lib/supabase/optional";

export function ProfileSecurityActions({ mode }: { mode?: "password" | "delete" } = {}) {
  const router = useRouter();
  const supabase = useMemo(() => tryCreateSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const actionMode = mode ?? "password";

  async function updatePassword() {
    if (!supabase) return;
    setMessage(null);
    if (password.length < 8) {
      setMessage("Password troppo corta (minimo 8 caratteri).");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(error.message || "Impossibile aggiornare la password.");
        return;
      }
      setPassword("");
      setMessage("Password aggiornata.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount() {
    if (!supabase) return;
    setMessage(null);
    if (!window.confirm("Vuoi cancellare definitivamente l'account?")) return;
    setLoading(true);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(payload?.error ?? "Impossibile cancellare l'account.");
        return;
      }
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (actionMode === "delete") {
    return (
      <div className="grid gap-2">
        {message ? <div className="rounded-2xl bg-slate-900/60 p-3 text-sm text-slate-200 ring-1 ring-inset ring-slate-800">{message}</div> : null}
        <Button variant="secondary" type="button" onClick={() => void deleteAccount()} disabled={!supabase || loading}>
          {loading ? "Eliminazione..." : "Cancella account"}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
      <p className="text-sm font-semibold text-slate-50">Cambia password</p>
      <p className="mt-1 text-sm text-slate-300">Imposta una nuova password per l’accesso.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          type="password"
          placeholder="Nuova password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={!supabase || loading}
          autoComplete="new-password"
        />
        <Button variant="secondary" type="button" onClick={() => void updatePassword()} disabled={!supabase || loading}>
          {loading ? "Salvataggio..." : "Aggiorna"}
        </Button>
      </div>
      {message ? <div className="mt-3 text-sm text-slate-200">{message}</div> : null}
    </div>
  );
}

