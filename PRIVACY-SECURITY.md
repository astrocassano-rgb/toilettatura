## Cosa stiamo salvando

- Profili cliente: nome, cognome, telefono, email (tabella `profiles`)
- Profili cane: nome, taglia, peso, note (tabella `dogs`)
- Prenotazioni: postazione, orari, stato, costo crediti (tabella `bookings`)
- Wallet e movimenti: saldo crediti e transazioni (tabelle `wallets`, `token_transactions`)

## Garanzie tecniche già adottate

- Autenticazione: gestita da Supabase Auth
- Accesso ai dati: Row Level Security attiva su tutte le tabelle principali (`profiles`, `dogs`, `bookings`, `wallets`, `token_transactions`, `active_sessions`)
- Isolamento per utente: policy che consentono di leggere e modificare solo i record del proprio `auth.uid()`
- Operazioni sensibili centralizzate: prenotazione e cancellazione passano da funzioni RPC (`create_booking`, `cancel_booking`) con controlli lato database
- Non esposizione della service key al frontend: la chiave `SUPABASE_SERVICE_ROLE_KEY` non deve mai essere `NEXT_PUBLIC_*`

## Cosa NON possiamo garantire

- Non esiste un “rischio zero” né una copertura automatica contro reclami o denunce.
- La conformità GDPR/legale dipende anche da documenti, processi e uso reale del prodotto (non solo dal codice).

## Migliorie consigliate (prioritarie)

- Limitare le scritture dirette su `bookings`: permettere solo lettura per l’utente e usare RPC per creare/cancellare
- Aggiungere strumenti per i diritti privacy:
  - esportazione dei dati (accesso)
  - cancellazione account (diritto all’oblio)
- Minimizzazione dati: salvare solo ciò che serve (es. evitare duplicare email se non necessario)
- Retention: definire e applicare una politica di conservazione (es. cancellazione automatica di log/sessioni dopo N giorni)
- Audit: tracciare eventi amministrativi e operazioni critiche (prenotazioni, rimborsi)

## Endpoint privacy (server)

- `GET /api/account/export`: esporta i dati del profilo autenticato
- `POST /api/account/delete`: elimina l’utente autenticato tramite Supabase Admin API (richiede `SUPABASE_SERVICE_ROLE_KEY`)

