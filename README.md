# Palle Girate

Web-app (PWA) per prenotare i campi del centro sportivo.

## Avvio in locale

```bash
npm install
cp .env.example .env      # poi modifica AUTH_SECRET e la password admin
npm run db:setup          # crea il database SQLite e carica il seed
npm run dev               # http://localhost:3000
```

## Test

```bash
npm test
```

## Documentazione

- Requisiti: `docs/requirements.md`
- Specifiche: `docs/superpowers/specs/`
- Piani: `docs/superpowers/plans/`
