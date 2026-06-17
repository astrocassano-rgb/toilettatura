import { createSupabaseServerClient } from "@/lib/supabase/server";

type WalletPackId = "starter" | "premium" | "max";

const packCredits: Record<WalletPackId, number> = {
  starter: 10,
  premium: 30,
  max: 65
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const pack = (body && typeof body === "object" && "pack" in body ? String((body as any).pack) : "") as WalletPackId;
  const credits = packCredits[pack];

  if (!credits) {
    return Response.json({ error: "Pacchetto non valido" }, { status: 400 });
  }

  const reference = `demo:${crypto.randomUUID()}`;
  const { data, error } = await (supabase as any).rpc("apply_wallet_topup", {
    p_amount_credits: credits,
    p_amount_currency: 0,
    p_reference: reference
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : null;
  return Response.json({ ok: true, applied: row?.applied ?? true, balance_credits: row?.balance_credits ?? null });
}
