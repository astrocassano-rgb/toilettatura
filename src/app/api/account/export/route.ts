import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  const profileRes = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const dogsRes = await supabase.from("dogs").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
  const walletRes = await supabase.from("wallets").select("*").eq("customer_id", user.id).maybeSingle();
  const bookingsRes = await supabase.from("bookings").select("*").eq("customer_id", user.id).order("start_time", { ascending: false });

  const profile = profileRes.data ?? null;
  const dogs = dogsRes.data ?? [];
  const wallet = walletRes.data ?? null;
  const bookings = bookingsRes.data ?? [];

  const walletId =
    wallet && typeof wallet === "object" && "id" in wallet ? (wallet as { id: string }).id : null;
  const tokenTransactionsRes = walletId
    ? await supabase.from("token_transactions").select("*").eq("wallet_id", walletId).order("created_at", { ascending: false })
    : { data: [] as unknown[] };
  const tokenTransactions = tokenTransactionsRes.data ?? [];

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    profile,
    dogs,
    wallet,
    token_transactions: tokenTransactions,
    bookings
  };

  const fileName = `export-${user.id}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`
    }
  });
}
