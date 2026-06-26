"use client";

import { useState } from "react";
import { addTenantAdminAction, removeTenantAdminAction } from "./admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Users, Plus, Mail, Trash2, ShieldAlert, Loader2, Phone, Calendar, Clock } from "lucide-react";
import { Toaster, toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  lastSignIn: string | null;
  firstName: string;
  lastName: string;
  phone: string;
}

interface TenantAdminsCardProps {
  tenantId: string;
  initialAdmins: AdminUser[];
}

export function TenantAdminsCard({ tenantId, initialAdmins }: TenantAdminsCardProps) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const targetEmail = email.trim();

    try {
      const result = await addTenantAdminAction(tenantId, targetEmail);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || "Operazione completata con successo!");
        setEmail("");
        // Ricarichiamo gli amministratori. Siccome non possiamo ricaricare facilmente
        // tutti i dati dal server (Server Actions non re-iniettano props sui client component client-side immediatamente),
        // aggiungiamo l'utente alla lista locale in modo ottimistico o temporaneo per un feedback istantaneo.
        // Un semplice hard refresh o navigazione andrà bene, ma aggiungiamo un record fittizio/in attesa se l'utente non è già in lista.
        const alreadyExists = admins.some(a => a.email.toLowerCase() === targetEmail.toLowerCase());
        if (!alreadyExists) {
          const newAdmin: AdminUser = {
            id: Math.random().toString(), // id temporaneo
            email: targetEmail,
            createdAt: new Date().toISOString(),
            lastSignIn: null,
            firstName: "In attesa",
            lastName: "di conferma",
            phone: "-"
          };
          setAdmins([...admins, newAdmin]);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Errore durante l'aggiunta dell'amministratore.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (userId: string, userEmail: string) => {
    setRemovingId(userId);
    try {
      const result = await removeTenantAdminAction(tenantId, userId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || "Privilegi rimossi con successo.");
        setAdmins(admins.filter(a => a.id !== userId));
      }
    } catch (err: any) {
      toast.error(err?.message || "Errore durante la rimozione dell'amministratore.");
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md max-w-xl mx-auto mt-6">
      <Toaster richColors theme="dark" position="bottom-right" />
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="rounded-xl p-2.5 bg-violet-500/15 text-violet-300">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-50">Gestione Amministratori</h3>
          <p className="text-xs text-slate-500">Associa o invita amministratori dedicati a questo salone.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form di Aggiunta */}
        <form onSubmit={handleAddAdmin} className="space-y-3">
          <Label htmlFor="admin-email" className="text-sm font-medium text-slate-200">
            Aggiungi o invita tramite Email
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="admin-email"
                type="email"
                required
                placeholder="nome.cognome@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950/40 border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-xl pl-9"
              />
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            </div>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="rounded-xl px-4 gap-1.5 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Aggiungi
                </>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Se l&apos;utente esiste già nel sistema, verrà promosso ad amministratore per questo salone. Altrimenti, riceverà un invito via email con i privilegi pre-configurati.
          </p>
        </form>

        {/* Lista degli amministratori */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Amministratori Associati ({admins.length})
          </h4>

          <div className="divide-y divide-slate-800/60 rounded-xl border border-slate-800/80 bg-slate-900/10 overflow-hidden">
            {admins.map((admin) => {
              const createdDate = new Date(admin.createdAt).toLocaleDateString("it-IT");
              const lastAccess = admin.lastSignIn 
                ? new Date(admin.lastSignIn).toLocaleDateString("it-IT", { hour: '2-digit', minute: '2-digit' })
                : "Mai effettuato";

              const fullName = [admin.firstName, admin.lastName].filter(Boolean).join(" ");

              return (
                <div key={admin.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors hover:bg-slate-900/15">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-50">
                        {fullName || admin.email}
                      </span>
                      {fullName && (
                        <span className="text-xs text-slate-500 font-mono">({admin.email})</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-[11px]">
                      {admin.phone && admin.phone !== "-" && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {admin.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Registrato: {createdDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Ultimo accesso: {lastAccess}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center sm:justify-end">
                    {confirmRemoveId === admin.id ? (
                      <div className="flex gap-1.5 items-center">
                        <span className="text-[10px] text-rose-400 font-medium">Sicuro?</span>
                        <Button
                          size="md"
                          variant="secondary"
                          onClick={() => setConfirmRemoveId(null)}
                          className="h-7 px-2.5 text-xs rounded-lg"
                        >
                          No
                        </Button>
                        <Button
                          size="md"
                          variant="primary"
                          disabled={removingId === admin.id}
                          onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                          className="h-7 px-2.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white border-none shadow-lg shadow-rose-900/20"
                        >
                          {removingId === admin.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Sì, rimuovi"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="md"
                        variant="secondary"
                        onClick={() => setConfirmRemoveId(admin.id)}
                        disabled={removingId !== null}
                        className="h-8 px-2.5 text-xs text-rose-400 border-rose-500/10 hover:bg-rose-950/20 hover:text-rose-300 rounded-lg gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Rimuovi
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {admins.length === 0 && (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <ShieldAlert className="h-8 w-8 mx-auto text-slate-600 stroke-[1.5]" />
                <div>
                  <p className="text-sm font-semibold">Nessun amministratore associato</p>
                  <p className="text-xs text-slate-600">Aggiungi un indirizzo email sopra per concedere i privilegi.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
