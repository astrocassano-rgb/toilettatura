import type { Metadata } from "next";
import {
  CheckCircle2,
  XCircle,
  Wallet,
  QrCode,
  BarChart3,
  CalendarCheck,
  ShieldCheck,
  ArrowRight,
  Star,
  Clock,
  AlertTriangle,
  Zap,
  Smartphone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Software Gestionale per Toelettatori — DogWash24",
  description:
    "Il gestionale che elimina i no-show, digitalizza i pagamenti e fa girare il tuo salone anche di notte. 30 giorni gratis, nessuna carta richiesta.",
  openGraph: {
    title: "Software per Toelettatori — DogWash24",
    description:
      "Prenotazioni online, wallet crediti, zero no-show. 29euro/mese per i primi 100 saloni.",
    type: "website",
  },
};

const painPoints = [
  "Clienti che non si presentano senza preavviso",
  "Agenda su carta o WhatsApp sempre nel caos",
  "Incassi difficili da tracciare a fine mese",
  "Impossibile fidelizzare i clienti senza strumenti",
  "Nessun guadagno quando il salone e chiuso",
];

const features = [
  { Icon: CalendarCheck, title: "Prenotazioni online 24/7", desc: "I clienti prenotano da soli via link o QR. Tu non perdi piu tempo al telefono." },
  { Icon: Wallet, title: "Wallet crediti digitale", desc: "Il cliente ricarica in anticipo. Zero no-show: chi ha i crediti si presenta sempre." },
  { Icon: QrCode, title: "Check-in QR (H24 self-service)", desc: "Aggiungi postazioni self-service: sblocco QR, sessioni automatiche, guadagno anche la notte." },
  { Icon: BarChart3, title: "Dashboard admin completa", desc: "Prenotazioni, clienti, incassi, movimenti wallet: tutto da smartphone." },
  { Icon: Smartphone, title: "App mobile per i clienti", desc: "I tuoi clienti hanno la loro app: prenotano, vedono il saldo, gestiscono i cani." },
  { Icon: ShieldCheck, title: "Sicuro e affidabile", desc: "Dati protetti, backup automatici, pensato per operare H24 senza interruzioni." },
];

const comparisons = [
  { feature: "Prenotazioni online", dw24: true, others: true },
  { feature: "Wallet crediti digitale", dw24: true, others: false },
  { feature: "Zero no-show (pagamento anticipato)", dw24: true, others: false },
  { feature: "Check-in QR self-service H24", dw24: true, others: false },
  { feature: "Dashboard incassi e movimenti", dw24: true, others: false },
  { feature: "Multi-salone", dw24: true, others: false },
  { feature: "App cliente dedicata", dw24: true, others: true },
  { feature: "Supporto in italiano", dw24: true, others: true },
];

const planFeatures = [
  "Prenotazioni online illimitate",
  "Wallet crediti per ogni cliente",
  "Dashboard admin completa",
  "App mobile per i tuoi clienti",
  "Check-in QR (H24 self-service incluso)",
  "Multi-salone",
  "Supporto in italiano",
  "Aggiornamenti inclusi",
];

const testimonials = [
  { name: "Maria G.", role: "Toelettatura Bari", text: "Da quando uso DogWash24 ho azzerato i no-show. I clienti pagano prima e si presentano sempre.", stars: 5 },
  { name: "Antonio R.", role: "Groomer, Lecce", text: "L agenda era un casino. Ora prenoto online, traccio i pagamenti e gestisco tutto dal cellulare.", stars: 5 },
  { name: "Laura M.", role: "Salone di Toelettatura, Taranto", text: "Ho aggiunto una postazione H24 e adesso guadagno anche la domenica. Impensabile prima.", stars: 5 },
];

const MAIL_TRIAL = "mailto:info@dogwash24.it?subject=Prova%20gratuita%2030%20giorni%20%E2%80%94%20DogWash24&body=Buongiorno%2C%20vorrei%20iniziare%20la%20prova%20gratuita%20di%2030%20giorni.%0A%0ANome%20salone%3A%20%0ACitt%C3%A0%3A%20%0ATelefono%3A%20";
const MAIL_DEMO = "mailto:info@dogwash24.it?subject=Richiesta%20demo%20DogWash24&body=Buongiorno%2C%20vorrei%20una%20demo%20guidata.%0A%0ANome%20salone%3A%20%0ACitt%C3%A0%3A%20%0ATelefono%3A%20";

