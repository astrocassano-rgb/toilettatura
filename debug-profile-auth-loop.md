# Debug Session: profile-auth-loop

Status: OPEN

## Sintomo
- Navigando verso `/profilo` si osserva un loop tra `/profilo` e `/login?next=%2Fprofilo`.

## Ipotesi falsificabili
- H1: `supabase.auth.getUser()` nella pagina profilo vede utente nullo lato server anche quando il browser ha una sessione valida.
- H2: il middleware o una guard lato server riscrive/redirecta la richiesta verso `/login` prima che la sessione venga stabilizzata.
- H3: la pagina `/login` rileva una sessione client e rilancia verso `/profilo`, mentre la pagina profilo lato server non vede la stessa sessione.
- H4: i cookie auth non vengono propagati correttamente tra middleware, server components e route handlers.
- H5: c'e un fallback di session cleanup che invalida il refresh token o forza sign-out durante il rendering.

## Piano evidenza
- Aggiungere strumentazione minima in middleware, `/profilo`, `/login` e helper Supabase/sessione.
- Riprodurre il loop e confrontare il percorso completo request -> redirect -> render.
- Confermare o scartare le ipotesi in base ai log.
