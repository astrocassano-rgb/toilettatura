import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  STRIPE_SECRET_KEY: z.string().min(10).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(10).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(10).optional()
});

let cachedEnv: z.infer<typeof EnvSchema> | null = null;

function normalizeEnvValue(value: string | undefined) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function getEnv() {
  if (cachedEnv) return cachedEnv;
  const parsed = EnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
    STRIPE_SECRET_KEY: normalizeEnvValue(process.env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: normalizeEnvValue(process.env.STRIPE_WEBHOOK_SECRET),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: normalizeEnvValue(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  });

  if (!parsed.success) return null;
  cachedEnv = parsed.data;
  return cachedEnv;
}

export type Env = z.infer<typeof EnvSchema>;
