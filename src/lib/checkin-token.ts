import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

export type CheckinTokenPayload = {
  v: 1;
  booking_id: string;
  customer_id: string;
  station_id: string;
  valid_from: string;
  valid_until: string;
};

function getSecret() {
  const env = getEnv();
  if (!env) {
    throw new Error("Variabili ambiente mancanti.");
  }

  // Usa la service role se presente; in fallback usa la anon key per ambienti locali.
  return env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPart(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function signCheckinToken(payload: CheckinTokenPayload) {
  const encoded = encodeBase64Url(JSON.stringify(payload));
  const signature = signPart(encoded);
  return `${encoded}.${signature}`;
}

export function verifyCheckinToken(token: string): CheckinTokenPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = signPart(encoded);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(decodeBase64Url(encoded)) as Partial<CheckinTokenPayload>;
    if (
      parsed?.v !== 1 ||
      typeof parsed.booking_id !== "string" ||
      typeof parsed.customer_id !== "string" ||
      typeof parsed.station_id !== "string" ||
      typeof parsed.valid_from !== "string" ||
      typeof parsed.valid_until !== "string"
    ) {
      return null;
    }

    return parsed as CheckinTokenPayload;
  } catch {
    return null;
  }
}

export function buildCheckinQrValue(token: string) {
  return JSON.stringify({
    app: "DogWash24",
    kind: "checkin",
    token
  });
}
