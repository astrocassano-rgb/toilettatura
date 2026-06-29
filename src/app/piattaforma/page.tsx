import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BarChart3, Clock, QrCode, ShieldCheck, Wrench, Sparkles, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "DogWash24 — Piattaforma Toilettatura Ibrida",
  description:
    "Piattaforma per toelettatura self-service H24 e assistita con personale: prenotazioni, wallet crediti, dashboard admin, check-in QR e kiosk.",
  openGraph: {
    title: "DogWash24 — Piattaforma Toilettatura Ibrida",
    description:
      "Prenotazioni, wallet crediti, dashboard admin e flessibilita operativa: lavaggi self-service H24 e servizi assistiti.",
    type: "website"
  }
};

const features: { title: string; description: string; Icon: LucideIcon }[] = [
  { title: "Flessibilita Ibrida (Self & Staff)", description: "Gestisci postazioni libere in modalita self-service H24 e l'agenda degli operatori per lavaggi assistiti.", Icon: Sparkles },
  { title: "Operativita H24 (QR + Kiosk)", description: "Check-in con QR firmato, kiosk postazione e sessioni live con timer: controllo operativo in struttura.", Icon: QrCode },
  { title: "Prenotazioni reali e anti-overbooking", description: "Disponibilita su DB con logica server-side: meno disguidi, meno contestazioni, piu ordine.", Icon: Clock },
  { title: "Wallet crediti e report economici", description: "Saldo crediti, movimenti e dashboard admin con filtri ed export: tracciabilita e controllo.", Icon: BarChart3 },
  { title: "Sicurezza e audit", description: "Auth reale, RLS, policy su operazioni sensibili e tracciabilita: base solida per crescere.", Icon: ShieldCheck },
  { title: "Postazioni e gestione struttura", description: "Anagrafica postazioni e layout editor per la mappa: visione chiara del punto vendita.", Icon: Wrench }
];

const startFeatures = ["Prenotazioni online illimitate","Wallet crediti clienti","App mobile per i clienti","Dashboard admin","Check-in QR (H24 self-service)","Aggiornamenti inclusi","Supporto in italiano"];
const proFeatures = ["Tutto del piano Licenza","Aggiornamenti gestiti","Supporto prioritario","Governance release","Onboarding dedicato","SLA garantito","Multi-salone"];
const enterpriseFeatures = ["Codice sorgente completo","Handover tecnico","Documentazione architettura","Formazione team","Personalizzazione brand","Diritti di proprieta"];

