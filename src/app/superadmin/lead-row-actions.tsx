"use client";

import { useState } from "react";
import { Check, Trash2, Loader2 } from "lucide-react";
import { updateLeadStatusAction, deleteLeadAction } from "./lead-actions";
import { toast } from "sonner";

interface LeadRowActionsProps {
  leadId: string;
  status: string;
}

export default function LeadRowActions({ leadId, status }: LeadRowActionsProps) {
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setLoadingStatus(true);
    try {
      const res = await updateLeadStatusAction(leadId, newStatus);
      if (res.success) {
        toast.success(`Stato aggiornato con successo a "${newStatus}"`);
      } else {
        toast.error(res.error || "Errore durante l'aggiornamento.");
      }
    } catch (err) {
      toast.error("Si è verificato un errore.");
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Sei sicuro di voler eliminare questo contatto?")) return;
    setLoadingDelete(true);
    try {
      const res = await deleteLeadAction(leadId);
      if (res.success) {
        toast.success("Contatto eliminato.");
      } else {
        toast.error(res.error || "Errore durante l'eliminazione.");
      }
    } catch (err) {
      toast.error("Si è verificato un errore.");
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {status === "new" && (
        <button
          onClick={() => void handleStatusChange("contacted")}
          disabled={loadingStatus || loadingDelete}
          className="inline-flex h-8 items-center gap-1 rounded-xl bg-teal-500/10 border border-teal-500/20 px-3 text-xs font-semibold text-teal-300 transition-all hover:bg-teal-500/20 disabled:opacity-50"
        >
          {loadingStatus ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              Contatta
            </>
          )}
        </button>
      )}

      {status === "contacted" && (
        <button
          onClick={() => void handleStatusChange("closed")}
          disabled={loadingStatus || loadingDelete}
          className="inline-flex h-8 items-center gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
        >
          {loadingStatus ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              Chiudi (Firmato)
            </>
          )}
        </button>
      )}

      <button
        onClick={() => void handleDelete()}
        disabled={loadingStatus || loadingDelete}
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 transition-all hover:bg-rose-500/20 disabled:opacity-50"
      >
        {loadingDelete ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
