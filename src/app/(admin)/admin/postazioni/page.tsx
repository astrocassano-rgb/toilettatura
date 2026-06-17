import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StationLayoutEditor } from "./station-layout-editor";
import type { Database } from "@/types/database";

type Station = Database["public"]["Tables"]["stations"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminPostazioniPage() {
  const { supabase } = await requireAdmin({ next: "/admin/postazioni", mode: "notFound" });

  const { data } = await supabase.from("stations").select("*").order("created_at", { ascending: true });
  const stations = (data ?? []) as Station[];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Postazioni</h2>
        <p className="text-sm leading-relaxed text-slate-200">
          Gestione postazioni, listino e piantina della struttura. Clicca una postazione sulla mappa per modificarla.
        </p>
      </header>

      {stations.length ? (
        <StationLayoutEditor initialStations={stations} />
      ) : (
        <Card>
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Vuoto</p>
            <p className="text-lg font-semibold tracking-tight">Nessuna postazione</p>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">Crea postazioni in Supabase oppure aggiungi una UI di creazione.</CardContent>
        </Card>
      )}
    </div>
  );
}
