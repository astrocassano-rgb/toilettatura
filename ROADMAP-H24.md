# Roadmap prodotto — Toilettatura H24 (focus locale)

Questa roadmap mantiene il progetto centrato sull’obiettivo originario: una webapp per la gestione di una **toelettatura/lavaggio self-service H24** (prenotazioni, crediti, postazioni, operatività).

## Principio guida

- Prima si ottiene un flusso cliente “a prova di bambino” e un’operatività locale affidabile.
- Poi si aggiunge l’automazione in struttura (check-in, attivazione postazioni, timer).
- Solo dopo, eventualmente, si valuta l’estensione “reseller/distributori”.

## Roadmap (6–8 step)

### 1) Flusso cliente perfetto (prenota → paga → usa)
- Prenotazione guidata senza ambiguità (servizi multipli, durata, postazione, costo crediti).
- Card riepilogo “cosa ho prenotato” sempre chiara (dashboard e dettaglio).
- Conferma e post-conferma senza azioni duplicate (già sistemato).
- Promemoria e calendario (Google link + file ICS già presenti).

### 2) Wallet e pagamenti affidabili
- Top-up crediti con tracciabilità completa (ledger già presente).
- Regole chiare su bonus/rimborsi (policy cancellazione già implementata).
- Dashboard economica admin: KPI essenziali, filtri, export (già avviata).

### 3) Operatività locale (postazioni e disponibilità)
- Anagrafica postazioni completa (costo/minuto, stato, manutenzione).
- Mappa postazioni per staff (layout editor già presente) + stato occupazione.
- Disponibilità real-time robusta e prevenzione overbooking.

### 4) Check-in in struttura (QR semplice)
- Cliente apre app e mostra QR “check-in”.
- Il sistema verifica: prenotazione valida, finestra temporale, postazione corretta.
- Il check-in crea una sessione tracciata (inizio/fine, motivi stop, anomalie).

### 5) Sessione e timer (stop automatico “fine turno”)
- Timer visibile a cliente e admin.
- Fine sessione automatica e chiusura pulita (con log).
- Possibilità di estensione tempo solo se consentito (regole e costo chiaro).

### 6) Kiosk/tablet per struttura (UX in locale)
- Una UI dedicata in locale (tablet) per:
  - scanner QR
  - stato postazione
  - assistenza/override staff
- Modalità “kiosk” per evitare uso improprio.

### 7) Affidabilità e sicurezza operativa
- Audit log completo (azioni admin, wallet, sessioni).
- Recovery da errori: rete che va e viene, refresh token invalidi, device offline.
- Alert minimi: postazione bloccata, sessione non chiusa, troppi annullamenti.

### 8) Marketing + retention (solo dopo stabilità)
- Coupon/bonus configurabili.
- Abbonamenti (se ha senso per il business).
- Referral (porta un amico).

## Cosa rimandare (per restare nel settore)

- “CRM generico” non specifico per impianti H24.
- Modello “reseller/distributori” (multi-tenant, licensing, appliance): utile, ma è un prodotto diverso. Si valuta solo quando il flusso H24 locale è stabile e replicabile.

## KPI di successo (toelettatura H24)

- Percentuale prenotazioni completate senza assistenza.
- Utilizzo postazioni (ore/giorno) e tasso di occupazione.
- Ricavo medio per sessione (crediti) e frequenza cliente.
- Numero anomalie (sessioni bloccate, rimborsi, no-show).
