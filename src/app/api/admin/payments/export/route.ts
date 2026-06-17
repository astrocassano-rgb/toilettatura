import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Tx = Database["public"]["Tables"]["token_transactions"]["Row"];
type Wallet = Pick<Database["public"]["Tables"]["wallets"]["Row"], "id" | "customer_id">;
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "email" | "first_name" | "last_name">;
type PeriodFilter = "7d" | "30d" | "90d" | "all";
type MovementFilter = "ALL" | "CHARGE" | "DEBIT" | "BONUS";

function isAdminUser(user: any) {
  return Boolean(user && user.app_metadata && user.app_metadata.role === "admin");
}

function inferChargePack(amountCredits: number) {
  if (amountCredits === 10) return "Starter";
  if (amountCredits === 30) return "Premium";
  if (amountCredits === 65) return "Max";
  return "Custom";
}

function resolvePeriodStart(period: PeriodFilter, now: Date) {
  if (period === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (period === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return null;
}

function isIsoDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toUtcIsoStart(day: string) {
  return `${day}T00:00:00.000Z`;
}

function toUtcIsoNextDayStart(day: string) {
  const [y, m, d] = day.split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0)).toISOString();
}

function csvEscape(value: unknown) {
  const raw = String(value ?? "");
  const escaped = raw.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user as any;

  if (!user) {
    return Response.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return Response.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const url = new URL(request.url);
  const periodRaw = url.searchParams.get("period") ?? "30d";
  const typeRaw = url.searchParams.get("type") ?? "ALL";
  const fromRaw = url.searchParams.get("from") ?? "";
  const toRaw = url.searchParams.get("to") ?? "";
  const period = (["7d", "30d", "90d", "all"].includes(periodRaw) ? periodRaw : "30d") as PeriodFilter;
  const movementType = (["ALL", "CHARGE", "DEBIT", "BONUS"].includes(typeRaw) ? typeRaw : "ALL") as MovementFilter;

  const { data: txs } = await supabase
    .from("token_transactions")
    .select("id, wallet_id, type, amount_credits, amount_currency, stripe_intent_id, note, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  const allRows = (txs ?? []) as Tx[];
  const walletIds = Array.from(new Set(allRows.map((t) => t.wallet_id))).filter(Boolean);
  const { data: wallets } = walletIds.length ? await supabase.from("wallets").select("id, customer_id").in("id", walletIds) : { data: [] as Wallet[] };
  const walletRows = (wallets ?? []) as Wallet[];
  const customerIds = Array.from(new Set(walletRows.map((w) => w.customer_id))).filter(Boolean);
  const { data: profiles } = customerIds.length
    ? await supabase.from("profiles").select("id, email, first_name, last_name").in("id", customerIds)
    : { data: [] as Profile[] };

  const walletToCustomer: Record<string, string> = {};
  for (const w of walletRows) walletToCustomer[w.id] = w.customer_id;

  const customerLabel: Record<string, string> = {};
  for (const p of (profiles ?? []) as Profile[]) {
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
    customerLabel[p.id] = fullName || p.email || p.id;
  }

  const now = new Date();
  const fromStartIso = fromRaw && isIsoDay(fromRaw) ? toUtcIsoStart(fromRaw) : null;
  const toNextIso = toRaw && isIsoDay(toRaw) ? toUtcIsoNextDayStart(toRaw) : null;
  const explicitStart = fromStartIso ? new Date(fromStartIso) : null;
  const explicitEnd = toNextIso ? new Date(toNextIso) : null;
  const fallbackStart = resolvePeriodStart(period, now);
  const windowStart = explicitStart ?? fallbackStart ?? null;
  const windowEnd = explicitEnd && windowStart && explicitEnd < windowStart ? null : explicitEnd ?? now;

  const allChargeRows = allRows.filter((t) => t.type === "CHARGE");
  const firstPurchaseByCustomer = new Map<string, string>();
  for (const tx of allChargeRows) {
    const customerId = walletToCustomer[tx.wallet_id];
    if (!customerId) continue;
    const existing = firstPurchaseByCustomer.get(customerId);
    if (!existing || new Date(tx.created_at) < new Date(existing)) {
      firstPurchaseByCustomer.set(customerId, tx.created_at);
    }
  }

  const rows = allRows.filter((t) => {
    const createdAt = new Date(t.created_at);
    if (windowStart && createdAt < windowStart) return false;
    if (windowEnd && createdAt >= windowEnd) return false;
    if (movementType !== "ALL" && t.type !== movementType) return false;
    return true;
  });

  const header = [
    "created_at",
    "customer_id",
    "customer",
    "wallet_id",
    "type",
    "amount_credits",
    "amount_currency",
    "pack",
    "first_purchase_at",
    "is_first_purchase",
    "is_new_customer_in_window",
    "stripe_intent_id",
    "note"
  ];

  const lines = [
    header.map(csvEscape).join(","),
    ...rows.map((t) => {
      const customerId = walletToCustomer[t.wallet_id] ?? "";
      const customer = customerId ? customerLabel[customerId] ?? customerId : "";
      const pack = t.type === "CHARGE" ? inferChargePack(t.amount_credits) : "";
      const firstPurchaseAt = customerId ? firstPurchaseByCustomer.get(customerId) ?? "" : "";
      const isFirstPurchase = t.type === "CHARGE" && firstPurchaseAt && firstPurchaseAt === t.created_at ? "1" : "0";
      const firstDate = firstPurchaseAt ? new Date(firstPurchaseAt) : null;
      const isNewInWindow =
        t.type === "CHARGE" && firstDate && windowStart && windowEnd && firstDate >= windowStart && firstDate < windowEnd ? "1" : "0";
      return [
        t.created_at,
        customerId,
        customer,
        t.wallet_id,
        t.type,
        t.amount_credits,
        t.amount_currency,
        pack,
        firstPurchaseAt,
        isFirstPurchase,
        isNewInWindow,
        t.stripe_intent_id ?? "",
        t.note ?? ""
      ]
        .map(csvEscape)
        .join(",");
    })
  ];

  const rangePart = fromRaw || toRaw ? `${fromRaw || "start"}_${toRaw || "end"}` : period;
  const fileName = `admin-payments-${rangePart}-${movementType.toLowerCase()}.csv`;
  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`
    }
  });
}
