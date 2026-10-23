# Palle Girate

Web-app per la prenotazione dei campi del centro sportivo: i soci vedono subito se un campo è libero e prenotano, modificano e cancellano da soli; l'admin gestisce soci, tessere e prenotazioni. Nessuna doppia prenotazione, nemmeno con richieste simultanee.

Documentazione: requisiti in [`docs/requirements.md`](docs/requirements.md), specifiche in [`docs/superpowers/specs/`](docs/superpowers/specs/), piani di sviluppo in [`docs/superpowers/plans/`](docs/superpowers/plans/).

> **Stato**: Sessione 1 completata (soci e tessere, calendario, prenotazioni con tutte le regole, autenticazione, IT/EN). La Sessione 2 aggiunge pagamenti e strike, notifiche, dashboard, PWA e rifiniture.

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
| `npm test` | Test automatici (Vitest, su un database SQLite di prova che si ricrea da solo) |
| `npm run lint` / `npm run build` | Controllo del codice / build di produzione |
| `npm run setup` | Crea/aggiorna le tabelle e carica il seed |

## Come funziona

- **Stack**: Next.js (App Router, TypeScript), Prisma + SQLite, Auth.js (credenziali, sessione JWT), next-intl (IT/EN), Tailwind + shadcn/ui, Vitest. È lo stack proposto nei requisiti; le motivazioni sono nel documento di design.
- **Regole di prenotazione** (`src/lib/booking-rules`): modulo puro, senza dipendenze da Next o Prisma, testabile da solo. Tutte le regole temporali usano il fuso `Europe/Rome` e girano sul server: il browser non decide nulla.
- **Niente sovrapposizioni**: ogni prenotazione scrive una riga per ogni quarto d'ora occupato (`Occupancy`), con un indice univoco su campo + quarto d'ora. Il vincolo è del database, quindi regge anche a richieste simultanee, e funziona uguale su SQLite e PostgreSQL.
- **Privacy**: il calendario dei soci mostra solo "occupato"; nome e dati di chi ha prenotato li vede solo l'admin.
- **Autorizzazione**: ogni pagina e azione riservata inizia con `requireMember()` o `requireAdmin()`, che rileggono il ruolo dal database. L'area `/admin` per un socio risponde 404.
- **Lingua**: testi in `messages/it.json` e `messages/en.json` (un test verifica che abbiano le stesse chiavi); la scelta si salva sul profilo.

## Passare a PostgreSQL

Lo schema Prisma è compatibile con PostgreSQL: in `prisma/schema.prisma` cambia `provider = "sqlite"` in `"postgresql"`, imposta `DATABASE_URL` sulla stringa di connessione (rimuovi `?connection_limit=1`) e lancia `npx prisma db push`. La guida completa al deploy arriva con la Sessione 2.
