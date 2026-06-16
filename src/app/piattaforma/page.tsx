import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BarChart3, Clock, QrCode, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "DogWash24 — Piattaforma Toilettatura H24",
  description:
    "Piattaforma per toelettatura/lavaggio self-service H24: prenotazioni, wallet crediti, dashboard admin e check-in con QR e kiosk di struttura.",
  openGraph: {
    title: "DogWash24 — Piattaforma Toilettatura H24",
    description:
      "Prenotazioni, wallet crediti, dashboard admin e operatività H24 con check-in QR e sessioni live.",
    type: "website"
  }
};

const features: { title: string; description: string; Icon: LucideIcon }[] = [
  {
    title: "Operatività H24 (QR + Kiosk)",
    description: "Check-in con QR firmato, kiosk postazione e sessioni live con timer: controllo operativo in struttura.",
    Icon: QrCode
  },
  {
    title: "Prenotazioni reali e anti-overbooking",
    description: "Disponibilità su DB con logica server-side: meno disguidi, meno contestazioni, più ordine.",
    Icon: Clock
  },
  {
    title: "Wallet crediti e report economici",
    description: "Saldo crediti, movimenti e dashboard admin con filtri ed export: tracciabilità e controllo.",
    Icon: BarChart3
  },
  {
    title: "Sicurezza e audit",
    description: "Auth reale, RLS, policy su operazioni sensibili e tracciabilità: base solida per crescere.",
    Icon: ShieldCheck
  },
  {
    title: "Postazioni e gestione struttura",
    description: "Anagrafica postazioni e layout editor per la mappa: visione chiara del punto vendita.",
    Icon: Wrench
  }
];

export default function PiattaformaPage() {
  return (
    <div className="space-y-8 py-6">
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="DogWash24" width={160} height={160} className="h-10 w-auto" priority />
          <p className="text-xs font-medium tracking-wide text-slate-400">Toelettatura · Self-Service · H24</p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">La piattaforma per gestire una toilettatura H24</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-200">
          DogWash24 unisce prenotazioni, wallet a crediti e operatività in struttura. Pensata per lavaggi self-service per cani
          che vogliono ridurre gestione manuale, disguidi e tempi morti.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/prenota" className="w-full sm:w-auto">
            <Button className="w-full" variant="primary">
              Vedi demo prenotazione
            </Button>
          </Link>
          <a className="w-full sm:w-auto" href="mailto:info@dogwash24.it?subject=Richiesta%20demo%20DogWash24">
            <Button className="w-full" variant="secondary">
              Richiedi una demo
            </Button>
          </a>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Perché</p>
            <p className="text-lg font-semibold tracking-tight">Riduci caos operativo, aumenta controllo</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>
              La piattaforma nasce per il caso reale di una struttura H24: il cliente prenota, paga con crediti, arriva in locale e
              si identifica con QR. Tu vedi sessioni e tempi residui, e puoi evolvere verso accensione/spegnimento delle postazioni.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                <p className="text-sm font-semibold text-slate-50">Meno disguidi</p>
                <p className="mt-1 text-xs text-slate-400">Anti-overbooking, regole cancellazione e riepiloghi chiari.</p>
              </div>
              <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
                <p className="text-sm font-semibold text-slate-50">Più controllo H24</p>
                <p className="mt-1 text-xs text-slate-400">Sessioni live, timer e check-in da kiosk in struttura.</p>
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
            <p>Webapp mobile-first per clienti + area admin + pagina kiosk per postazioni.</p>
            <p className="text-xs text-slate-400">
              Integrazione hardware (relè, gateway) come step successivo: QR → validazione → sessione → start/stop.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Funzionalità</p>
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
          <p className="text-sm text-slate-300">Valori indicativi: si definiscono su numero postazioni e perimetro.</p>
        </header>
        <div className="grid gap-3 lg:grid-cols-3">
          <Card>
            <CardHeader className="space-y-1">
              <p className="text-xs font-medium text-slate-300">Solo utilizzo</p>
              <p className="text-lg font-semibold tracking-tight">Licenza d&apos;uso</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p className="text-2xl font-semibold tracking-tight text-slate-50">da 150 €/mese</p>
              <p>Uso piattaforma + aggiornamenti finché attivo il canone.</p>
              <p className="text-xs text-slate-400">Setup iniziale una tantum e assistenza base inclusa nel canone.</p>
            </CardContent>
          </Card>
          <Card className="border-blue-500/20 bg-blue-950/10">
            <CardHeader className="space-y-1">
              <p className="text-xs font-medium text-blue-200">Consigliato</p>
              <p className="text-lg font-semibold tracking-tight text-slate-50">Noleggio + update</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p className="text-2xl font-semibold tracking-tight text-slate-50">da 300 €/mese</p>
              <p>Gestione aggiornamenti, supporto e governance release.</p>
              <p className="text-xs text-slate-400">Ideale se vuoi “zero pensieri” e un servizio continuativo.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-1">
              <p className="text-xs font-medium text-slate-300">Acquisto</p>
              <p className="text-lg font-semibold tracking-tight">Piattaforma completa</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p className="text-2xl font-semibold tracking-tight text-slate-50">35k–120k €</p>
              <p>Acquisto IP/sorgenti + handover tecnico.</p>
              <p className="text-xs text-slate-400">Possibile esclusiva con valore dedicato.</p>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a className="w-full sm:w-auto" href="mailto:info@dogwash24.it?subject=Richiesta%20offerta%20DogWash24&body=Buongiorno%2C%20vorrei%20una%20proposta%20per%20la%20piattaforma%20DogWash24.%0A%0AImpianto%3A%20%0APostazioni%3A%20%0ANote%3A%20">
            <Button className="w-full" variant="primary">
              Richiedi un&apos;offerta
            </Button>
          </a>
          <Link href="/login" className="w-full sm:w-auto">
            <Button className="w-full" variant="secondary">
              Accedi (area demo)
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

