# Palle Girate

Web-app (PWA) per prenotare i campi del centro sportivo.

## Avvio in locale

```bash
npm install
cp .env.example .env      # poi modifica AUTH_SECRET e la password admin
npm run db:setup          # crea il database SQLite e carica il seed
npm run dev               # http://localhost:3000
```

In produzione con `next start` imposta `AUTH_TRUST_HOST=true` (già presente in `.env.example`).

Utenti del seed: admin con le credenziali di `.env`; soci `giulia@example.it`, `luca@example.it` (tessera in scadenza), `sara@example.it` (tessera scaduta) con password `socio1234`; `paolo@example.it` da attivare con tessera `PG-0004`.

## Test

```bash
npm test
```

## Documentazione

- Requisiti: `docs/requirements.md`
- Specifiche: `docs/superpowers/specs/`
- Piani: `docs/superpowers/plans/`

## Architettura

- `src/lib/**`: logica pura (regole di prenotazione, fuso orario, calendario, statistiche), testata in isolamento.
- `src/server/**`: servizi con Prisma; ogni operazione di prenotazione gira in una transazione.
- `src/app/**`: pagine e Server Action (App Router). Le action chiamano i servizi e restituiscono `ActionResult`.
- Nessuna doppia prenotazione: la tabella `FieldOccupancy` ha una riga per ogni quarto d'ora occupato con chiave primaria `(fieldId, quarterStart)`.
- Tutte le regole temporali sono calcolate sul server in Europe/Rome.
- Testi: `messages/it.json` e `messages/en.json` (stesse chiavi, verificate da `tests/i18n.test.ts`).

## Stack

Next.js 15, Prisma + SQLite, Auth.js (credenziali, JWT), next-intl, Tailwind + shadcn/ui, Recharts, Vitest.

## Funzioni

- Socio: calendario disponibilità, prenotazione guidata (1–2 slot), modifica e cancellazione fino a 2 ore prima, dashboard, notifiche, profilo.
- Admin: soci e tessere (rinnovo, reimposta accesso, promozione admin), prenotazioni senza vincoli, pagamenti e strike, impostazioni e campi, statistiche.
- Lingue: italiano e inglese. Tema chiaro/scuro. Installabile come app (PWA).

## Regole principali

Vedi `docs/superpowers/specs/2026-10-13-palle-girate-design.md` §7–§8. Tutti i parametri si modificano da **Amministrazione → Impostazioni**.

## Passare a PostgreSQL

1. In `prisma/schema.prisma` imposta `provider = "postgresql"`.
2. Imposta `DATABASE_URL="postgresql://utente:password@host:5432/pallegirate"` (senza `connection_limit=1`).
3. `npx prisma migrate dev --name init` (in locale) oppure `npx prisma db push`, poi `npm run db:seed`.
4. Nella ricerca soci (`src/app/(app)/admin/members/page.tsx`) aggiungi `mode: "insensitive"` ai filtri `contains`.

Il resto dell'app non cambia: la tabella `FieldOccupancy` garantisce la non-sovrapposizione anche su PostgreSQL.

## Produzione

- Imposta `AUTH_SECRET` con un valore casuale lungo e cambia la password dell'admin dopo il primo accesso.
- Le notifiche temporali (promemoria, tessere in scadenza) si generano quando l'utente apre l'app, quindi non serve un cron.
- Le sessioni sono JWT: nessuno stato lato server oltre al database.
- Prima di esporre l'app su Internet aggiungi un limite ai tentativi di login e di attivazione (oggi non c'è rate limiting).
- Su PostgreSQL verifica che un doppio click sullo stesso slot restituisca "Questo orario è già occupato." (mappatura dell'errore P2002 in `src/server/bookings.ts`) e che due registrazioni "Non pagata" simultanee per lo stesso socio contino correttamente gli strike (su SQLite le scritture sono serializzate).
- Controlla che `AUTH_SECRET` non sia il valore d'esempio `cambia-questa-stringa` di `.env.example`.
