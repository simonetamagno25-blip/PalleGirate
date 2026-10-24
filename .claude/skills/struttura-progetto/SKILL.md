---
name: struttura-progetto
description: Mappa delle cartelle di Palle Girate e regole per tenerle in ordine. Usala prima di creare, spostare o rinominare file in questo progetto, e quando l'utente chiede di "riordinare", "mettere in ordine" o "fare pulizia" nella cartella.
---

# Struttura di Palle Girate

Ogni file ha un posto preciso. Prima di creare un file, scegli la cartella da questa mappa; se nessuna va bene, chiedi invece di inventarne una nuova. Prima di toccare l'interfaccia leggi `DESIGN.md` (lo stile "Tabellone delle partenze") e riusa i componenti in `src/components/board/`.

## Mappa

| Cartella | Cosa contiene | Regola |
|---|---|---|
| `src/app/` | Pagine e Server Action (App Router) | `(app)/` area con login, `(app)/admin/` solo admin, `(auth)/` login e attivazione. Le action stanno in `actions.ts` accanto alla pagina che le usa. Ogni pagina e action chiama `requireUser()` / `requireAdmin()` da sola. |
| `src/components/ui/` | Componenti shadcn/ui | Generati con `npx shadcn add`; non modificarli a mano se non serve. |
| `src/components/layout/` | Struttura dell'app: barra laterale, menu mobile, lingua, tema, service worker | |
| `src/components/common/` | Piccoli componenti usati ovunque: importi, card KPI, lista errori | |
| `src/components/<area>/` | Componenti di una funzione: `admin/`, `booking/`, `calendar/`, `charts/`, `notifications/` | Un componente usato da una sola area va nella cartella di quell'area. |
| `src/lib/` | Logica pura, senza Prisma né Next | Regole di prenotazione, fuso orario, calendario, statistiche. Test accanto al file (`x.test.ts`). |
| `src/server/` | Servizi con Prisma, guardie, errori | Un file per dominio (`bookings.ts`, `payments.ts`…), test accanto. |
| `src/i18n/` | Configurazione next-intl | |
| `src/types/` | Dichiarazioni di tipo globali | |
| `messages/` | Testi `it.json` e `en.json` | Stesse chiavi nei due file (lo verifica `tests/i18n.test.ts`). Nessun testo visibile scritto nei componenti. |
| `prisma/` | `schema.prisma` e `seed.ts` | I file `*.db` sono locali e ignorati da git. |
| `tests/` | Setup e helper condivisi dei test, test trasversali | I test di un modulo stanno accanto al modulo, non qui. |
| `public/` | File statici: icone, `sw.js` | |
| `scripts/` | Script da riga di comando (es. `npm run icons`) | |
| `docs/` | Requisiti, appunti del cliente, spec e piani (`docs/superpowers/`), ricerca di design (`docs/design/`) | Nessun altro documento nella cartella principale oltre a quelli elencati sotto. |
| `.impeccable/` | Stato della skill impeccable: `config.json`, `design.json` (token), `surfaces/` (contratto di direzione), `mocks/decision/` (bozze della scelta dello stile) | `review/` e `hook.cache.json` sono locali e ignorati da git. Non modificare a mano `design.json`: si rigenera con `/impeccable document`. |
| cartella principale | Configurazione degli strumenti, `README.md`, `PRODUCT.md` e `DESIGN.md` | `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `postcss.config.mjs`, `components.json`, `.env.example`, `.gitignore`. `PRODUCT.md` (chi usa l'app e perché) e `DESIGN.md` (regole grafiche: colori, caratteri, tabellone) stanno qui per convenzione di impeccable. Gli strumenti li cercano qui: non spostarli. |

## Cose generate: non spostarle e non committarle

`node_modules/`, `.next/`, `.superpowers/` (appunti di lavoro degli agenti), `tsconfig.tsbuildinfo`, `next-env.d.ts`, `prisma/*.db`, `.env`. Sono già in `.gitignore`. Si ricreano con `npm install`, `npm run build`, `npm run db:setup`.

## Come riordinare in sicurezza

1. Guarda prima: `git status --short --ignored` e `git ls-files`, per distinguere i file del progetto da quelli generati.
2. Sposta solo con `git mv`, così la storia del file resta.
3. Aggiorna gli import con l'alias `@/` (mai percorsi relativi lunghi), poi cerca i vecchi percorsi con grep per essere sicuro che non ne resti nessuno.
4. Verifica: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Tutto deve essere verde prima del commit.
5. Un commit dedicato al riordino (`chore: ...`), separato dalle modifiche al codice.
6. Non cancellare mai file del progetto per "fare ordine": se un file sembra inutile, chiedi.
