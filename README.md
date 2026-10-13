# Palle Girate

Web-app per la prenotazione dei campi del centro sportivo: i soci vedono la disponibilità e prenotano da soli, l'admin gestisce prenotazioni, soci e tessere.

Documentazione: requisiti in [`docs/requirements.md`](docs/requirements.md), specifiche in [`docs/superpowers/specs/`](docs/superpowers/specs/).

## Avvio in locale

```bash
npm install
cp .env.example .env      # poi imposta AUTH_SECRET e ADMIN_PASSWORD
npm run dev
```

Il database e il seed (campi, admin, soci di esempio) vengono aggiunti nei passi successivi del piano di sviluppo.

## Test

```bash
npm test
```
