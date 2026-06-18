import { requireAdmin } from "@/lib/auth/require-admin";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  const { supabase } = await requireAdmin({ next: "/admin/audit-logs", mode: "notFound" });

  const { data: rawLogs, error } = await (supabase as any)
    .from("admin_audit_logs")
    .select(`
      *,
      admin:profiles!admin_id(first_name, last_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  const logs = (rawLogs ?? []) as any[];

  if (error && error.code === "42P01") {
    // Tabella non ancora creata (migrazione non eseguita)
    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Security & Compliance</p>
          <h2 className="text-2xl font-semibold tracking-tight">Registro Azioni (Audit)</h2>
        </header>
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-200">
          <p>La tabella <code className="font-mono text-rose-400">admin_audit_logs</code> non è ancora stata creata nel database.</p>
          <p className="mt-2 text-sm text-rose-300">Esegui `npx supabase db push` per applicare l&apos;ultima migrazione.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Security & Compliance</p>
        <h2 className="text-2xl font-semibold tracking-tight">Registro Azioni (Audit)</h2>
        <p className="text-sm text-slate-400">Storico delle forzature di sistema effettuate dagli amministratori.</p>
      </header>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Azione</th>
                <th className="px-4 py-3 font-medium">Entità</th>
                <th className="px-4 py-3 font-medium">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Nessuna azione di override registrata.
                  </td>
                </tr>
              ) : (
                logs?.map((log) => {
                  const adminData = log.admin as any;
                  return (
                    <tr key={log.id} className="transition-colors hover:bg-slate-800/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: it })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{adminData?.first_name} {adminData?.last_name}</div>
                        <div className="text-xs text-slate-500">{adminData?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="capitalize">{log.entity_type}</div>
                        <div className="text-xs font-mono text-slate-500 truncate max-w-[120px]" title={log.entity_id}>
                          {log.entity_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <pre className="text-xs text-slate-400 max-w-[200px] truncate">
                          {JSON.stringify(log.payload)}
                        </pre>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
