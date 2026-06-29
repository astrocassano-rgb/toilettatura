"use client";

import { useState, startTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Smartphone,
  Mail,
  Building2,
  MapPin,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Phone,
} from "lucide-react";
import { submitLeadAction } from "./actions";
import { toast } from "sonner";
import Link from "next/link";

export default function InfoForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Rileva il piano dalla query string (START, PRO, ENTERPRISE)
  const initialPlan = (searchParams?.get("plan") || "START").toUpperCase() as "START" | "PRO" | "ENTERPRISE";
  const validPlan = ["START", "PRO", "ENTERPRISE"].includes(initialPlan) ? initialPlan : "START";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    salonName: "",
    city: "",
    planInterest: validPlan,
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error("Nome, email e telefono sono obbligatori.");
      return;
    }

    setLoading(true);
    try {
      const res = await submitLeadAction(formData);
      if (res.success) {
        setSuccess(true);
        toast.success("Richiesta inviata con successo!");
      } else {
        toast.error(res.error || "Errore durante l'invio della richiesta.");
      }
    } catch (err) {
      toast.error("Si è verificato un errore di rete.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative"
          >
            {/* Logo o intestazione */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/25">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">DogWash24 Partner</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-50">Diventa Partner</h2>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed mb-6">
              Compila il modulo per attivare la prova gratuita di 30 giorni o richiedere informazioni commerciali. Ti ricontatteremo in meno di 24 ore.
            </p>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Nome */}
                <div className="space-y-1">
                  <label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nome Referente *</label>
                  <div className="relative">
                    <input
                      id="name"
                      type="text"
                      required
                      placeholder="Esempio: Davide"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                    <Smartphone className="absolute left-3 top-3.5 h-4 w-4 text-slate-600" />
                  </div>
                </div>

                {/* Nome Salone */}
                <div className="space-y-1">
                  <label htmlFor="salonName" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nome Salone</label>
                  <div className="relative">
                    <input
                      id="salonName"
                      type="text"
                      placeholder="Esempio: Toelettatura Bau"
                      value={formData.salonName}
                      onChange={(e) => setFormData({ ...formData, salonName: e.target.value })}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                    <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-600" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Email */}
                <div className="space-y-1">
                  <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Indirizzo Email *</label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="esempio@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-600" />
                  </div>
                </div>

                {/* Telefono */}
                <div className="space-y-1">
                  <label htmlFor="phone" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Numero di Telefono *</label>
                  <div className="relative">
                    <input
                      id="phone"
                      type="tel"
                      required
                      placeholder="+39 333 1234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-600" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Citta */}
                <div className="space-y-1">
                  <label htmlFor="city" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Città / Provincia</label>
                  <div className="relative">
                    <input
                      id="city"
                      type="text"
                      placeholder="Esempio: Bari"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-600" />
                  </div>
                </div>

                {/* Piano di Interesse */}
                <div className="space-y-1">
                  <label htmlFor="planInterest" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Piano di Interesse</label>
                  <select
                    id="planInterest"
                    value={formData.planInterest}
                    onChange={(e) => setFormData({ ...formData, planInterest: e.target.value as "START" | "PRO" | "ENTERPRISE" })}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 appearance-none cursor-pointer"
                  >
                    <option value="START" className="bg-slate-900">START — Licenza d&apos;uso (29€/mese)</option>
                    <option value="PRO" className="bg-slate-900">PRO — Noleggio + Update (119€/mese)</option>
                    <option value="ENTERPRISE" className="bg-slate-900">ENTERPRISE — Piattaforma completa</option>
                  </select>
                </div>
              </div>

              {/* Note / Messaggio */}
              <div className="space-y-1">
                <label htmlFor="notes" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Messaggio o Note (Opzionale)</label>
                <div className="relative">
                  <textarea
                    id="notes"
                    rows={3}
                    placeholder="Dicci se hai già postazioni H24 o se vuoi sbloccare la prova da 30 giorni..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
                  />
                  <MessageSquare className="absolute left-3 top-3.5 h-4 w-4 text-slate-600" />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href="/piattaforma"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  <ArrowLeft className="h-3 w-3" /> Torna alle informazioni
                </Link>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/10 transition-all hover:bg-teal-400 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    <>
                      Invia richiesta
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full rounded-3xl border border-teal-500/20 bg-teal-950/10 p-8 backdrop-blur-xl shadow-2xl text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-400 border border-teal-500/30 mb-6">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-50">Richiesta Ricevuta!</h2>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
              Grazie per l&apos;interesse. Un consulente DogWash24 verificherà la tua richiesta e ti contatterà via email o telefono nelle prossime ore.
            </p>

            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                onClick={() => router.push("/piattaforma")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 border border-slate-800 px-6 py-3 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-800"
              >
                Torna al sito
              </button>
              <button
                onClick={() => {
                  setFormData({
                    name: "",
                    email: "",
                    phone: "",
                    salonName: "",
                    city: "",
                    planInterest: validPlan,
                    notes: "",
                  });
                  setSuccess(false);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-500/10 border border-teal-500/20 px-6 py-3 text-xs font-bold text-teal-300 transition-all hover:bg-teal-500/20"
              >
                Invia un&apos;altra richiesta
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
