"use client";

import { useEffect, useMemo, useState } from "react";
import { formatRemainingTime } from "@/lib/active-sessions";

type Props = {
  activatedAt: string;
  remainingSeconds: number;
  expiredLabel?: string;
};

export function SessionCountdown({ activatedAt, remainingSeconds, expiredLabel = "Sessione scaduta" }: Props) {
  const endMs = useMemo(() => new Date(activatedAt).getTime() + remainingSeconds * 1000, [activatedAt, remainingSeconds]);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((endMs - nowMs) / 1000));

  return <>{secondsLeft > 0 ? formatRemainingTime(secondsLeft) : expiredLabel}</>;
}
