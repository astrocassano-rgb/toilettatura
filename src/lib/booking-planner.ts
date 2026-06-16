import type { Database } from "@/types/database";

export type StationType = Database["public"]["Enums"]["station_type"];
export type DogSize = Database["public"]["Enums"]["dog_size"];
export type DogProfile = Pick<Database["public"]["Tables"]["dogs"]["Row"], "name" | "size" | "weight"> | null;

export const SERVICE_LABELS: Record<StationType, string> = {
  WASH_BASIN: "Lavaggio",
  DRYING_ZONE: "Asciugatura",
  GROOMING_TABLE: "Toelettatura"
};

const SERVICE_ORDER: StationType[] = ["WASH_BASIN", "DRYING_ZONE", "GROOMING_TABLE"];

const SERVICE_BASE_MINUTES: Record<StationType, Record<DogSize, number>> = {
  WASH_BASIN: {
    SMALL: 20,
    MEDIUM: 30,
    LARGE: 40,
    GIANT: 50
  },
  DRYING_ZONE: {
    SMALL: 10,
    MEDIUM: 15,
    LARGE: 20,
    GIANT: 25
  },
  GROOMING_TABLE: {
    SMALL: 20,
    MEDIUM: 30,
    LARGE: 40,
    GIANT: 50
  }
};

function clampToQuarterHour(value: number) {
  const clamped = Math.max(15, value);
  return Math.ceil(clamped / 15) * 15;
}

export function normalizeServiceBundle(services: StationType[]) {
  return Array.from(new Set(services)).sort((a, b) => SERVICE_ORDER.indexOf(a) - SERVICE_ORDER.indexOf(b));
}

export function parseServiceBundle(value: string | null | undefined) {
  if (!value) return ["WASH_BASIN"] as StationType[];
  const parts = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is StationType => SERVICE_ORDER.includes(item as StationType));
  return normalizeServiceBundle(parts.length ? parts : ["WASH_BASIN"]);
}

export function serializeServiceBundle(services: StationType[]) {
  return normalizeServiceBundle(services).join(",");
}

export function getPrimaryService(services: StationType[]) {
  return normalizeServiceBundle(services)[0] ?? "WASH_BASIN";
}

export function getServiceSummary(services: StationType[]) {
  return normalizeServiceBundle(services)
    .map((service) => SERVICE_LABELS[service])
    .join(" + ");
}

export function estimateDurationForBundle(services: StationType[], dog: DogProfile) {
  const normalized = normalizeServiceBundle(services);
  const size: DogSize = dog?.size ?? "MEDIUM";
  const weight = dog?.weight ?? null;

  const baseMinutes = normalized.reduce((sum, service) => sum + SERVICE_BASE_MINUTES[service][size], 0);

  let weightAdjustment = 0;
  if (weight !== null) {
    if (weight >= 45) weightAdjustment = 15;
    else if (weight >= 30) weightAdjustment = 10;
    else if (weight >= 15) weightAdjustment = 5;
  }

  const suggestedMinutes = clampToQuarterHour(baseMinutes + weightAdjustment);
  const choices = Array.from(
    new Set([
      Math.max(15, suggestedMinutes - 15),
      suggestedMinutes,
      suggestedMinutes + 15,
      suggestedMinutes + 30
    ])
  ).sort((a, b) => a - b);

  return {
    suggestedMinutes,
    baseMinutes,
    weightAdjustment,
    choices
  };
}

function toGoogleDateTime(iso: string) {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function createGoogleCalendarUrl(args: {
  title: string;
  details?: string;
  location?: string;
  startIso: string;
  endIso: string;
}) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: args.title,
    dates: `${toGoogleDateTime(args.startIso)}/${toGoogleDateTime(args.endIso)}`
  });

  if (args.details) params.set("details", args.details);
  if (args.location) params.set("location", args.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

