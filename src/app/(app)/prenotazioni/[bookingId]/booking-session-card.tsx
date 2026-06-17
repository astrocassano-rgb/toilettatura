"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock3, PlayCircle, QrCode } from "lucide-react";
import { toDataURL } from "qrcode";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SessionCountdown } from "@/components/sessions/session-countdown";

type SessionSummary = {
  id: string;
  activated_at: string;
  remaining_seconds: number;
};

type Props = {
  bookingId: string;
  startIso: string;
  endIso: string;
  stationName: string;
  checkinQrValue: string;
  activeSession: SessionSummary | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function BookingSessionCard({ bookingId, startIso, endIso, stationName, checkinQrValue, activeSession }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const bookingCode = useMemo(() => bookingId.replace(/-/g, "").slice(0, 8).toUpperCase(), [bookingId]);
  const nowMs = Date.now();
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const canStart = nowMs >= startMs && nowMs < endMs;
  const isExpired = nowMs >= endMs;

  useEffect(() => {
    let active = true;
    void toDataURL(checkinQrValue, {
      margin: 1,
      width: 280,
      color: {
        dark: "#E2E8F0",
        light: "#020617"
      }
    }).then((url) => {
      if (active) setQrDataUrl(url);
    });

    return () => {
      active = false;
    };
  }, [checkinQrValue]);

  async function startSession() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/session/start`, {
        method: "POST",
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(typeof payload?.error === "string" ? payload.error : "Impossibile avviare la sessione.");
        return;
      }
      setMessage("Sessione avviata. Il timer ora e visibile anche in admin.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <p className="text-xs font-medium text-slate-300">Check-in H24</p>
        <p className="text-lg font-semibold tracking-tight">Accesso alla postazione</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <div className="flex items-center gap-3">
              <QrCode className="h-5 w-5 text-slate-200" />
              <div>
                <p className="text-sm text-slate-300">Codice check-in</p>
                <p className="text-xl font-semibold tracking-[0.25em] text-slate-50">{bookingCode}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-1 h-5 w-5 text-slate-200" />
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-slate-300">Finestra attiva</p>
                  <p className="text-base font-semibold text-slate-50">
                    {formatDateTime(startIso)} - {new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(endIso))}
                  </p>
                </div>
                <p className="text-xs text-slate-400">La postazione usa il QR per sapere quando iniziare e quando chiudere la sessione.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
          <p className="text-sm font-medium text-slate-200">QR check-in</p>
          <p className="mt-1 text-xs text-slate-400">Da far leggere alla macchina o al tablet di struttura per validare la prenotazione e recuperare il timer.</p>
          <div className="mt-4 flex justify-center">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt={`QR check-in prenotazione ${bookingCode}`}
                width={224}
                height={224}
                unoptimized
                className="h-56 w-56 rounded-2xl ring-1 ring-inset ring-slate-800"
              />
            ) : (
              <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-slate-900/80 text-sm text-slate-400 ring-1 ring-inset ring-slate-800">
                Generazione QR...
              </div>
            )}
          </div>
        </div>

        {activeSession ? (
          <div className="rounded-3xl bg-emerald-500/10 p-4 ring-1 ring-inset ring-emerald-500/30">
            <p className="text-sm font-medium text-emerald-200">Sessione attiva su {stationName}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              <SessionCountdown activatedAt={activeSession.activated_at} remainingSeconds={activeSession.remaining_seconds} />
            </p>
            <p className="mt-1 text-sm text-slate-300">Alla scadenza la sessione va chiusa lato struttura o passa allo step successivo operativo.</p>
          </div>
        ) : (
          <div className="rounded-3xl bg-slate-950/40 p-4 text-sm text-slate-300 ring-1 ring-inset ring-slate-800">
            {isExpired
              ? "La finestra di questa prenotazione e terminata."
              : canStart
                ? `La tua prenotazione e attiva. Puoi avviare il check-in sulla postazione ${stationName}.`
                : `Il check-in si apre all'orario prenotato: ${formatDateTime(startIso)}.`}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="primary" className="w-full sm:w-auto" onClick={startSession} disabled={pending || Boolean(activeSession) || !canStart}>
            <PlayCircle className="h-5 w-5" />
            {pending ? "Avvio in corso..." : activeSession ? "Sessione gia avviata" : "Avvia check-in"}
          </Button>
        </div>

        {message ? <p className="text-sm text-slate-200">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
