import type { Database } from "@/types/database";

export type ActiveSession = Database["public"]["Tables"]["active_sessions"]["Row"];

export function getSessionEndsAt(session: Pick<ActiveSession, "activated_at" | "remaining_seconds">) {
  return new Date(new Date(session.activated_at).getTime() + session.remaining_seconds * 1000);
}

export function getRemainingSeconds(session: Pick<ActiveSession, "activated_at" | "remaining_seconds">, nowMs = Date.now()) {
  return Math.max(0, Math.ceil((getSessionEndsAt(session).getTime() - nowMs) / 1000));
}

export function isSessionLive(session: Pick<ActiveSession, "activated_at" | "remaining_seconds">, nowMs = Date.now()) {
  return getRemainingSeconds(session, nowMs) > 0;
}

export function formatRemainingTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${String(restMinutes).padStart(2, "0")}m`;
  }

  return `${restMinutes}m ${String(seconds).padStart(2, "0")}s`;
}
