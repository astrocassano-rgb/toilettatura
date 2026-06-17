import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Database } from "@/types/database";
import { KioskClient } from "./kiosk-client";

type Station = Pick<Database["public"]["Tables"]["stations"]["Row"], "id" | "name" | "type" | "status">;

export const dynamic = "force-dynamic";

export default async function AdminKioskPage() {
  const { supabase } = await requireAdmin({ next: "/admin/kiosk", mode: "notFound" });
  const { data: stations } = await supabase.from("stations").select("id, name, type, status").order("name", { ascending: true });
  const activeStations = ((stations ?? []) as Station[]).filter((station) => station.status !== "MAINTENANCE");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Kiosk struttura</h2>
        <p className="text-sm leading-relaxed text-slate-200">
          Interfaccia dedicata a tablet, Raspberry o mini-PC di struttura per leggere il QR del cliente e avviare la sessione della postazione.
        </p>
      </header>

      {activeStations.length ? (
        <KioskClient stations={activeStations.map((station) => ({ id: station.id, name: station.name, type: station.type }))} />
      ) : (
        <Card>
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Nessuna postazione</p>
            <p className="text-lg font-semibold tracking-tight">Configura prima le postazioni</p>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Il kiosk ha bisogno di almeno una postazione attiva per associare il QR letto alla macchina corretta.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