export default function ToelettatorePage() {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-50">

      {/* HERO */}
      <section className="relative overflow-hidden px-5 pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-teal-500/8 blur-[120px]" />
        </div>
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-semibold text-teal-300">
            <Zap className="h-3.5 w-3.5" />
            Offerta Early Adopter — Solo per i primi 100 saloni
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Il tuo salone guadagna
            <br />
            <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              anche quando sei chiuso.
            </span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            DogWash24 elimina i no-show, digitalizza i pagamenti e trasforma il tuo salone in un impianto H24 self-service.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a href={MAIL_TRIAL} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-7 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-400">
              Inizia gratis per 30 giorni <ArrowRight className="h-4 w-4" />
            </a>
            <a href={MAIL_DEMO} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-7 py-4 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-slate-600">
              Parla con noi prima
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">Nessuna carta richiesta · Attivazione in 24h · Supporto in italiano</p>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <p className="text-sm font-semibold text-rose-300">Ti riconosci in questi problemi?</p>
            </div>
            <ul className="space-y-3">
              {painPoints.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm font-semibold text-teal-300">DogWash24 risolve tutti e cinque. In 24 ore.</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Funzionalita</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Tutto quello che ti serve, niente di inutile.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 backdrop-blur-sm">
                <div className="mb-3 inline-flex rounded-xl bg-teal-500/15 p-2.5 text-teal-300">
                  <f.Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-50">{f.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARAZIONE */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Confronto</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Perche DogWash24 e non gli altri?</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Funzione</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-teal-300">DogWash24</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400">Altri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {comparisons.map((c) => (
                  <tr key={c.feature} className="transition-colors hover:bg-slate-900/20">
                    <td className="px-4 py-3 text-slate-300">{c.feature}</td>
                    <td className="px-4 py-3 text-center">
                      {c.dw24 ? <CheckCircle2 className="mx-auto h-4 w-4 text-teal-400" /> : <XCircle className="mx-auto h-4 w-4 text-slate-600" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.others ? <CheckCircle2 className="mx-auto h-4 w-4 text-slate-500" /> : <XCircle className="mx-auto h-4 w-4 text-rose-500/60" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-sm">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Prezzo</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Semplice e trasparente.</h2>
          </div>
          <div className="relative rounded-3xl border border-teal-500/30 bg-gradient-to-b from-teal-950/30 to-slate-900/60 p-7 shadow-xl shadow-teal-500/5 backdrop-blur-md">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500 px-3 py-1 text-[11px] font-bold text-slate-950">
                <Star className="h-3 w-3" /> Prezzo Early Adopter
              </span>
            </div>
            <div className="mb-2 text-sm font-semibold text-teal-300">Piano Completo</div>
            <div className="flex items-end gap-1">
              <span className="text-5xl font-bold tracking-tight text-slate-50">29€</span>
              <span className="mb-1.5 text-slate-400">/mese</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Garantito per i primi 2 anni · Poi 59€/mese per i nuovi</p>
            <ul className="mt-6 space-y-2.5">
              {planFeatures.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" />
                  {item}
                </li>
              ))}
            </ul>
            <a href={MAIL_TRIAL} className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-teal-500 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-400">
              Inizia gratis — 30 giorni <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-3 text-center text-[11px] text-slate-500">Nessuna carta · Attivazione in 24h · Disdici quando vuoi</p>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Offerta valida fino al raggiungimento dei 100 abbonamenti
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Recensioni</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Lo dicono i toelettatori.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 backdrop-blur-sm">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-300">&quot;{t.text}&quot;</p>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-100">{t.name}</p>
                  <p className="text-[11px] text-slate-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Pronto a modernizzare il tuo salone?</h2>
          <p className="mt-4 text-slate-300">30 giorni gratis, nessuna carta, supporto in italiano. Attivazione in 24 ore.</p>
          <a href={MAIL_TRIAL} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-teal-500 px-8 py-4 text-base font-bold text-slate-950 shadow-xl shadow-teal-500/20 transition-all hover:bg-teal-400">
            Inizia gratis per 30 giorni <ArrowRight className="h-5 w-5" />
          </a>
          <p className="mt-4 text-xs text-slate-500">
            Hai domande?{" "}
            <a href="mailto:info@dogwash24.it" className="text-teal-400 hover:underline">Scrivici a info@dogwash24.it</a>
          </p>
        </div>
      </section>

    </div>
  );
}
