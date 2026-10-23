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
