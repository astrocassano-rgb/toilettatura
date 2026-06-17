import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId } as any);
  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const result = (data?.[0] ?? null) as null | { cancelled: boolean; refunded: boolean; refund_credits: number };
  const search = new URLSearchParams();
  if (result?.cancelled) {
    search.set("cancelled", "1");
    if (result.refunded) search.set("refund", String(result.refund_credits));
  }

  const target = `/prenotazioni/${bookingId}${search.toString() ? `?${search.toString()}` : ""}`;
  return NextResponse.redirect(new URL(target, request.url), 303);
}
