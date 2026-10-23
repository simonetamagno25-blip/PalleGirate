# Palle Girate

Web-app (PWA) per prenotare i campi del centro sportivo.

## Avvio in locale

```bash
npm install
cp .env.example .env      # poi modifica AUTH_SECRET e la password admin
npm run db:setup          # crea il database SQLite e carica il seed
npm run dev               # http://localhost:3000
```

Utenti del seed: admin con le credenziali di `.env`; soci `giulia@example.it`, `luca@example.it` (tessera in scadenza), `sara@example.it` (tessera scaduta) con password `socio1234`; `paolo@example.it` da attivare con tessera `PG-0004`.

## Test

```bash
npm test
```

## Documentazione

- Requisiti: `docs/requirements.md`
- Specifiche: `docs/superpowers/specs/`
- Piani: `docs/superpowers/plans/`
