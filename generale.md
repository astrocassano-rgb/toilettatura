# Proposta per distributori (software – hardware escluso)

Documento di riferimento per distributori di impianti self-service (lavaggio / asciugatura / toelettatura) interessati ad offrire una piattaforma completa di prenotazione, wallet crediti e gestione operativa.

Questa proposta riguarda **solo il software e i servizi** (setup, aggiornamenti, supporto). L’hardware (postazioni, lettori, gateway, tablet, relè, cablaggi, ecc.) è **escluso** e può essere fornito dal distributore o da terze parti.

## 1) Cosa risolve il software

- Prenotazioni reali con disponibilità e gestione postazioni.
- Wallet crediti, movimenti e tracciabilità.
- Dashboard cliente e dashboard admin.
- Funzionamento **anche offline** per prenotazioni + wallet (vedi sezione 4).
- Aggiornamenti e manutenzione evolutiva tramite maintenance.

## 2) Modello di distribuzione consigliato

### 2.1 Appliance on-prem per impianto
Il software viene fornito come **appliance** installata presso il cliente finale (impianto), tipicamente su mini-PC/VM gestita dal distributore.

- Ogni impianto è una installazione separata.
- La licenza è associata all’impianto (e alle sue postazioni).
- Gli aggiornamenti vengono forniti come versioni controllate (maintenance attiva).

### 2.2 Dominio cloud + accesso remoto (consigliato)
L’impianto può funzionare anche offline, ma per gestione remota, aggiornamenti e supporto è utile un dominio/host cloud.

Approcci tipici:
- Tunnel sicuro: l’appliance crea una connessione uscente verso un servizio cloud; il dominio punta al tunnel. Non richiede IP pubblico e funziona dietro NAT.
- IP pubblico + reverse proxy: il dominio punta direttamente all’impianto. Richiede rete configurata, è meno semplice e aumenta gli aspetti security.

In entrambi i casi l’operatività locale (prenotazioni + wallet offline) non dipende dal cloud quando internet manca.

### 2.3 Wallet globale multi-impianto + offline
Il cliente può utilizzare lo stesso wallet anche in impianti diversi. In assenza di internet:

- **non è consentita la ricarica** (niente topup offline)
- il credito già disponibile può essere utilizzato offline con regole di sicurezza
- al ripristino della connessione avviene l’allineamento dati e audit

## 3) Pacchetti commerciali (stima costi)

Prezzi indicativi in Euro, **IVA esclusa**, per impianto tipico **da 5 postazioni**, hardware escluso.

### 3.0 Tabella commerciale sintetica

| Pacchetto | Setup una tantum | Maintenance annuale | Ideale per |
| --- | ---: | ---: | --- |
| Starter Offline | 3.500 - 6.000 € | 1.500 - 3.000 €/anno | Un singolo impianto con operatività offline base |
| Add-on Wallet Globale | 2.500 - 6.000 € | +1.000 - 2.500 €/anno | Estendere il credito su più impianti |
| Standard Offline+Global | 6.000 - 12.000 € | 2.400 - 4.800 €/anno | Distributori e impianti già strutturati |
| Pro Offline+Global | 12.000 - 25.000 € | 4.800 - 9.600 €/anno | Reti premium o casi con SLA e governance più forti |
| Licenza perpetua | 25.000 - 60.000 € | 15-25%/anno | Clienti che vogliono forte investimento iniziale |

### 3.0.1 Proposta entry aggressiva

Se il mercato di ingresso richiede una proposta più facile da chiudere, si può usare un listino iniziale più commerciale:

- Setup impianto 5 postazioni: **4.900 - 6.900 €**
- Maintenance annuale: **1.800 - 2.400 €/anno**
- Extra postazione: **250 - 350 €/anno**

Questa proposta ha senso soprattutto:
- per il primo impianto del distributore
- come offerta pilota o caso studio
- se il perimetro iniziale viene tenuto stretto e senza personalizzazioni importanti

### 3.1 STARTER OFFLINE (impianto singolo, wallet offline per impianto)

Adatto a partire con un impianto e garantire continuità operativa offline, riducendo la complessità del wallet globale.

- Setup impianto (una tantum): **3.500 – 6.000 €**
- Maintenance annuale: **1.500 – 3.000 €/anno**
- Postazioni extra (oltre 5): **250 – 400 €/postazione/anno**

### 3.2 Add-on: WALLET GLOBALE MULTI-IMPIANTO (con offline)

Abilita wallet utilizzabile su più impianti. In offline resta valida la regola: **no ricariche offline**, solo utilizzo credito disponibile, con policy antifrode concordate.

- Setup add-on (una tantum): **2.500 – 6.000 €**
- Incremento maintenance: **+1.000 – 2.500 €/anno per impianto**

### 3.3 STANDARD OFFLINE+GLOBAL (consigliato per distributori)

Versione completa (offline + wallet globale) con impostazione “commerciale” sostenibile e vendibile.

- Setup impianto (una tantum): **6.000 – 12.000 €**
- Maintenance annuale: **2.400 – 4.800 €/anno**
- Postazioni extra (oltre 5): **300 – 500 €/postazione/anno**

Incluso nel setup:
- installazione appliance e configurazione iniziale
- configurazione fino a 5 postazioni
- parametrizzazione servizi e regole operative
- setup ruoli e admin
- test di esercizio online/offline e go-live
- training operativo per distributore/gestore

Incluso nella maintenance:
- aggiornamenti software e nuove versioni
- patch sicurezza
- supporto tecnico (SLA base) e assistenza su bug
- manutenzione evolutiva secondo roadmap

