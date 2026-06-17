# Pubblicazione su Aruba Hosting Basic (solo pagina marketing)

Questo hosting è tipicamente **statico** (HTML/CSS/JS) e non esegue Next.js/Node. Per questo motivo pubblichiamo solo la pagina marketing.

## File da caricare

- `marketing-aruba/index.html` → rinomina o carica come `index.html` in `public_html/`
- `public/logo.png` → carica come `logo.png` nella stessa cartella di `index.html`
- la tua infografica → caricala come `infografica-dogwash24.png` nella stessa cartella di `index.html`

Nota: nel file `index.html` le immagini sono referenziate così:

- `./logo.png`
- `./infografica-dogwash24.png`

Quindi devono trovarsi **nella stessa cartella** del file HTML.

## Passi (FTP)

1. Apri il pannello Aruba e recupera i dati FTP del dominio `dogwash24.it`.
2. Con FileZilla (o simili) collegati al server.
3. Vai nella cartella `public_html/`.
4. Carica:
   - `index.html`
   - `logo.png`
   - `infografica-dogwash24.png`
5. Apri `https://dogwash24.it` e verifica.

## Anteprima locale (prima di caricare su Aruba)

Se apri `marketing-aruba/index.html` direttamente dal PC, vedrai le immagini solo se copi anche:

- `logo.png` dentro `marketing-aruba/`
- `infografica-dogwash24.png` dentro `marketing-aruba/`

Su hosting Linux i nomi file sono sensibili a maiuscole/minuscole, quindi assicurati che siano **esattamente** uguali.

## Collegamento alla webapp

Nel file `index.html` c’è un link a `https://app.dogwash24.it`.

Quando pubblichi la webapp completa su un host che supporta Node.js (Vercel, Render, VPS, ecc.), crea in Aruba un record DNS:

- `app.dogwash24.it` → CNAME/A verso l’hosting della webapp

Se la tua webapp non sarà su `app.dogwash24.it`, modifica il link nel file `index.html`.
