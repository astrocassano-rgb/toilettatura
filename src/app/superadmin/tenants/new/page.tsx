import Link from "next/link";
import type { Route } from "next";
import { requireSuperAdmin } from "@/lib/auth/require-superadmin";
import { NewTenantForm } from "./new-tenant-form";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewTenantPage() {
  await requireSuperAdmin({ next: "/superadmin/tenants/new", mode: "notFound" });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-violet-400">
            <ShieldCheck className="h-5 w-5" />
            <Link href={"/superadmin/tenants" as Route} className="text-xs font-semibold uppercase tracking-widest hover:underline">
              Saloni
            </Link>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Registra Nuovo Salone</h2>
          <p className="text-sm text-slate-400">Aggiungi una nuova attività affiliata per abilitarla sulla rete DogWash24.</p>
        </div>
        <div>
          <Link href={"/superadmin/tenants" as Route}>
            <Button variant="secondary" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Torna alla Lista
            </Button>
          </Link>
        </div>
      </header>

      <NewTenantForm />
    </div>
  );
}
