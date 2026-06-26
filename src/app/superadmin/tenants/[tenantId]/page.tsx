import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/require-superadmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EditTenantForm } from "./edit-tenant-form";
import { TenantAdminsCard } from "./tenant-admins-card";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    tenantId: string;
  }>;
};

export default async function EditTenantPage({ params }: Props) {
  const { tenantId } = await params;
  
  await requireSuperAdmin({ next: `/superadmin/tenants/${tenantId}`, mode: "notFound" });
  const adminSupabase = createSupabaseAdminClient();

  const { data: tenant, error } = await (adminSupabase.from("tenants") as any)
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();

  if (error || !tenant) {
    console.error("Errore o salone non trovato:", error?.message);
    notFound();
  }

  // Recupera gli utenti auth per estrarre gli amministratori di questo tenant
  const { data: authUsersData, error: authUsersErr } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = authUsersData?.users ?? [];
  
  if (authUsersErr) {
    console.error("Errore nel recupero degli utenti auth:", authUsersErr.message);
  }

  const tenantAdmins = authUsers.filter(u => 
    u.app_metadata?.role === "admin" &&
    (u.user_metadata?.tenant_id === tenantId || u.app_metadata?.tenant_id === tenantId)
  );

  const adminIds = tenantAdmins.map(a => a.id);
  let adminProfiles: any[] = [];
  if (adminIds.length > 0) {
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("id, first_name, last_name, phone")
      .in("id", adminIds);
    adminProfiles = profiles ?? [];
  }

  const initialAdmins = tenantAdmins.map(u => {
    const prof = adminProfiles.find(p => p.id === u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      firstName: prof?.first_name ?? "",
      lastName: prof?.last_name ?? "",
      phone: prof?.phone ?? "",
    };
  });

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
          <h2 className="text-2xl font-bold tracking-tight">Gestisci Salone</h2>
          <p className="text-sm text-slate-400">Modifica i dettagli e controlla lo stato commerciale di {tenant.name}.</p>
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

      <EditTenantForm tenant={tenant} />

      <TenantAdminsCard tenantId={tenantId} initialAdmins={initialAdmins} />
    </div>
  );
}

