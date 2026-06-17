"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

function computeRefundRatio(minutesToStart: number) {
  if (minutesToStart >= 2880) return 1;
  if (minutesToStart >= 1440) return 0.7;
  if (minutesToStart >= 720) return 0.5;
  if (minutesToStart >= 480) return 0.25;
  return 0;
}

export function CancelBookingCard({
  bookingId,
  startIso,
  totalCredits
}: {
  bookingId: string;
  startIso: string;
  totalCredits: number;
}) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const preview = useMemo(() => {
    if (nowMs === null) {
      return { refundCredits: null as number | null, feeCredits: null as number | null };
    }

    const minutesToStart = (new Date(startIso).getTime() - nowMs) / 60_000;
    const refundRatio = computeRefundRatio(minutesToStart);
    const refundCredits = Math.round(totalCredits * refundRatio * 100) / 100;
    const feeCredits = Math.max(0, Math.round((totalCredits - refundCredits) * 100) / 100);
    return { refundCredits, feeCredits };
  }, [nowMs, startIso, totalCredits]);

  return (
    <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
      <p className="text-sm font-semibold text-slate-50">Cancellazione</p>
      <p className="mt-1 text-sm text-slate-300">
        Regole rimborso: 48h+ 100% · 24–48h 70% · 12–24h 50% · 8–12h 25% · &lt;8h 0%.
      </p>
      <p className="mt-2 text-sm text-slate-200">
        Rimborso previsto:{" "}
        <span className="font-semibold text-slate-50">
          {preview.refundCredits === null ? "..." : preview.refundCredits}
        </span>{" "}
        crediti · Penale:{" "}
        <span className="font-semibold text-slate-50">
          {preview.feeCredits === null ? "..." : preview.feeCredits}
        </span>{" "}
        crediti
      </p>
      <p className="mt-1 text-xs text-slate-400">La stima dipende dall&apos;orario al momento della cancellazione.</p>
      <form action={`/api/bookings/${bookingId}/cancel`} method="post" className="mt-3">
        <Button variant="secondary" type="submit" className="w-full">
          Annulla prenotazione
        </Button>
      </form>
    </div>
  );
}
