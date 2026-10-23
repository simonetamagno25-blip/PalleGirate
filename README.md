# Palle Girate

Web-app per la prenotazione dei campi del centro sportivo: i soci vedono subito se un campo è libero e prenotano, modificano e cancellano da soli; l'admin gestisce soci, tessere, prenotazioni e pagamenti. Nessuna doppia prenotazione, nemmeno con richieste simultanee. Installabile come app (PWA) su iOS, Android e desktop, in italiano e inglese.

Documentazione: requisiti in [`docs/requirements.md`](docs/requirements.md), specifiche in [`docs/superpowers/specs/`](docs/superpowers/specs/), piani di sviluppo in [`docs/superpowers/plans/`](docs/superpowers/plans/).

## Funzionalità

**Soci**
- Calendario della disponibilità per giorno e campo (vedono solo libero/occupato), prenotazione guidata con prezzo, modifica e cancellazione entro la finestra consentita, storico.
- Dashboard con prenotazioni attive (es. 2/3), stato della tessera, importo da saldare, strike e grafici (ore giocate per sport, prenotazioni per mese).
- Notifiche con campanella: prenotazione creata/modificata/cancellata (anche dall'admin, con motivo), promemoria, avviso e blocco per mancato pagamento, sblocco, tessera in scadenza o scaduta.

**Admin**
- Soci e tessere (registra, modifica, rinnova, reimposta accesso, promuovi ad admin), con strike e insoluti in lista e scheda del socio.
- Tutte le prenotazioni, con filtri; crea, modifica e cancella senza i vincoli del socio (restano solo sovrapposizioni e orari di apertura).
- Pagamenti da registrare: Pagata / Non pagata / Esente, e no-show.
- Impostazioni del centro (orari, anticipo, limite di prenotazioni attive, finestra di modifica, avvisi) e campi (nome, durata slot, prezzo, attivazione).
- Dashboard: occupazione per campo (giorno/settimana/mese), incassato vs atteso e insoluto, no-show, soci bloccati, fasce orarie più richieste (heatmap), andamento su 12 mesi, tessere in scadenza.

### Regole di business in breve

- Orari di inizio ogni 15 minuti (configurabile: 15/30/60), dentro l'orario di apertura; una prenotazione copre 1 o 2 slot consecutivi dello stesso campo.
- Il socio prenota al massimo 14 giorni prima, al massimo 3 prenotazioni attive, non oltre la scadenza della tessera, non se bloccato. Può modificare o cancellare fino a 2 ore prima dell'inizio: dopo, la prenotazione va pagata.
- **Strike** (non si azzerano mai): il 1° insoluto avvisa; dal 2° il socio è bloccato e le sue prenotazioni future vengono cancellate in automatico (con notifica e motivo). Si sblocca quando l'admin registra il pagamento di tutti gli insoluti; ogni nuovo insoluto lo blocca di nuovo subito. Segnare Esente un insoluto cancella il suo strike.
- Una cancellazione dell'admin a meno di 2 ore dall'inizio resta da pagare (campo libero, ma la prenotazione entra tra i pagamenti da registrare).
- I valori numerici (14 giorni, 3, 2 ore, 15 giorni…) sono modificabili da **Admin → Impostazioni**; i messaggi di errore li citano sempre aggiornati.

## Avvio in locale

Serve Node.js 20 o superiore.

```bash
npm install
cp .env.example .env      # poi imposta AUTH_SECRET e ADMIN_PASSWORD (vedi sotto)
npm run setup             # crea il database SQLite e carica i dati di esempio
npm run dev               # http://localhost:3000
```

In `.env`:

| Variabile | Cosa è |
|---|---|
| `DATABASE_URL` | Database SQLite locale. Lascia `?connection_limit=1`: serializza le scritture concorrenti. |
| `AUTH_SECRET` | Segreto delle sessioni. Generane uno con `npx auth secret` (o `openssl rand -base64 32`). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Credenziali dell'admin creato dal seed. |

### Dati di esempio (seed)

`npm run setup` crea impostazioni, i 5 campi (Calcio, Tennis 1, Tennis 2, Basket, Bocce), l'admin e tre soci. Si può rieseguire senza duplicare nulla.

| Utente | Come entrare |
|---|---|
| Admin | email e password da `.env` |
| Mario Rossi (tessera `T0001`) | `mario.rossi@example.com` / `socio1234` |
| Giulia Bianchi (`T0002`), Luca Verdi (`T0003`, tessera in scadenza) | da attivare: pagina "Prima volta? Attiva il tuo account" con numero tessera + email, poi scelgono la password |

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo |
| `npm run build` / `npm start` | Build di produzione / avvio (qui si registra il service worker della PWA) |
| `npm test` | Test automatici (Vitest, su un database SQLite di prova che si ricrea da solo) |
| `npm run lint` | Controllo del codice |
| `npm run setup` | Crea/aggiorna le tabelle e carica il seed |

## Come funziona

- **Stack**: Next.js (App Router, TypeScript), Prisma + SQLite, Auth.js (credenziali, sessione JWT), next-intl (IT/EN), Tailwind + shadcn/ui, Recharts, Vitest.
- **Regole di prenotazione** (`src/lib/booking-rules`): modulo puro, senza dipendenze da Next o Prisma, testabile da solo. Tutte le regole temporali usano il fuso `Europe/Rome` e girano sul server: il browser non decide nulla.
- **Niente sovrapposizioni**: ogni prenotazione scrive una riga per ogni quarto d'ora occupato (`Occupancy`), con un indice univoco su campo + quarto d'ora. Il vincolo è del database, quindi regge anche a richieste simultanee, e funziona uguale su SQLite e PostgreSQL.
- **Pagamenti e strike** (`src/lib/payments.ts`): ogni esito si registra in transazione con un cambio di stato condizionato (compare-and-set), così due registrazioni simultanee non creano due strike.
- **Privacy**: il calendario dei soci mostra solo "occupato"; nome e dati di chi ha prenotato li vede solo l'admin.
- **Autorizzazione**: ogni pagina e azione riservata inizia con `requireMember()` o `requireAdmin()`, che rileggono il ruolo dal database. L'area `/admin` per un socio risponde 404.
- **Sessioni**: JWT con una versione per utente; "reimposta accesso" la incrementa, quindi i vecchi token non valgono più nemmeno dopo la riattivazione.
- **Lingua**: testi in `messages/it.json` e `messages/en.json`; i test verificano chiavi e segnaposto uguali nelle due lingue e che ogni chiave usata nel codice esista. La scelta si salva sul profilo.
- **PWA**: `manifest.webmanifest`, icone generate da `/pwa-icon/<192|512>` e un service worker minimo (`public/sw.js`) che non mette nulla in cache: l'uso offline non è richiesto.

## Limiti noti e scelte da conoscere

- **Rate limit in memoria** (`src/lib/rate-limit.ts`): i tentativi di login (10 ogni 15 minuti per email) e di attivazione (5 per numero tessera e per IP) sono contati nella memoria del server. Con più istanze o in serverless ogni istanza conta per sé: per un deploy così serve un archivio condiviso (es. Redis) dietro la stessa funzione `checkRateLimit`.
- **Notifiche temporali "pigre"**: promemoria prenotazione e avvisi di tessera non hanno un cron; si generano, una sola volta per evento, quando l'utente carica una pagina. In produzione si possono sostituire con un job programmato che chiami `runLazyNotifications`.
- **Tessere e numeri**: i numeri tessera sono sequenziali, quindi l'attivazione dipende dal limite di tentativi qui sopra e dall'email, che deve coincidere.
- **Sessioni JWT**: i token emessi prima dell'introduzione della versione di sessione non sono più validi (un nuovo login).

## Passare a PostgreSQL

Lo schema Prisma è compatibile con PostgreSQL (nessun tipo o funzione specifica di SQLite).

1. In `prisma/schema.prisma` cambia `provider = "sqlite"` in `provider = "postgresql"`.
2. Imposta `DATABASE_URL` sulla stringa di connessione (es. `postgresql://utente:password@host:5432/palle_girate`), senza `?connection_limit=1`.
3. Crea le tabelle: `npx prisma db push` (oppure `npx prisma migrate dev --name init` per tenere le migrazioni).
4. Carica i dati iniziali: `npm run db:seed`.
5. `npm run build && npm start`.

Cose da sapere sul passaggio:

- La creazione di una prenotazione usa una transazione `Serializable` e ritenta fino a 3 volte se PostgreSQL segnala un conflitto di scrittura (`P2034`): serve a non superare il limite di prenotazioni attive con due richieste simultanee dello stesso socio. Modifica, cancellazione e registrazione dei pagamenti cambiano stato con un aggiornamento condizionato, quindi due azioni simultanee sulla stessa prenotazione vincono una sola volta.
- L'anti-sovrapposizione resta garantito dall'indice univoco su `Occupancy(fieldId, quarterStart)`, identico su entrambi i database.
- I test girano su SQLite: `vitest.config.mts` imposta `DATABASE_URL` su `prisma/test.db` e `tests/global-setup.ts` lo ricrea con `prisma db push`. Dopo il cambio di `provider` non funzionano finché non si adatta `tests/test-env.mjs` a un database PostgreSQL di prova (o si torna a `sqlite` per lanciarli).
- **Non provato**: il passaggio a PostgreSQL non è stato eseguito su un'istanza reale; lo schema e il codice sono scritti per reggerlo, ma la prima prova va fatta prima di un deploy.
