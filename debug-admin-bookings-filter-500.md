# Debug Session: admin-bookings-filter-500

Status: OPEN

## Sintomo
- `/admin/prenotazioni` carica.
- `/admin/prenotazioni?from=&to=&status=CONFIRMED` produce 500 in dev con errore React Client Manifest / webpack modules.

## Ipotesi falsificabili
- H1: la firma della pagina con `searchParams?: Promise<...>` o il suo uso sta causando un path RSC non valido in dev.
- H2: uno dei valori passati dal filtro (`status`, `from`, `to`) manda in errore la query Supabase e il crash viene mascherato dal bundler.
- H3: il rendering della UI filtri con `Link` + `Button` o `select` dentro il server component innesca il bug del manifest solo con querystring presente.
- H4: il problema dipende dal dev server/chunk cache di Next e non dalla logica del filtro; serve distinguere errore di runtime reale da incoerenza HMR.
- H5: la combinazione di `status as any` nella query e tipo enum Supabase genera un errore runtime specifico quando il filtro e diverso da default.

## Piano evidenza
- Aggiungere strumentazione minima nella pagina admin prenotazioni prima della query, dopo la query e prima del render.
- Riprodurre `/admin/prenotazioni?status=CONFIRMED` e leggere i log.
- Confermare o scartare le ipotesi prima del fix.
