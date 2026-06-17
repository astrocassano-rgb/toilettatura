# Proposta di vendita — DogWash24 / Toilettatura H24 (piattaforma completa)

Documento sintetico per presentare la piattaforma a un potenziale acquirente (imprenditore, società di servizi, distributore di impianti, investitore).

## 1) Executive summary

DogWash24 è una piattaforma web mobile-first per la gestione di una **toelettatura/lavaggio self-service H24**, con:

- prenotazioni reali su database (disponibilità e anti-overbooking)
- wallet a crediti con movimenti tracciati
- area admin separata (prenotazioni, clienti, pagamenti, postazioni)
- integrazione calendario (Google Calendar + file `.ics`)
- cancellazioni con policy e rimborsi scalari
- **check-in e sessioni H24**: QR firmato + kiosk postazione + sessioni live in admin

Obiettivo: ridurre attriti per il cliente, automatizzare la gestione H24, e creare una base scalabile per più strutture/postazioni.

## 2) Cosa si compra (asset)

- Codice sorgente della webapp (Next.js + Supabase) + configurazioni + migrazioni DB
- Modello dati e funzioni RPC SQL (prenotazioni/wallet/rimborsi)
- Dashboard admin e strumenti operativi
- Modulo H24 “check-in”:
  - QR firmato e validazione server-side
  - pagina kiosk postazione (scanner QR via webcam)
  - sessioni live con timer
- Documentazione tecnica di progetto già presente (README e file interni)

## 3) Problema che risolve

Un impianto H24 self-service senza un buon software:
- perde tempo in gestione manuale (prenotazioni, incassi, disguidi)
- subisce overbooking e contestazioni
- non traccia correttamente wallet/crediti/rimborsi
- non ha controllo operativo in struttura (chi sta usando cosa e per quanto)

DogWash24 centralizza questi aspetti e abilita un modello H24 più “automatico”.

## 4) Funzionalità principali (oggi)

### 4.1 Cliente
- registrazione/login reali
- profilo e gestione cani
- prenotazione guidata (multi-servizio, durata suggerita, selezione giorno/orario, 90 giorni)
- wallet crediti + storico movimenti
- dettaglio prenotazione + export calendario
- privacy: export dati + cancellazione account

### 4.2 Admin
- area admin separata
- prenotazioni: filtri, azioni e gestione stato
- clienti: overview e gestione
- pagamenti/ledger: analisi e export (filtri)
- postazioni: configurazione e layout editor
- sessioni live: controllo operativo con timer

### 4.3 H24 operatività in struttura
- QR firmato mostrato nella prenotazione
- kiosk postazione per leggere QR da webcam e validare la sessione
- avvio sessione con `remaining_seconds` e visibilità in admin

## 5) Differenziatori

- **Anti-overbooking** a livello DB (vincoli e logica server-side).
- **Wallet reale** con ledger (movimenti) e policy rimborsi.
- **UX guidata** “a prova di bambino” sul mobile.
- **H24 ready**: check-in, sessione, timer, e pagina kiosk.
- Base solida per integrazione futura con hardware (relè/gateway).

## 6) Stato tecnico e stack

- Next.js App Router (React + TypeScript strict + Tailwind)
- Supabase (Auth + Postgres + RLS + RPC + Realtime)
- Build di produzione verificata (`npm run build`)

## 7) Modalità di monetizzazione / opzioni di acquisto

Di seguito tre opzioni tipiche. I valori sono **indicativi** e vanno confermati in base a: perimetro richiesto, tempi di handover, eventuale esclusiva/territorialità, e supporto post-vendita.

### Opzione A — Solo utilizzo (licenza d’uso / “buy-to-use”)

Adatta a chi vuole usare il sistema nel proprio impianto senza acquistare la proprietà completa.

- **Setup iniziale**: 4.900 – 8.500 € (configurazione, migrazioni, go-live)
- **Canone**: 150 – 450 €/mese per impianto (supporto base + aggiornamenti)
- **Oppure annuale**: 1.800 – 4.800 €/anno

Incluso:
- uso della piattaforma
- patch e aggiornamenti (durante il canone)
- supporto operativo base

Non incluso:
- hardware, cablaggi, relè
- personalizzazioni importanti (quotate a parte)

### Opzione B — Noleggio con aggiornamenti (managed + maintenance)

Adatta a chi vuole “zero pensieri” e un servizio continuativo.

- **Setup**: 6.000 – 12.000 €
- **Canone**: 300 – 900 €/mese per impianto
- **SLA**: standard o premium (in base al canone)

Incluso:
- aggiornamenti programmati + gestione release
- monitoraggio base e assistenza
- supporto evolutivo limitato (bugfix e piccole migliorie)

### Opzione C — Acquisto completo della piattaforma (asset sale)

Adatta a chi vuole possedere interamente il prodotto (IP) e poterlo evolvere internamente.

Due varianti tipiche:

1) **Acquisto completo non esclusivo**
- **Valore indicativo**: 35.000 – 120.000 €

2) **Acquisto completo con esclusiva (settore/territorio)**
- **Valore indicativo**: 120.000 – 300.000 €+

Incluso:
- sorgenti + migrazioni + documentazione + handover tecnico
- supporto di transizione (ad es. 2–6 settimane) per passaggio consegne

Opzionale:
- contratto di supporto post-acquisto (retainer mensile) per bugfix/feature

## 8) Come presentarla (demo suggerita)

Demo in 10 minuti, ordine consigliato:

1) Prenotazione guidata (utente) → conferma → dettaglio prenotazione.
2) Wallet e movimenti → rimborsi/cancellazione.
3) Admin prenotazioni e filtri.
4) Sessioni live admin.
5) Mostrare QR in prenotazione e aprire `/admin/kiosk` per la lettura QR (simulazione da camera o incolla QR).

## 9) Estensioni naturali (post-acquisto)

- Collegamento a relè/gateway per accensione/spegnimento reale in struttura.
- Kiosk “industrializzato”: modalità full-screen, auto-restart, hardening.
- Reportistica economica avanzata e KPI di utilizzo postazioni.
- Multi-impianto e ruoli partner/distributori (se si vuole scalare rete).

## 10) Note e assunzioni

- Hardware e installazione elettrica sono fuori scope: richiedono progetto dedicato e conformità/sicurezza.
- I prezzi sopra sono indicativi e servono per impostare una trattativa: il valore finale dipende da perimetro e condizioni.

---

Contatti e prossimi step:
- definire il modello (A/B/C)
- definire numero impianti/postazioni e livello di supporto
- preparare una demo guidata con accesso admin e scenario check-in H24
