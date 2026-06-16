import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function isInvalidRefreshTokenError(error: unknown) {
  const message = String((error as any)?.message ?? "");
  const lower = message.toLowerCase();
  return lower.includes("invalid refresh token") || lower.includes("refresh token not found");
}

export async function safeGetSession(supabase: SupabaseClient<Database>) {
  try {
    const result = await supabase.auth.getSession();
    if (result.error && isInvalidRefreshTokenError(result.error)) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      return { data: { session: null }, error: null as any };
    }
    return result;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      return { data: { session: null }, error: null as any };
    }
    throw error;
  }
}