export default function PiattaformaPage() {
  return (
    <div className="space-y-8 py-6">
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="DogWash24" width={160} height={160} className="h-10 w-auto" priority />
          <p className="text-xs font-medium tracking-wide text-slate-400">Toelettatura · Self-Service · Assistito · H24</p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">La piattaforma completa per gestire Toilettature Self-Service, Assistite o Ibride</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-200">
          DogWash24 unifica la gestione delle strutture: automatizza il self-service H24 con sblocco QR e chiosco fisico, e offre un&apos;agenda avanzata per le prenotazioni assistite con i tuoi operatori. Riduci la gestione manuale, ottimizza le vasche e massimizza la resa per metro quadro.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/prenota" className="w-full sm:w-auto">
            <Button className="w-full" variant="primary">Vedi demo prenotazione</Button>
          </Link>
          <a className="w-full sm:w-auto" href="mailto:info@dogwash24.it?subject=Richiesta%20demo%20DogWash24">
            <Button className="w-full" variant="secondary">Richiedi una demo</Button>
          </a>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Perche</p>
            <p className="text-lg font-semibold tracking-tight">Riduci caos operativo, aumenta controllo</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>
              La piattaforma unisce due mondi: l&apos;automazione H24 del self-service (prenotazione, crediti, sblocco vasca con QR) e l&apos;efficienza della toelettatura tradizionale con operatore. Monitora sessioni live, gestisci lo staff e ottimizza l&apos;uso delle postazioni in tempo reale.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                <p className="text-sm font-semibold text-slate-50">Flessibilita Ibrida</p>
                <p className="mt-1 text-xs text-slate-400">Configura le postazioni per il self-service, l&apos;assistenza staff o entrambi.</p>
              </div>
              <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                <p className="text-sm font-semibold text-slate-50">Zero no-show</p>
                <p className="mt-1 text-xs text-slate-400">Il pagamento anticipato tramite wallet a crediti abbatte le prenotazioni a vuoto.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-950/10">
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-blue-200">Infrastruttura</p>
            <p className="text-lg font-semibold tracking-tight text-slate-50">Pronta per il locale</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>Webapp mobile-first per i clienti, dashboard admin per lo staff e pagina Kiosk di check-in per il locale.</p>
            <p className="text-xs text-slate-400">
              Pronta per l&apos;integrazione hardware (rele): sblocco porte e avvio vasca automatico post check-in QR.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Funzionalita</p>
          <h2 className="text-xl font-semibold tracking-tight">Cosa include oggi</h2>
        </header>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {features.map(({ title, description, Icon }) => (
            <Card key={title}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900/70 ring-1 ring-inset ring-slate-800">
                    <Icon className="h-5 w-5 text-slate-100" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-50">{title}</p>
                    <p className="text-sm leading-relaxed text-slate-300">{description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Pacchetti</p>
          <h2 className="text-xl font-semibold tracking-tight">Modelli di utilizzo</h2>
          <p className="text-sm text-slate-300">Prezzi per salone singolo. Soluzioni multi-impianto e distributori su richiesta.</p>
        </header>
        <div className="grid gap-3 lg:grid-cols-3">

          {/* Piano START */}
          <Card>
            <CardHeader className="space-y-1">
              <p className="text-xs font-medium text-slate-300">Per iniziare</p>
              <p className="text-lg font-semibold tracking-tight">Licenza d&apos;uso</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-50">29€<span className="text-base font-normal text-slate-400">/mese</span></p>
              <p className="text-[11px] text-slate-500">Early adopter · Garantito 2 anni · Poi 59€/mese</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <ul className="space-y-1.5">
                {startFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs">
                    <span className="text-teal-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:info@dogwash24.it?subject=Prova%20gratuita%2030%20giorni%20—%20DogWash24&body=Buongiorno%2C%20vorrei%20iniziare%20la%20prova%20gratuita%20di%2030%20giorni.%0A%0ANome%20salone%3A%20%0ACittà%3A%20%0ATelefono%3A%20"
                className="mt-3 block w-full rounded-xl border border-slate-700 py-2.5 text-center text-sm font-semibold text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800/60"
              >
                Inizia gratis 30 giorni →
              </a>
            </CardContent>
          </Card>

          {/* Piano PRO */}
          <Card className="border-blue-500/20 bg-blue-950/10">
            <CardHeader className="space-y-1">
              <p className="text-xs font-medium text-blue-200">⭐ Consigliato</p>
              <p className="text-lg font-semibold tracking-tight text-slate-50">Noleggio + update</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-50">119€<span className="text-base font-normal text-slate-400">/mese</span></p>
              <p className="text-[11px] text-slate-500">Setup incluso · Zero pensieri · SLA garantito</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <ul className="space-y-1.5">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs">
                    <span className="text-blue-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:info@dogwash24.it?subject=Richiesta%20offerta%20Noleggio%20%2B%20Update%20DogWash24"
                className="mt-3 block w-full rounded-xl bg-blue-600 py-2.5 text-center text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500"
              >
                Scegli questo →
              </a>
            </CardContent>
          </Card>

          {/* Piano Enterprise */}
          <Card>
            <CardHeader className="space-y-1">
              <p className="text-xs font-medium text-slate-300">Acquisto IP</p>
              <p className="text-lg font-semibold tracking-tight">Piattaforma completa</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-50">35k–120k€</p>
              <p className="text-[11px] text-slate-500">Una tantum · variabile per esclusiva</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <ul className="space-y-1.5">
                {enterpriseFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs">
                    <span className="text-violet-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:info@dogwash24.it?subject=Richiesta%20preventivo%20Piattaforma%20completa%20DogWash24"
                className="mt-3 block w-full rounded-xl border border-slate-700 py-2.5 text-center text-sm font-semibold text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800/60"
              >
                Richiedi preventivo →
              </a>
            </CardContent>
          </Card>

        </div>
        <p className="text-center text-xs text-slate-500">
          Sei un toelettatore in Puglia?{" "}
          <a href="/toelettatori" className="text-teal-400 hover:underline">
            Scopri l&apos;offerta riservata ai saloni →
          </a>
        </p>
      </section>
    </div>
  );
}