### 3.4 PRO OFFLINE+GLOBAL (impianto premium / rete multi-impianto)

- Setup impianto: **12.000 – 25.000 €**
- Maintenance annuale: **4.800 – 9.600 €/anno**

Include, oltre allo Standard:
- aggiornamenti assistiti e piano rollback
- audit/log avanzati e strumenti di diagnostica
- reportistica estesa e procedure operative
- SLA più forte e canale supporto prioritario

### 3.5 Licenza perpetua (una tantum) + maintenance obbligatoria

- Licenza perpetua per impianto (5 postazioni): **25.000 – 60.000 €**
- Maintenance obbligatoria: **15–25%/anno**

Senza maintenance:
- nessun aggiornamento
- supporto limitato o a consumo
- rischio operativo e di sicurezza a carico del gestore

### 3.6 Esempio di proposta “chiara” (valore di riferimento)

Per una prima proposta commerciale semplice (impianto 5 postazioni):
- Setup: **8.500 €**
- Maintenance: **3.600 €/anno**
- Extra postazione: **400 €/anno** (oltre 5)

Nota: in caso di più impianti installati con lo stesso distributore, si applicano normalmente sconti sul setup dal secondo impianto in poi, perché onboarding e procedure sono già standardizzati.

### 3.7 Formula di ingresso consigliata

Per un’offerta che resti seria ma più facile da proporre commercialmente:

- **Versione pilota**: 5.900 € setup + 1.900 €/anno
- **Versione standard**: 8.500 € setup + 3.600 €/anno
- **Versione premium**: da 12.000 € setup + da 4.800 €/anno

In questo modo il distributore vede subito tre livelli chiari:
- pilota per iniziare
- standard per il caso normale
- premium per clienti più strutturati

## 4) Funzionamento offline (prenotazioni + wallet)

L’obiettivo offline è garantire continuità di servizio anche con internet instabile.

- Prenotazioni: creazione/gestione con persistenza locale.
- Wallet: utilizzo credito già disponibile (spend-only).
- Sincronizzazione: riallineamento al ritorno online con audit.

Nota: la ricarica crediti (pagamento/incasso) richiede internet.

## 5) Cosa è incluso (scope funzionale)

### 5.1 Moduli per clienti finali
- Registrazione/login e profilo.
- Gestione cani.
- Prenotazione guidata.
- Wallet crediti e storico movimenti.
- Dettaglio prenotazione e export calendario.

### 5.2 Moduli admin (impianto)
- Clienti e saldi.
- Prenotazioni: filtri per stato e date, azioni admin.
- Pagamenti/ledger: dashboard economica con filtri ed export CSV.
- Postazioni: configurazione e mappa/layout.

## 6) Cosa non è incluso (esclusioni)

- Hardware (postazioni, lettori QR/NFC, tablet kiosk, gateway, relè, PLC, cablaggi, ecc.).
- Installazione elettrica e certificazioni.
- Pagamenti reali (es. integrazione POS/Stripe) se non concordati come progetto separato.
- Personalizzazioni “white-label” (brand completamente separato) salvo accordi dedicati.

## 7) Requisiti minimi (impianto)

### 7.1 Infrastruttura
- Un mini-PC/VM per l’appliance (specifiche definite in base al carico).
- Rete locale stabile (LAN).
- Connessione internet consigliata, non obbligatoria per l’operatività base.

### 7.2 Regole offline (wallet globale)
Per un wallet globale multi-impianto in offline si applicano regole per ridurre “double spending” e conflitti:

- Nessuna ricarica offline.
- Utilizzo offline consentito solo entro soglie definite (policy concordate).
- Audit log completo di movimenti wallet, prenotazioni e anomalie.
- In caso di conflitto alla sincronizzazione: si applica una policy concordata (ad es. blocco e revisione admin).

## 8) Sicurezza e anti-copia (principi)

Obiettivo: impedire che il software venga copiato e riutilizzato senza controllo, senza consegnare il codice sorgente.

- Installazione per impianto tramite appliance.
- Licenza per impianto e per numero postazioni.
- Aggiornamenti disponibili solo con maintenance attiva.
- Telemetria minima (non invasiva) per integrità, duplicati e supporto.
- Watermark nei report/export (ID impianto/partner) per tracciabilità.

## 9) Processo di onboarding (tipico)

1. Raccolta dati impianto (postazioni, servizi, prezzi, orari, regole).
2. Installazione appliance e configurazione base.
3. Import o creazione postazioni (fino a 5 incluse nello Standard).
4. Test online/offline + flusso prenotazione/wallet.
5. Formazione operativa e consegna procedure.
6. Go-live e supporto di avvio.

## 10) Supporto e SLA (indicativo)

- Standard: supporto in orario lavorativo, best effort, priorità bug bloccanti.
- Pro: priorità alta, canale dedicato, aggiornamenti assistiti e procedure rollback.

## 11) Opzioni future (su richiesta)

- Attivazione postazioni tramite QR (check-in) con sessioni e timer automatico.
- App kiosk dedicata per tablet di postazione.
- Gateway certificato per controllo macchine (anti-copia e controllo accessi).
- Integrazione pagamenti reali (POS, Stripe, ecc.).
- Portale partner per distributori (gestione rete clienti/impianti).

## 12) Note legali / licenza d’uso (principi)

Il software viene concesso in licenza d’uso:
- per impianto
- con limite postazioni
- con maintenance per aggiornamenti e supporto

Non è prevista la cessione completa del codice sorgente in questa formula standard (salvo accordi enterprise dedicati).
