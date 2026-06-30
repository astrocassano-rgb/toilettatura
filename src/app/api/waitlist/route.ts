// @ts-nocheck
/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Helper: client service_role per operazioni admin (es. lettura posizione coda)
function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/waitlist?date=YYYY-MM-DD&service_type=SELF_SERVICE
// Controlla se l'utente è già in lista d'attesa per quella data + servizio
// Risponde: { inQueue: boolean, waitlistId: string|null, position: number|null }
// ──────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // "YYYY-MM-DD"
    const serviceType = searchParams.get("service_type") ?? "SELF_SERVICE";

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Parametro 'date' mancante o non valido" }, { status: 400 });
    }

    // Recupera tenant_id dell'utente
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    const tenantId = profile?.tenant_id ?? "00000000-0000-0000-0000-000000000000";

    // Verifica se l'utente è già in coda
    const { data: myEntry } = await supabase
      .from("booking_waitlist")
      .select("id, created_at")
      .eq("tenant_id", tenantId)
      .eq("customer_id", user.id)
      .eq("date", date)
      .eq("service_type", serviceType)
      .eq("status", "WAITING")
      .maybeSingle();

    if (!myEntry) {
      return NextResponse.json({ inQueue: false, waitlistId: null, position: null });
    }

    // Calcola la posizione nella coda (quante iscrizioni WAITING precedono la mia)
    const serviceRole = createServiceRoleClient();
    const { count } = await serviceRole
      .from("booking_waitlist")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("date", date)
      .eq("service_type", serviceType)
      .eq("status", "WAITING")
      .lte("created_at", myEntry.created_at);

    return NextResponse.json({
      inQueue: true,
      waitlistId: myEntry.id,
      position: count ?? 1,
    });
  } catch (err: any) {
    console.error("[GET /api/waitlist]", err);
    return NextResponse.json({ error: err?.message ?? "Errore interno" }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/waitlist
// Iscrive il cliente alla lista d'attesa per il giorno specificato
// Body: { date: "YYYY-MM-DD", service_type: string, dog_id?: string }
// Risponde: { waitlistId, position }
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const body = await req.json();
    const { date, service_type = "SELF_SERVICE", dog_id } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Parametro 'date' mancante o non valido" }, { status: 400 });
    }

    // Controlla che la data non sia nel passato
    const targetDate = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate < today) {
      return NextResponse.json({ error: "Non puoi iscriverti alla lista d'attesa per date passate" }, { status: 400 });
    }

    // Recupera tenant_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    const tenantId = profile?.tenant_id ?? "00000000-0000-0000-0000-000000000000";

    // Inserisce nella waitlist (il UNIQUE constraint protegge dai duplicati)
    const { data: inserted, error: insertErr } = await supabase
      .from("booking_waitlist")
      .insert({
        tenant_id: tenantId,
        customer_id: user.id,
        dog_id: dog_id ?? null,
        service_type,
        date,
        status: "WAITING",
      })
      .select("id, created_at")
      .single();

    if (insertErr) {
      // Codice 23505 = unique_violation → già iscritto
      if (insertErr.code === "23505") {
        return NextResponse.json(
          { error: "Sei già iscritto alla lista d'attesa per questo giorno e servizio" },
          { status: 409 }
        );
      }
      console.error("[POST /api/waitlist] Errore insert:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Calcola posizione nella coda
    const serviceRole = createServiceRoleClient();
    const { count } = await serviceRole
      .from("booking_waitlist")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("date", date)
      .eq("service_type", service_type)
      .eq("status", "WAITING")
      .lte("created_at", inserted.created_at);

    return NextResponse.json({
      waitlistId: inserted.id,
      position: count ?? 1,
    }, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/waitlist]", err);
    return NextResponse.json({ error: err?.message ?? "Errore interno" }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/waitlist
// Rimuove il cliente dalla lista d'attesa
// Body: { waitlist_id: string }
// ──────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const body = await req.json();
    const { waitlist_id } = body;

    if (!waitlist_id) {
      return NextResponse.json({ error: "Parametro 'waitlist_id' mancante" }, { status: 400 });
    }

    // La RLS garantisce che il DELETE funzioni solo sulle righe dell'utente
    const { error: deleteErr } = await supabase
      .from("booking_waitlist")
      .delete()
      .eq("id", waitlist_id)
      .eq("customer_id", user.id);

    if (deleteErr) {
      console.error("[DELETE /api/waitlist] Errore delete:", deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/waitlist]", err);
    return NextResponse.json({ error: err?.message ?? "Errore interno" }, { status: 500 });
  }
}
