"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { tryCreateSupabaseBrowserClient } from "@/lib/supabase/optional";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-10 text-sm text-slate-200">Completiamo l’accesso...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => tryCreateSupabaseBrowserClient(), []);
  const [message, setMessage] = useState<string>("Completiamo l'accesso...");

  useEffect(() => {
    if (!supabase) {
      setMessage("Supabase non configurato.");
      return;
    }

    const next = (() => {
      const raw = searchParams?.get("next");
      return raw && raw.startsWith("/") ? raw : "/";
    })();

    void (async () => {
      try {
        const code = searchParams?.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMessage(String(error.message || "Accesso non riuscito."));
            return;
          }
        } else {
          const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
          const hashParams = new URLSearchParams(hash);

          if (hashParams.get("error") || hashParams.get("error_code")) {
            setMessage("Link non valido o scaduto. Genera un nuovo link e riprova.");
            return;
          }

          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (error) {
              setMessage(String(error.message || "Accesso non riuscito."));
              return;
            }
          } else {
            setMessage("Link non valido o incompleto. Genera un nuovo link e riprova.");
            return;
          }
        }

        if (typeof window !== "undefined" && window.location.hash) {
          const cleaned = `${window.location.pathname}${window.location.search}`;
          window.history.replaceState({}, document.title, cleaned);
        }

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          setMessage(String(error?.message || "Sessione non trovata dopo il login."));
          return;
        }

        router.replace(next as Route);
        router.refresh();
      } catch (e: any) {
        setMessage(String(e?.message ?? "Accesso non riuscito."));
      }
    })();
  }, [router, searchParams, supabase]);

  return <div className="mx-auto max-w-md px-4 py-10 text-sm text-slate-200">{message}</div>;
}
