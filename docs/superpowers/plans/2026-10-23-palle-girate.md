# Palle Girate – Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire la web-app PWA "Palle Girate" per prenotare i campi del centro sportivo: i soci prenotano da soli entro regole verificate dal server, l'admin gestisce soci, tessere, prenotazioni, pagamenti in contanti e strike.

**Architecture:** Next.js full-stack (App Router) con Server Actions. Le regole di business stanno in moduli puri (`src/lib/**`) senza dipendenze da Next o Prisma, testati con Vitest. I servizi in `src/server/**` usano Prisma, girano in transazione e lanciano `DomainError` con codici di violazione che l'interfaccia traduce. Le sovrapposizioni sono impossibili grazie alla tabella `FieldOccupancy`, che ha una riga per ogni quarto d'ora occupato e una chiave primaria `(fieldId, quarterStart)`.

**Tech Stack:** Next.js 15 + React 19 + TypeScript, Prisma 6 + SQLite (compatibile PostgreSQL), Auth.js v5 (Credentials, JWT), bcryptjs, zod, next-intl 4, Tailwind CSS 4 + shadcn/ui, Recharts, lucide-react, next-themes, @date-fns/tz, Vitest 3.

**Spec:** `docs/superpowers/specs/2026-10-13-palle-girate-design.md` (il "come") e `docs/requirements.md` (il "cosa"). Se sono in conflitto, vale la spec. Chi esegue il piano li legge entrambi prima di iniziare.

## Global Constraints

- Fuso orario **Europe/Rome** per ogni regola temporale; istanti salvati in UTC (`DateTime`); date di calendario salvate come stringa `YYYY-MM-DD`.
- Tutte le regole temporali si calcolano **sul server** con `now` del server, mai con l'ora del browser.
- Nessuna stringa visibile cablata nei componenti: ogni testo sta in `messages/it.json` e `messages/en.json`, che hanno sempre le stesse chiavi (lo controlla un test). ESLint `react/jsx-no-literals` è attivo.
- Un socio non vede mai nome o dati di chi ha prenotato un campo (solo libero/occupato/"tua").
- Parametri di default (tutti in `Settings`, modificabili dall'admin): apertura 08:00 (480 min), chiusura 23:00 (1380 min), passo 15 min, anticipo 14 giorni, max 3 prenotazioni attive, finestra modifica/cancellazione 120 min, `MAX_SLOTS_PER_BOOKING = 2`, avviso tessera 15 giorni, promemoria 24 ore.
- Campi del seed (5): Calcio 90 min 60 €, Tennis 1 60 min 18 €, Tennis 2 60 min 18 €, Basket 60 min 25 €, Bocce 60 min 10 €. Prezzi salvati in centesimi.
- L'admin salta tutte le regole del socio **tranne** non-sovrapposizione, orari di apertura, passo di 15 minuti, numero di slot e campo attivo.
- Strike: non si azzerano mai. 1° → avviso; 2° e successivi → blocco + cancellazione delle prenotazioni future. Bloccato = `strike ≥ 2` **e** almeno una prenotazione `UNPAID` (stato derivato).
- Fuori ambito: pagamenti online, ricorrenze, store, email/SMS/push, numero giocatori, costi.
- Avvio locale: `npm install`, `npm run db:setup`, `npm run dev`. `.env.example` è committato, `.env` no.
- Git: branch `main`, remote `https://github.com/simonetamagno25-blip/PalleGirate`, commit piccoli e descrittivi. Primo push già fatto e autorizzato dall'utente: i push su `main` a fine task o sessione sono ok. Mai `--force`.
- Comandi pensati per Windows (PowerShell o Git Bash): niente `VAR=x cmd` inline, si usano script npm e config Vitest.

## Review Focus

1. **Giorni del cambio d'ora** (es. 25/10/2026, 28/03/2027): una prenotazione alle 08:00 di quel giorno deve cadere alle 08:00 ora di Roma, e il limite dei 14 giorni non deve slittare di un giorno. → test in Task 4 (`rome.test.ts`) e in Task 5 (`member.test.ts`, "counts advance days across the DST change").
2. **Modificare una prenotazione senza "scontrarsi con sé stessa"**: spostarla di 15 minuti dentro il proprio intervallo deve riuscire, e con 3 prenotazioni attive la modifica non deve dare `TOO_MANY_ACTIVE`. → test in Task 6 (`bookings.test.ts`, "moves a booking by 15 minutes overlapping itself" e "enforces max 3 active bookings but lets a member modify one").
3. **Doppio click o due schede che prenotano lo stesso slot**: una richiesta riesce, l'altra riceve il messaggio "slot già occupato" e non un errore 500. → test concorrente in Task 6 ("lets only one of two simultaneous requests win"); `runAction` (Task 7) lo trasforma in un messaggio tradotto; verifica manuale con due schede in Task 10.
4. **Attivazione con email scritta diversamente** (`" Mario.Rossi@Example.it "`) o tessera con spazi o minuscole: deve funzionare; se tessera o email sono sbagliate il messaggio è lo stesso, così non si scopre quale dei due dati esiste. → test in Task 7 (`accounts.test.ts`).
5. **Blocco con prenotazioni già iniziate o passate**: la cancellazione automatica tocca solo quelle con inizio nel futuro; quelle cancellate per il blocco non diventano "da pagare". → test in Task 12 (`payments.test.ts`, "second unpaid booking blocks and cancels future bookings only").

---

## Struttura dei file

```
docs/requirements.md                        # spostato dalla radice (Task 1)
docs/superpowers/specs/…-design.md          # spostato dalla radice (Task 1)
docs/superpowers/plans/…-palle-girate.md    # questo piano
messages/it.json, messages/en.json          # tutte le stringhe
prisma/schema.prisma, prisma/seed.ts
public/icons/*, public/sw.js
scripts/make-icons.ts
src/auth.ts                                 # configurazione Auth.js
src/i18n/request.ts                         # next-intl senza routing per lingua
src/lib/time/rome.ts                        # helper fuso orario (puri)
src/lib/booking-rules/{types,schedule,member,strikes,index}.ts   # regole pure
src/lib/membership.ts                       # scadenze e rinnovi (puri)
src/lib/calendar/{grid,free-starts}.ts      # griglia e orari liberi (puri)
src/lib/stats/{member,admin}.ts             # aggregazioni KPI (pure)
src/lib/auth/normalize.ts
src/server/db.ts, errors.ts, settings.ts, member-state.ts
src/server/bookings.ts                      # crea/modifica/cancella + occupazione
src/server/accounts.ts                      # attivazione, credenziali, reset
src/server/members.ts                       # soci e tessere (admin)
src/server/availability.ts                  # disponibilità del giorno
src/server/payments.ts                      # pagamenti e strike
src/server/notifications.ts                 # notify + notifiche temporali pigre
src/server/fields.ts                        # impostazioni e campi
src/server/admin-bookings.ts                # liste/filtri admin
src/server/dashboard.ts                     # query per le dashboard
src/server/guards.ts, action-result.ts
src/app/(auth)/login, (auth)/activate
src/app/(app)/layout.tsx + calendar, book, bookings, profile, dashboard, notifications
src/app/(app)/admin/{members,bookings,payments,settings,dashboard}
src/components/**                           # componenti UI (shadcn in components/ui)
tests/global-setup.ts, tests/helpers/db.ts, tests/i18n.test.ts
```

Ogni test di un modulo sta accanto al modulo (`x.ts` → `x.test.ts`). I test che toccano il database usano `prisma/test.db`, ricreato a ogni esecuzione.

---

# PARTE 1 – Sessione 1: fondamenta e prenotazioni

### Task 1: Setup del progetto, Git e strumenti di test

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`, `README.md`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/smoke.test.ts`

**Interfaces:**
- Produces: script npm `dev`, `build`, `lint`, `test`, `db:setup`, `db:seed`; alias di import `@/` → `src/`.

> Nota: la cartella si chiama `palle girate` (con lo spazio), che non è un nome npm valido. Per questo non usiamo `create-next-app` e scriviamo i file di configurazione a mano.

- [x] **Step 1: Git e documenti (già fatto il 23/10/2026)**

Repo inizializzato su `main`, collegato a `origin` e allineato a `origin/main`. I documenti sono già in `docs/requirements.md` e `docs/superpowers/specs/`. Sul remoto c'è anche `info per progetto Palle Girate.odt` (appunti del cliente): lascialo dov'è. Il primo push è già stato fatto, quindi i push successivi su `main` non richiedono un'altra conferma.

- [ ] **Step 2: Scrivi `package.json`**

```json
{
  "name": "palle-girate",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:setup": "prisma db push && prisma db seed",
    "db:seed": "prisma db seed",
    "icons": "tsx scripts/make-icons.ts"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```

- [ ] **Step 3: Installa le dipendenze**

```bash
npm i next@15 react@19 react-dom@19 @prisma/client@6 next-auth@beta bcryptjs zod @date-fns/tz date-fns next-intl@4 recharts lucide-react next-themes clsx tailwind-merge class-variance-authority
npm i -D typescript @types/node @types/react @types/react-dom @types/bcryptjs prisma@6 tailwindcss@4 @tailwindcss/postcss vitest@3 tsx eslint@9 eslint-config-next@15 @eslint/eslintrc sharp @formatjs/icu-messageformat-parser
```

Se nel frattempo `next-auth` v5 è uscito stabile, usa `next-auth@5` al posto di `@beta`.

- [ ] **Step 4: File di configurazione**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

`postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`eslint.config.mjs`:
```js
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    rules: {
      // Anti-obiettivo della spec: nessun testo cablato nei componenti.
      "react/jsx-no-literals": ["error", { noStrings: true, ignoreProps: true, allowedStrings: ["·", "–", "/", ":", "€", "%", "+", "-"] }],
    },
  },
];
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { TEST_DATABASE_URL } from "./tests/test-db-url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: TEST_DATABASE_URL, AUTH_SECRET: "test-secret" },
    // I test di integrazione condividono un solo file SQLite.
    fileParallelism: false,
  },
});
```

`tests/test-db-url.ts`:
```ts
// Path relativo a prisma/schema.prisma, quindi il file è prisma/test.db.
// connection_limit=1 serializza le transazioni su SQLite (niente "database is locked").
export const TEST_DATABASE_URL = "file:./test.db?connection_limit=1";
```

`tests/global-setup.ts` (per ora vuoto di logica DB, Task 3 lo completa):
```ts
export default function setup() {}
```

`.gitignore`:
```
node_modules
.next
.env
*.db
*.db-journal
next-env.d.ts
coverage
```

`.env.example`:
```
# SQLite locale. connection_limit=1 serializza le scritture.
DATABASE_URL="file:./dev.db?connection_limit=1"
# Genera con: npx auth secret   (oppure una stringa casuale lunga)
AUTH_SECRET="cambia-questa-stringa"
# Admin creato dal seed
ADMIN_EMAIL="admin@pallegirate.local"
ADMIN_PASSWORD="cambiami-subito"
```

Copia `.env.example` in `.env` (`cp .env.example .env`).

- [ ] **Step 5: Tailwind, layout minimo e shadcn/ui**

`src/app/globals.css`:
```css
@import "tailwindcss";
```

`src/app/layout.tsx`:
```tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/calendar");
}
```

Poi inizializza shadcn (scegli **Neutral** se te lo chiede: il comando riscrive `globals.css` con i token chiaro/scuro e crea `src/lib/utils.ts`):

```bash
npx shadcn@latest init -y --base-color neutral
npx shadcn@latest add button card input label select dialog badge table tabs dropdown-menu sonner separator textarea switch alert sheet
```

- [ ] **Step 6: Test di fumo per Vitest**

`src/lib/smoke.test.ts`:
```ts
import { describe, expect, it } from "vitest";

describe("toolchain", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 7: README iniziale**

`README.md`:
````markdown
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
````

- [ ] **Step 8: Verifica e commit**

Run: `npm run build`
Expected: build riuscita (la pagina `/` fa redirect; `/calendar` darà 404 finché non esiste, va bene).

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, shadcn/ui, Vitest and docs"
```

---

### Task 2: Infrastruttura i18n (IT/EN)

**Files:**
- Create: `src/i18n/locales.ts`, `src/i18n/request.ts`, `messages/it.json`, `messages/en.json`, `tests/i18n.test.ts`
- Modify: `next.config.ts`, `src/app/layout.tsx`

**Interfaces:**
- Produces: `LOCALES`, `type Locale`, `LOCALE_COOKIE = "locale"`, `toLocale()` da `@/i18n/locales`; namespace di messaggi `app`, `nav`, `common`, `errors`. Ogni task successivo aggiunge le sue chiavi a **entrambi** i file.

- [ ] **Step 1: Scrivi il test di parità delle chiavi**

`tests/i18n.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import it_ from "../messages/it.json";
import en from "../messages/en.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

// Nomi degli argomenti ICU ({name}, {count, plural, …}), anche annidati nei plurali.
// parse() lancia un errore se un messaggio non è ICU valido: è un controllo in più.
function placeholders(s: string): string[] {
  const out = new Set<string>();
  const walk = (els: MessageFormatElement[]) => {
    for (const el of els) {
      if (el.type !== TYPE.literal && el.type !== TYPE.pound) out.add(el.value);
      if ("options" in el) for (const o of Object.values(el.options)) walk(o.value);
      if (el.type === TYPE.tag) walk(el.children);
    }
  };
  walk(parse(s));
  return [...out].sort();
}

describe("translations", () => {
  it("it.json and en.json have the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(it_).sort());
  });

  it("every message uses the same placeholders in both languages", () => {
    const get = (o: Record<string, unknown>, path: string) =>
      path.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], o) as string;
    for (const k of keys(it_)) {
      expect(placeholders(get(en, k)), k).toEqual(placeholders(get(it_, k)));
    }
  });
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npm test -- tests/i18n.test.ts`
Expected: FAIL, "Failed to resolve import ../messages/it.json".

- [ ] **Step 3: Crea i file di messaggi**

`messages/it.json`:
```json
{
  "app": { "name": "Palle Girate", "tagline": "Prenota i campi del centro sportivo" },
  "nav": {
    "calendar": "Calendario", "book": "Prenota", "bookings": "Le mie prenotazioni", "profile": "Profilo",
    "dashboard": "Dashboard", "notifications": "Notifiche", "admin": "Amministrazione", "logout": "Esci",
    "adminMembers": "Soci", "adminBookings": "Prenotazioni", "adminPayments": "Pagamenti",
    "adminSettings": "Impostazioni", "adminDashboard": "Statistiche"
  },
  "common": { "save": "Salva", "cancel": "Annulla", "confirm": "Conferma", "back": "Indietro", "close": "Chiudi", "yes": "Sì", "no": "No", "search": "Cerca", "loading": "Caricamento…" },
  "errors": {
    "generic": "Qualcosa è andato storto. Riprova.",
    "START_NOT_ON_STEP": "L'orario di inizio deve essere un multiplo di {step} minuti.",
    "BEFORE_OPENING": "Il centro apre alle {time}.",
    "AFTER_CLOSING": "La prenotazione deve finire entro le {time}.",
    "INVALID_SLOTS": "Puoi prenotare da 1 a {max} slot consecutivi.",
    "FIELD_INACTIVE": "Questo campo non è al momento prenotabile.",
    "IN_PAST": "Non puoi prenotare nel passato.",
    "TOO_FAR_AHEAD": "Puoi prenotare al massimo {days} giorni in anticipo (fino al {lastDay}).",
    "MEMBERSHIP_MISSING": "Serve una tessera valida per prenotare.",
    "MEMBERSHIP_EXPIRED": "La tua tessera scade il {expiry}: non puoi prenotare dopo quella data.",
    "TOO_MANY_ACTIVE": "Hai già {max} prenotazioni attive.",
    "BLOCKED": "Il tuo account è bloccato per mancati pagamenti. Salda gli insoluti per tornare a prenotare.",
    "SLOT_TAKEN": "Questo orario è già occupato.",
    "CHANGE_WINDOW_CLOSED": "Mancano meno di {hours} ore all'inizio: non puoi più modificare o cancellare.",
    "ALREADY_CANCELLED": "La prenotazione è già cancellata.",
    "NOT_FOUND": "Elemento non trovato.",
    "FORBIDDEN": "Non hai i permessi per questa operazione.",
    "INVALID_INPUT": "Controlla i dati inseriti."
  }
}
```

`messages/en.json`:
```json
{
  "app": { "name": "Palle Girate", "tagline": "Book the sports centre's courts" },
  "nav": {
    "calendar": "Calendar", "book": "Book", "bookings": "My bookings", "profile": "Profile",
    "dashboard": "Dashboard", "notifications": "Notifications", "admin": "Administration", "logout": "Log out",
    "adminMembers": "Members", "adminBookings": "Bookings", "adminPayments": "Payments",
    "adminSettings": "Settings", "adminDashboard": "Statistics"
  },
  "common": { "save": "Save", "cancel": "Cancel", "confirm": "Confirm", "back": "Back", "close": "Close", "yes": "Yes", "no": "No", "search": "Search", "loading": "Loading…" },
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "START_NOT_ON_STEP": "The start time must be a multiple of {step} minutes.",
    "BEFORE_OPENING": "The centre opens at {time}.",
    "AFTER_CLOSING": "The booking must end by {time}.",
    "INVALID_SLOTS": "You can book from 1 to {max} consecutive slots.",
    "FIELD_INACTIVE": "This court cannot be booked right now.",
    "IN_PAST": "You cannot book in the past.",
    "TOO_FAR_AHEAD": "You can book at most {days} days ahead (until {lastDay}).",
    "MEMBERSHIP_MISSING": "You need a valid membership card to book.",
    "MEMBERSHIP_EXPIRED": "Your card expires on {expiry}: you cannot book after that date.",
    "TOO_MANY_ACTIVE": "You already have {max} active bookings.",
    "BLOCKED": "Your account is blocked for unpaid bookings. Settle them to book again.",
    "SLOT_TAKEN": "This time slot is already taken.",
    "CHANGE_WINDOW_CLOSED": "It is less than {hours} hours to the start: you can no longer change or cancel.",
    "ALREADY_CANCELLED": "The booking is already cancelled.",
    "NOT_FOUND": "Item not found.",
    "FORBIDDEN": "You are not allowed to do this.",
    "INVALID_INPUT": "Please check the data you entered."
  }
}
```

- [ ] **Step 4: Configura next-intl senza routing per lingua**

La lingua non sta nell'URL: si legge da un cookie `locale` che viene impostato al login e quando l'utente cambia lingua (Task 18).

`src/i18n/locales.ts` (nessun import da Next: lo usano anche i componenti client):
```ts
export const LOCALES = ["it", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "locale";
export const toLocale = (value: string | undefined | null): Locale => (value === "en" ? "en" : "it");
```

`src/i18n/request.ts` (solo server):
```ts
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, toLocale } from "./locales";

export default getRequestConfig(async () => {
  const locale = toLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return {
    locale,
    timeZone: "Europe/Rome",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return { title: t("name"), description: t("tagline") };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Esegui i test**

Run: `npm test`
Expected: PASS (smoke + 2 test i18n).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(i18n): next-intl with cookie-based locale and IT/EN key parity test"
```

---

### Task 3: Modello dati Prisma, seed e database di test

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `src/server/db.ts`, `tests/helpers/db.ts`, `src/server/db.test.ts`
- Modify: `tests/global-setup.ts`

**Interfaces:**
- Produces: `prisma`, `type Db`, `type Tx` da `@/server/db`; modelli `User`, `Membership`, `MembershipRenewal`, `Field`, `Settings`, `Booking`, `FieldOccupancy`, `Strike`, `Notification`; helper di test `resetDb()`, `makeField(data?)`, `makeMember(opts?)`, `makeAdmin()`, `makeSettings()` da `tests/helpers/db.ts`.
- Costanti di stato (stringhe, perché SQLite non ha enum nativi):
  `Booking.status`: `"CONFIRMED" | "CANCELLED"`; `Booking.paymentStatus`: `"PENDING" | "PAID" | "UNPAID" | "EXEMPT"`.

- [ ] **Step 1: Schema**

`prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // in produzione: "postgresql" (vedi README)
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  firstName    String
  lastName     String
  birthDate    String?  // YYYY-MM-DD
  email        String   @unique // sempre normalizzata (trim + minuscolo)
  phone        String?
  locale       String   @default("it")
  passwordHash String?  // null = account da attivare
  isAdmin      Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  membership        Membership?
  bookings          Booking[]      @relation("MemberBookings")
  cancelledBookings Booking[]      @relation("CancelledBy")
  strikes           Strike[]
  notifications     Notification[]
}

model Membership {
  id         String              @id @default(cuid())
  userId     String              @unique
  user       User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  number     String              @unique // resta uguale ai rinnovi
  issueDate  String              // YYYY-MM-DD
  expiryDate String              // YYYY-MM-DD, ultimo giorno valido
  renewals   MembershipRenewal[]
}

model MembershipRenewal {
  id           String     @id @default(cuid())
  membershipId String
  membership   Membership @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  issueDate    String
  expiryDate   String
  createdAt    DateTime   @default(now())
}

model Field {
  id          String           @id @default(cuid())
  name        String
  sport       String           // FOOTBALL | TENNIS | BASKETBALL | BOCCE
  slotMinutes Int
  priceCents  Int
  active      Boolean          @default(true)
  sortOrder   Int              @default(0)
  bookings    Booking[]
  occupancy   FieldOccupancy[]
}

model Settings {
  id                    Int @id @default(1)
  openMinutes           Int @default(480)
  closeMinutes          Int @default(1380)
  startStepMinutes      Int @default(15)
  maxAdvanceDays        Int @default(14)
  maxActiveBookings     Int @default(3)
  changeWindowMinutes   Int @default(120)
  maxSlotsPerBooking    Int @default(2)
  membershipWarningDays Int @default(15)
  reminderHours         Int @default(24)
}

model Booking {
  id            String    @id @default(cuid())
  memberId      String
  member        User      @relation("MemberBookings", fields: [memberId], references: [id], onDelete: Cascade)
  fieldId       String
  field         Field     @relation(fields: [fieldId], references: [id])
  start         DateTime
  end           DateTime
  slots         Int
  priceCents    Int
  status        String    @default("CONFIRMED")
  // true = va pagata. Diventa false quando viene cancellata in tempo (o per blocco).
  chargeable    Boolean   @default(true)
  cancelReason  String?
  cancelledById String?   // null con status CANCELLED = cancellazione automatica di sistema
  cancelledBy   User?     @relation("CancelledBy", fields: [cancelledById], references: [id])
  cancelledAt   DateTime?
  paymentStatus String    @default("PENDING")
  noShow        Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  occupancy FieldOccupancy[]
  strike    Strike?

  @@index([memberId, start])
  @@index([fieldId, start])
  @@index([paymentStatus, end])
}

/// Una riga per ogni quarto d'ora occupato. La chiave primaria rende impossibili le sovrapposizioni.
model FieldOccupancy {
  fieldId      String
  field        Field    @relation(fields: [fieldId], references: [id])
  quarterStart DateTime
  bookingId    String
  booking      Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@id([fieldId, quarterStart])
  @@index([bookingId])
}

model Strike {
  id        String   @id @default(cuid())
  memberId  String
  member    User     @relation(fields: [memberId], references: [id], onDelete: Cascade)
  bookingId String   @unique
  booking   Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([memberId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String
  params    String   @default("{}") // JSON, tradotto al momento della visualizzazione
  dedupeKey String?  // per le notifiche temporali: al massimo una per evento
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@unique([userId, dedupeKey])
  @@index([userId, read])
}
```

- [ ] **Step 2: Client Prisma condiviso**

`src/server/db.ts`:
```ts
import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Db = PrismaClient;
export type Tx = Prisma.TransactionClient;
```

- [ ] **Step 3: Database di test ricreato a ogni esecuzione**

`tests/global-setup.ts`:
```ts
import { execSync } from "node:child_process";
import { TEST_DATABASE_URL } from "./test-db-url";

export default function setup() {
  execSync("npx prisma db push --force-reset --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
```

`tests/helpers/db.ts`:
```ts
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";

let counter = 0;
const next = () => ++counter;

export async function resetDb() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.strike.deleteMany(),
    prisma.fieldOccupancy.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.membershipRenewal.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.user.deleteMany(),
    prisma.field.deleteMany(),
    prisma.settings.deleteMany(),
  ]);
}

export function makeSettings(data: Partial<{ maxActiveBookings: number; reminderHours: number; membershipWarningDays: number }> = {}) {
  return prisma.settings.create({ data: { id: 1, ...data } });
}

export function makeField(data: Partial<{ name: string; sport: string; slotMinutes: number; priceCents: number; active: boolean }> = {}) {
  return prisma.field.create({
    data: { name: `Tennis ${next()}`, sport: "TENNIS", slotMinutes: 60, priceCents: 1800, ...data },
  });
}

export async function makeMember(opts: { expiryDate?: string | null; email?: string; number?: string; password?: string | null; isAdmin?: boolean } = {}) {
  const n = next();
  const password = opts.password === undefined ? "password123" : opts.password;
  return prisma.user.create({
    data: {
      firstName: "Mario",
      lastName: `Rossi${n}`,
      email: opts.email ?? `socio${n}@example.it`,
      passwordHash: password ? await bcrypt.hash(password, 4) : null,
      isAdmin: opts.isAdmin ?? false,
      membership:
        opts.expiryDate === null
          ? undefined
          : { create: { number: opts.number ?? `T${1000 + n}`, issueDate: "2026-06-30", expiryDate: opts.expiryDate ?? "2027-06-30" } },
    },
    include: { membership: true },
  });
}

export function makeAdmin() {
  return makeMember({ expiryDate: null, isAdmin: true });
}
```

- [ ] **Step 4: Scrivi il test sul vincolo di occupazione**

`src/server/db.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { makeField, makeMember, resetDb } from "../../tests/helpers/db";

describe("FieldOccupancy primary key", () => {
  beforeEach(resetDb);

  it("rejects two rows for the same field and quarter", async () => {
    const field = await makeField();
    const member = await makeMember();
    const start = new Date("2026-11-02T09:00:00Z");
    const mk = () =>
      prisma.booking.create({
        data: { memberId: member.id, fieldId: field.id, start, end: new Date("2026-11-02T10:00:00Z"), slots: 1, priceCents: 1800 },
      });
    const a = await mk();
    const b = await mk();
    await prisma.fieldOccupancy.create({ data: { fieldId: field.id, quarterStart: start, bookingId: a.id } });
    await expect(
      prisma.fieldOccupancy.create({ data: { fieldId: field.id, quarterStart: start, bookingId: b.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
```

- [ ] **Step 5: Genera il client ed esegui il test**

Run: `npx prisma generate` e poi `npm test -- src/server/db.test.ts`
Expected: PASS. Se fallisce con "Cannot find module '@prisma/client'", ripeti `npx prisma generate`.

- [ ] **Step 6: Seed**

`prisma/seed.ts`:
```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@pallegirate.local").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("ADMIN_PASSWORD mancante nel file .env");

  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  if ((await prisma.field.count()) === 0) {
    await prisma.field.createMany({
      data: [
        { name: "Calcio", sport: "FOOTBALL", slotMinutes: 90, priceCents: 6000, sortOrder: 1 },
        { name: "Tennis 1", sport: "TENNIS", slotMinutes: 60, priceCents: 1800, sortOrder: 2 },
        { name: "Tennis 2", sport: "TENNIS", slotMinutes: 60, priceCents: 1800, sortOrder: 3 },
        { name: "Basket", sport: "BASKETBALL", slotMinutes: 60, priceCents: 2500, sortOrder: 4 },
        { name: "Bocce", sport: "BOCCE", slotMinutes: 60, priceCents: 1000, sortOrder: 5 },
      ],
    });
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { firstName: "Admin", lastName: "Centro", email: adminEmail, isAdmin: true, passwordHash: await bcrypt.hash(adminPassword, 10) },
  });

  // Soci di esempio. Password demo per quelli già attivati: "socio1234".
  const demoHash = await bcrypt.hash("socio1234", 10);
  const members = [
    { firstName: "Giulia", lastName: "Bianchi", email: "giulia@example.it", number: "PG-0001", expiry: isoDay(300), active: true },
    { firstName: "Luca", lastName: "Verdi", email: "luca@example.it", number: "PG-0002", expiry: isoDay(10), active: true },
    { firstName: "Sara", lastName: "Neri", email: "sara@example.it", number: "PG-0003", expiry: isoDay(-5), active: true },
    { firstName: "Paolo", lastName: "Gallo", email: "paolo@example.it", number: "PG-0004", expiry: isoDay(200), active: false },
  ];
  for (const m of members) {
    await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        passwordHash: m.active ? demoHash : null,
        membership: { create: { number: m.number, issueDate: isoDay(-60), expiryDate: m.expiry } },
      },
    });
  }
  console.log("Seed completato.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Run: `npm run db:setup`
Expected: "Seed completato." Rilanciandolo una seconda volta non si creano duplicati.

Aggiungi al README, sotto "Avvio in locale":
```markdown
Utenti del seed: admin con le credenziali di `.env`; soci `giulia@example.it`, `luca@example.it` (tessera in scadenza), `sara@example.it` (tessera scaduta) con password `socio1234`; `paolo@example.it` da attivare con tessera `PG-0004`.
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(db): Prisma schema with occupancy table, seed and test database"
```

---
### Task 4: Helper del fuso orario Europe/Rome

**Files:**
- Create: `src/lib/time/rome.ts`, `src/lib/time/rome.test.ts`

**Interfaces:**
- Produces (tutte pure):
  - `TIME_ZONE = "Europe/Rome"`
  - `romeDay(instant: Date): string`: giorno di calendario a Roma, `YYYY-MM-DD`
  - `romeMinutesOfDay(instant: Date): number`: minuti dalla mezzanotte di Roma (0–1439)
  - `romeInstant(day: string, minutesOfDay: number): Date`: istante UTC dell'ora locale indicata
  - `addDays(day: string, n: number): string`
  - `diffDays(from: string, to: string): number`: giorni di calendario da `from` a `to`
  - `minutesToHHMM(min: number): string`: `"08:00"`

- [ ] **Step 1: Scrivi i test (inclusi i cambi d'ora)**

`src/lib/time/rome.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { addDays, diffDays, minutesToHHMM, romeDay, romeInstant, romeMinutesOfDay } from "./rome";

describe("romeDay", () => {
  it("uses Rome's calendar day, not UTC", () => {
    // 22:30 UTC del 24/10 = 00:30 del 25/10 a Roma (CEST, +2)
    expect(romeDay(new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-25");
    expect(romeDay(new Date("2026-10-24T21:59:00Z"))).toBe("2026-10-24");
  });
});

describe("romeInstant", () => {
  it("handles summer time (+2)", () => {
    expect(romeInstant("2026-10-24", 480).toISOString()).toBe("2026-10-24T06:00:00.000Z");
  });
  it("handles the day summer time ends (25/10/2026, +1 from 03:00)", () => {
    expect(romeInstant("2026-10-25", 480).toISOString()).toBe("2026-10-25T07:00:00.000Z");
  });
  it("handles the day summer time starts (28/03/2027)", () => {
    expect(romeInstant("2027-03-27", 480).toISOString()).toBe("2027-03-27T07:00:00.000Z");
    expect(romeInstant("2027-03-28", 480).toISOString()).toBe("2027-03-28T06:00:00.000Z");
  });
  it("round-trips with romeMinutesOfDay", () => {
    const t = romeInstant("2026-10-25", 22 * 60 + 45);
    expect(romeDay(t)).toBe("2026-10-25");
    expect(romeMinutesOfDay(t)).toBe(1365);
  });
});

describe("romeMinutesOfDay", () => {
  it("returns 0 at Rome midnight", () => {
    expect(romeMinutesOfDay(new Date("2026-11-01T23:00:00Z"))).toBe(0);
  });
});

describe("day arithmetic", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-10-20", 14)).toBe("2026-11-03");
  });
  it("counts calendar days regardless of DST", () => {
    expect(diffDays("2026-10-20", "2026-11-03")).toBe(14);
    expect(diffDays("2026-11-03", "2026-10-20")).toBe(-14);
  });
  it("formats minutes as HH:MM", () => {
    expect(minutesToHHMM(480)).toBe("08:00");
    expect(minutesToHHMM(1380)).toBe("23:00");
    expect(minutesToHHMM(615)).toBe("10:15");
  });
});
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `npm test -- src/lib/time`
Expected: FAIL, "Failed to resolve import ./rome".

- [ ] **Step 3: Implementa**

`src/lib/time/rome.ts`:
```ts
import { TZDate } from "@date-fns/tz";

export const TIME_ZONE = "Europe/Rome";

// en-CA formatta come YYYY-MM-DD; en-GB con h23 come HH:MM.
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function romeDay(instant: Date): string {
  return dayFormatter.format(instant);
}

export function romeMinutesOfDay(instant: Date): number {
  const [h, m] = timeFormatter.format(instant).split(":").map(Number);
  return h * 60 + m;
}

export function romeInstant(day: string, minutesOfDay: number): Date {
  const [y, mo, d] = day.split("-").map(Number);
  const local = new TZDate(y, mo - 1, d, Math.floor(minutesOfDay / 60), minutesOfDay % 60, TIME_ZONE);
  return new Date(local.getTime());
}

function dayToUtcMs(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(day: string, n: number): string {
  return new Date(dayToUtcMs(day) + n * 86_400_000).toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round((dayToUtcMs(to) - dayToUtcMs(from)) / 86_400_000);
}

export function minutesToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
```

- [ ] **Step 4: Esegui i test**

Run: `npm test -- src/lib/time`
Expected: PASS (9 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/time
git commit -m "feat(time): Europe/Rome day and minute helpers with DST tests"
```

---

### Task 5: Regole di prenotazione pure (orari, socio, strike)

**Files:**
- Create: `src/lib/booking-rules/types.ts`, `schedule.ts`, `member.ts`, `strikes.ts`, `index.ts`, `schedule.test.ts`, `member.test.ts`, `strikes.test.ts`

**Interfaces:**
- Consumes: `romeDay`, `romeMinutesOfDay`, `addDays`, `minutesToHHMM` (Task 4).
- Produces (da `@/lib/booking-rules`):
  ```ts
  type RuleSettings = { openMinutes: number; closeMinutes: number; startStepMinutes: number; maxAdvanceDays: number;
    maxActiveBookings: number; changeWindowMinutes: number; maxSlotsPerBooking: number };
  type RuleField = { slotMinutes: number; active: boolean };
  type SlotRequest = { start: Date; slots: number };
  type MemberState = { membershipExpiry: string | null; otherActiveBookings: number; blocked: boolean };
  type ViolationCode = "START_NOT_ON_STEP" | "BEFORE_OPENING" | "AFTER_CLOSING" | "INVALID_SLOTS" | "FIELD_INACTIVE"
    | "IN_PAST" | "TOO_FAR_AHEAD" | "MEMBERSHIP_MISSING" | "MEMBERSHIP_EXPIRED" | "TOO_MANY_ACTIVE" | "BLOCKED"
    | "SLOT_TAKEN" | "CHANGE_WINDOW_CLOSED" | "ALREADY_CANCELLED" | "NOT_FOUND" | "FORBIDDEN" | "INVALID_INPUT";
  type Violation = { code: ViolationCode; params?: Record<string, string | number> };
  bookingEnd(start: Date, slots: number, field: RuleField): Date
  checkSchedule(req: SlotRequest, field: RuleField, s: RuleSettings): Violation[]       // vale anche per l'admin
  checkMemberRules(req: SlotRequest, s: RuleSettings, m: MemberState, now: Date): Violation[]
  canMemberChange(start: Date, now: Date, s: RuleSettings): boolean                   // now ≤ start − finestra
  isLateCancellation(start: Date, now: Date, s: RuleSettings): boolean               // = !canMemberChange
  bookingPrice(priceCentsPerSlot: number, slots: number): number
  quarterStarts(start: Date, end: Date): Date[]
  isBlocked(strikeCount: number, unpaidCount: number): boolean
  strikeConsequence(strikeCountAfter: number): "WARNING" | "BLOCK"
  ```
- `otherActiveBookings` conta le prenotazioni `CONFIRMED` future del socio **esclusa** quella che si sta modificando: lo calcola chi chiama (Task 6).

- [ ] **Step 1: Tipi**

`src/lib/booking-rules/types.ts`:
```ts
export type RuleSettings = {
  openMinutes: number;
  closeMinutes: number;
  startStepMinutes: number;
  maxAdvanceDays: number;
  maxActiveBookings: number;
  changeWindowMinutes: number;
  maxSlotsPerBooking: number;
};

export type RuleField = { slotMinutes: number; active: boolean };

export type SlotRequest = { start: Date; slots: number };

export type MemberState = {
  /** Ultimo giorno valido della tessera (YYYY-MM-DD), null se il socio non ha tessera. */
  membershipExpiry: string | null;
  /** Prenotazioni CONFIRMED future, esclusa quella in modifica. */
  otherActiveBookings: number;
  blocked: boolean;
};

export type ViolationCode =
  | "START_NOT_ON_STEP"
  | "BEFORE_OPENING"
  | "AFTER_CLOSING"
  | "INVALID_SLOTS"
  | "FIELD_INACTIVE"
  | "IN_PAST"
  | "TOO_FAR_AHEAD"
  | "MEMBERSHIP_MISSING"
  | "MEMBERSHIP_EXPIRED"
  | "TOO_MANY_ACTIVE"
  | "BLOCKED"
  | "SLOT_TAKEN"
  | "CHANGE_WINDOW_CLOSED"
  | "ALREADY_CANCELLED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_INPUT";

export type Violation = { code: ViolationCode; params?: Record<string, string | number> };
```

- [ ] **Step 2: Scrivi i test delle regole di orario**

`src/lib/booking-rules/schedule.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { bookingEnd, bookingPrice, checkSchedule, quarterStarts } from "./schedule";
import type { RuleSettings } from "./types";

const S: RuleSettings = { openMinutes: 480, closeMinutes: 1380, startStepMinutes: 15, maxAdvanceDays: 14, maxActiveBookings: 3, changeWindowMinutes: 120, maxSlotsPerBooking: 2 };
const tennis = { slotMinutes: 60, active: true };
const football = { slotMinutes: 90, active: true };
const at = (hhmm: string, day = "2026-11-10") => {
  const [h, m] = hhmm.split(":").map(Number);
  return romeInstant(day, h * 60 + m);
};
const codes = (v: { code: string }[]) => v.map((x) => x.code);

describe("checkSchedule", () => {
  it("accepts starts on 15-minute boundaries", () => {
    for (const t of ["08:00", "08:15", "08:30", "08:45", "21:45"]) {
      expect(checkSchedule({ start: at(t), slots: 1 }, tennis, S), t).toEqual([]);
    }
  });
  it("rejects starts off the 15-minute grid", () => {
    expect(codes(checkSchedule({ start: at("08:10"), slots: 1 }, tennis, S))).toContain("START_NOT_ON_STEP");
    const withSeconds = new Date(at("08:15").getTime() + 30_000);
    expect(codes(checkSchedule({ start: withSeconds, slots: 1 }, tennis, S))).toContain("START_NOT_ON_STEP");
  });
  it("rejects starts before opening", () => {
    expect(codes(checkSchedule({ start: at("07:45"), slots: 1 }, tennis, S))).toEqual(["BEFORE_OPENING"]);
  });
  it("allows ending exactly at 23:00 and rejects ending after", () => {
    expect(checkSchedule({ start: at("22:00"), slots: 1 }, tennis, S)).toEqual([]);
    expect(codes(checkSchedule({ start: at("22:15"), slots: 1 }, tennis, S))).toEqual(["AFTER_CLOSING"]);
    expect(checkSchedule({ start: at("20:00"), slots: 2 }, football, S)).toEqual([]); // 20:00–23:00
    expect(codes(checkSchedule({ start: at("20:15"), slots: 2 }, football, S))).toEqual(["AFTER_CLOSING"]);
  });
  it("accepts 1 or 2 slots only", () => {
    expect(codes(checkSchedule({ start: at("10:00"), slots: 0 }, tennis, S))).toContain("INVALID_SLOTS");
    expect(codes(checkSchedule({ start: at("10:00"), slots: 3 }, tennis, S))).toContain("INVALID_SLOTS");
    expect(codes(checkSchedule({ start: at("10:00"), slots: 1.5 }, tennis, S))).toContain("INVALID_SLOTS");
    expect(checkSchedule({ start: at("10:00"), slots: 2 }, tennis, S)).toEqual([]);
  });
  it("rejects inactive fields", () => {
    expect(codes(checkSchedule({ start: at("10:00"), slots: 1 }, { ...tennis, active: false }, S))).toEqual(["FIELD_INACTIVE"]);
  });
  it("works on the DST change day", () => {
    expect(checkSchedule({ start: at("08:00", "2026-10-25"), slots: 1 }, tennis, S)).toEqual([]);
    expect(codes(checkSchedule({ start: at("07:00", "2026-10-25"), slots: 1 }, tennis, S))).toEqual(["BEFORE_OPENING"]);
  });
});

describe("bookingEnd, price and quarters", () => {
  it("computes end from slots", () => {
    expect(bookingEnd(at("10:00"), 2, football).getTime() - at("10:00").getTime()).toBe(180 * 60_000);
  });
  it("multiplies the slot price", () => {
    expect(bookingPrice(1800, 2)).toBe(3600);
  });
  it("lists every quarter hour of the interval", () => {
    const q = quarterStarts(at("10:00"), at("11:30"));
    expect(q).toHaveLength(6);
    expect(q[0].getTime()).toBe(at("10:00").getTime());
    expect(q[5].getTime()).toBe(at("11:15").getTime());
  });
});
```

- [ ] **Step 3: Esegui e verifica che fallisca**

Run: `npm test -- src/lib/booking-rules/schedule`
Expected: FAIL, "Failed to resolve import ./schedule".

- [ ] **Step 4: Implementa `schedule.ts`**

`src/lib/booking-rules/schedule.ts`:
```ts
import { minutesToHHMM, romeMinutesOfDay } from "@/lib/time/rome";
import type { RuleField, RuleSettings, SlotRequest, Violation } from "./types";

const QUARTER_MS = 15 * 60_000;

export function bookingEnd(start: Date, slots: number, field: RuleField): Date {
  return new Date(start.getTime() + slots * field.slotMinutes * 60_000);
}

export function bookingPrice(priceCentsPerSlot: number, slots: number): number {
  return priceCentsPerSlot * slots;
}

export function quarterStarts(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += QUARTER_MS) out.push(new Date(t));
  return out;
}

/**
 * Regole che valgono per tutti, admin compreso: campo attivo, numero di slot,
 * passo degli orari, apertura e chiusura.
 */
export function checkSchedule(req: SlotRequest, field: RuleField, s: RuleSettings): Violation[] {
  const v: Violation[] = [];
  if (!field.active) v.push({ code: "FIELD_INACTIVE" });

  const slotsOk = Number.isInteger(req.slots) && req.slots >= 1 && req.slots <= s.maxSlotsPerBooking;
  if (!slotsOk) v.push({ code: "INVALID_SLOTS", params: { max: s.maxSlotsPerBooking } });

  const startMin = romeMinutesOfDay(req.start);
  const onGrid = req.start.getUTCSeconds() === 0 && req.start.getUTCMilliseconds() === 0 && startMin % s.startStepMinutes === 0;
  if (!onGrid) v.push({ code: "START_NOT_ON_STEP", params: { step: s.startStepMinutes } });

  if (startMin < s.openMinutes) {
    v.push({ code: "BEFORE_OPENING", params: { time: minutesToHHMM(s.openMinutes) } });
  } else if (slotsOk) {
    // Il cambio d'ora avviene tra le 02:00 e le 03:00, fuori dall'orario di apertura,
    // quindi l'ora di fine "a orologio" è inizio + durata.
    const endMin = startMin + req.slots * field.slotMinutes;
    if (endMin > s.closeMinutes) v.push({ code: "AFTER_CLOSING", params: { time: minutesToHHMM(s.closeMinutes) } });
  }
  return v;
}
```

- [ ] **Step 5: Esegui i test**

Run: `npm test -- src/lib/booking-rules/schedule`
Expected: PASS.

- [ ] **Step 6: Scrivi i test delle regole del socio**

`src/lib/booking-rules/member.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { canMemberChange, checkMemberRules, isLateCancellation } from "./member";
import type { MemberState, RuleSettings } from "./types";

const S: RuleSettings = { openMinutes: 480, closeMinutes: 1380, startStepMinutes: 15, maxAdvanceDays: 14, maxActiveBookings: 3, changeWindowMinutes: 120, maxSlotsPerBooking: 2 };
const OK: MemberState = { membershipExpiry: "2027-06-30", otherActiveBookings: 0, blocked: false };
const now = romeInstant("2026-11-02", 10 * 60); // lunedì 02/11/2026 10:00 Roma
const codes = (v: { code: string }[]) => v.map((x) => x.code);

describe("checkMemberRules", () => {
  it("accepts a normal booking", () => {
    expect(checkMemberRules({ start: romeInstant("2026-11-05", 600), slots: 1 }, S, OK, now)).toEqual([]);
  });
  it("rejects starts in the past or right now", () => {
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-02", 600), slots: 1 }, S, OK, now))).toEqual(["IN_PAST"]);
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-02", 585), slots: 1 }, S, OK, now))).toEqual(["IN_PAST"]);
  });
  it("allows up to today + 14 calendar days, any time of that day", () => {
    expect(checkMemberRules({ start: romeInstant("2026-11-16", 22 * 60), slots: 1 }, S, OK, now)).toEqual([]);
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-17", 480), slots: 1 }, S, OK, now))).toEqual(["TOO_FAR_AHEAD"]);
  });
  it("uses Rome's day for 'today' just after midnight", () => {
    const justAfterMidnight = romeInstant("2026-11-03", 5); // 00:05 del 03/11 = 23:05 UTC del 02/11
    expect(checkMemberRules({ start: romeInstant("2026-11-17", 480), slots: 1 }, S, OK, justAfterMidnight)).toEqual([]);
  });
  it("counts advance days across the DST change", () => {
    const beforeDst = romeInstant("2026-10-20", 600);
    expect(checkMemberRules({ start: romeInstant("2026-11-03", 22 * 60), slots: 1 }, S, OK, beforeDst)).toEqual([]);
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-04", 480), slots: 1 }, S, OK, beforeDst))).toEqual(["TOO_FAR_AHEAD"]);
  });
  it("allows booking on the expiry day and rejects the day after", () => {
    const m = { ...OK, membershipExpiry: "2026-11-05" };
    expect(checkMemberRules({ start: romeInstant("2026-11-05", 1320), slots: 1 }, S, m, now)).toEqual([]);
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-06", 480), slots: 1 }, S, m, now))).toEqual(["MEMBERSHIP_EXPIRED"]);
  });
  it("requires a membership", () => {
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-05", 600), slots: 1 }, S, { ...OK, membershipExpiry: null }, now))).toEqual(["MEMBERSHIP_MISSING"]);
  });
  it("limits active bookings to 3", () => {
    expect(checkMemberRules({ start: romeInstant("2026-11-05", 600), slots: 1 }, S, { ...OK, otherActiveBookings: 2 }, now)).toEqual([]);
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-05", 600), slots: 1 }, S, { ...OK, otherActiveBookings: 3 }, now))).toEqual(["TOO_MANY_ACTIVE"]);
  });
  it("rejects blocked members", () => {
    expect(codes(checkMemberRules({ start: romeInstant("2026-11-05", 600), slots: 1 }, S, { ...OK, blocked: true }, now))).toEqual(["BLOCKED"]);
  });
});

describe("change window", () => {
  const start = romeInstant("2026-11-02", 12 * 60);
  it("allows changes up to exactly 2 hours before", () => {
    expect(canMemberChange(start, romeInstant("2026-11-02", 10 * 60), S)).toBe(true);
    expect(canMemberChange(start, new Date(romeInstant("2026-11-02", 10 * 60).getTime() + 1000), S)).toBe(false);
  });
  it("marks admin cancellations under 2 hours as late", () => {
    expect(isLateCancellation(start, romeInstant("2026-11-02", 9 * 60), S)).toBe(false);
    expect(isLateCancellation(start, romeInstant("2026-11-02", 11 * 60), S)).toBe(true);
    expect(isLateCancellation(start, romeInstant("2026-11-02", 13 * 60), S)).toBe(true);
  });
});
```

- [ ] **Step 7: Implementa `member.ts`**

`src/lib/booking-rules/member.ts`:
```ts
import { addDays, romeDay } from "@/lib/time/rome";
import type { MemberState, RuleSettings, SlotRequest, Violation } from "./types";

/** Regole che valgono solo per le prenotazioni fatte come socio. */
export function checkMemberRules(req: SlotRequest, s: RuleSettings, m: MemberState, now: Date): Violation[] {
  const v: Violation[] = [];
  if (m.blocked) v.push({ code: "BLOCKED" });
  if (req.start.getTime() <= now.getTime()) v.push({ code: "IN_PAST" });

  const day = romeDay(req.start);
  const lastDay = addDays(romeDay(now), s.maxAdvanceDays);
  if (day > lastDay) v.push({ code: "TOO_FAR_AHEAD", params: { days: s.maxAdvanceDays, lastDay } });

  if (m.membershipExpiry === null) v.push({ code: "MEMBERSHIP_MISSING" });
  else if (day > m.membershipExpiry) v.push({ code: "MEMBERSHIP_EXPIRED", params: { expiry: m.membershipExpiry } });

  if (m.otherActiveBookings >= s.maxActiveBookings) v.push({ code: "TOO_MANY_ACTIVE", params: { max: s.maxActiveBookings } });
  return v;
}

export function canMemberChange(start: Date, now: Date, s: RuleSettings): boolean {
  return now.getTime() <= start.getTime() - s.changeWindowMinutes * 60_000;
}

export function isLateCancellation(start: Date, now: Date, s: RuleSettings): boolean {
  return !canMemberChange(start, now, s);
}
```

- [ ] **Step 8: Test e implementazione degli strike puri**

`src/lib/booking-rules/strikes.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { isBlocked, strikeConsequence } from "./strikes";

describe("strikes", () => {
  it("blocks only with 2+ strikes and something still unpaid", () => {
    expect(isBlocked(1, 1)).toBe(false);
    expect(isBlocked(2, 1)).toBe(true);
    expect(isBlocked(2, 0)).toBe(false);
    expect(isBlocked(5, 1)).toBe(true);
  });
  it("warns on the first strike and blocks from the second", () => {
    expect(strikeConsequence(1)).toBe("WARNING");
    expect(strikeConsequence(2)).toBe("BLOCK");
    expect(strikeConsequence(3)).toBe("BLOCK");
  });
});
```

`src/lib/booking-rules/strikes.ts`:
```ts
/** Stato derivato: gli strike non si azzerano mai, lo sblocco avviene saldando tutti gli insoluti. */
export function isBlocked(strikeCount: number, unpaidCount: number): boolean {
  return strikeCount >= 2 && unpaidCount > 0;
}

export function strikeConsequence(strikeCountAfter: number): "WARNING" | "BLOCK" {
  return strikeCountAfter <= 1 ? "WARNING" : "BLOCK";
}
```

`src/lib/booking-rules/index.ts`:
```ts
export * from "./types";
export * from "./schedule";
export * from "./member";
export * from "./strikes";
```

- [ ] **Step 9: Esegui tutti i test delle regole**

Run: `npm test -- src/lib/booking-rules`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/booking-rules
git commit -m "feat(rules): pure booking rules for schedule, member limits, change window and strikes"
```

---

### Task 6: Servizio prenotazioni con tabella di occupazione

**Files:**
- Create: `src/server/errors.ts`, `src/server/settings.ts`, `src/server/member-state.ts`, `src/server/notifications.ts`, `src/server/bookings.ts`, `src/server/bookings.test.ts`

**Interfaces:**
- Consumes: regole di Task 5, `prisma`/`Db`/`Tx` di Task 3, helper di test di Task 3.
- Produces:
  ```ts
  // errors.ts
  class DomainError extends Error { readonly violations: Violation[] }
  // settings.ts
  getSettings(db: Db | Tx): Promise<Settings>                 // riga singola id=1, creata se manca
  // member-state.ts
  getMemberState(db: Db | Tx, memberId: string, now: Date, excludeBookingId?: string): Promise<MemberState>
  // notifications.ts
  type NotificationType = "BOOKING_CREATED" | "BOOKING_UPDATED" | "BOOKING_CANCELLED" | "BOOKING_CANCELLED_BLOCK"
    | "STRIKE_WARNING" | "ACCOUNT_BLOCKED" | "ACCOUNT_UNBLOCKED" | "BOOKING_REMINDER" | "MEMBERSHIP_EXPIRING" | "MEMBERSHIP_EXPIRED";
  type NotificationParams = Record<string, string | number>;
  notify(db: Db | Tx, userId: string, type: NotificationType, params?: NotificationParams, dedupeKey?: string): Promise<void>
  // bookings.ts
  type Actor = { userId: string; mode: "member" | "admin" };
  type BookingInput = { fieldId: string; start: Date; slots: number };
  createBooking(db: Db, actor: Actor, memberId: string, input: BookingInput, now?: Date): Promise<Booking>
  updateBooking(db: Db, actor: Actor, bookingId: string, input: BookingInput, now?: Date): Promise<Booking>
  cancelBooking(db: Db, actor: Actor, bookingId: string, reason?: string, now?: Date): Promise<Booking>
  releaseOccupancy(tx: Tx, bookingId: string): Promise<void>   // usata anche da Task 12 e Task 15
  ```
- Parametri delle notifiche di prenotazione: `{ field: string; start: string /* ISO */; by: "self" | "admin"; reason?: string; chargeable?: 0 | 1 }`.

- [ ] **Step 1: Errori di dominio, impostazioni, stato del socio, notify**

`src/server/errors.ts`:
```ts
import type { Violation } from "@/lib/booking-rules";

export class DomainError extends Error {
  constructor(readonly violations: Violation[]) {
    super(violations.map((v) => v.code).join(","));
    this.name = "DomainError";
  }
}

export const fail = (code: Violation["code"], params?: Violation["params"]): never => {
  throw new DomainError([{ code, params }]);
};
```

`src/server/settings.ts`:
```ts
import type { Db, Tx } from "./db";

export function getSettings(db: Db | Tx) {
  return db.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
```

`src/server/member-state.ts`:
```ts
import { isBlocked, type MemberState } from "@/lib/booking-rules";
import type { Db, Tx } from "./db";

export async function getMemberState(db: Db | Tx, memberId: string, now: Date, excludeBookingId?: string): Promise<MemberState> {
  const [membership, otherActiveBookings, strikeCount, unpaidCount] = await Promise.all([
    db.membership.findUnique({ where: { userId: memberId } }),
    db.booking.count({
      where: { memberId, status: "CONFIRMED", start: { gt: now }, ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}) },
    }),
    db.strike.count({ where: { memberId } }),
    db.booking.count({ where: { memberId, paymentStatus: "UNPAID" } }),
  ]);
  return { membershipExpiry: membership?.expiryDate ?? null, otherActiveBookings, blocked: isBlocked(strikeCount, unpaidCount) };
}
```

`src/server/notifications.ts`:
```ts
import type { Db, Tx } from "./db";

export type NotificationType =
  | "BOOKING_CREATED"
  | "BOOKING_UPDATED"
  | "BOOKING_CANCELLED"
  | "BOOKING_CANCELLED_BLOCK"
  | "STRIKE_WARNING"
  | "ACCOUNT_BLOCKED"
  | "ACCOUNT_UNBLOCKED"
  | "BOOKING_REMINDER"
  | "MEMBERSHIP_EXPIRING"
  | "MEMBERSHIP_EXPIRED";

export type NotificationParams = Record<string, string | number>;

/** Il testo non si salva: si salvano tipo e parametri, tradotti quando l'utente li legge. */
export async function notify(db: Db | Tx, userId: string, type: NotificationType, params: NotificationParams = {}, dedupeKey?: string) {
  const data = { userId, type, params: JSON.stringify(params), dedupeKey };
  if (dedupeKey) {
    await db.notification.upsert({ where: { userId_dedupeKey: { userId, dedupeKey } }, update: {}, create: data });
  } else {
    await db.notification.create({ data });
  }
}
```

- [ ] **Step 2: Scrivi i test di integrazione**

`src/server/bookings.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import type { ViolationCode } from "@/lib/booking-rules";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { DomainError } from "./errors";
import { cancelBooking, createBooking, updateBooking, type Actor } from "./bookings";
import { makeAdmin, makeField, makeMember, makeSettings, resetDb } from "../../tests/helpers/db";

const NOW = romeInstant("2026-11-02", 10 * 60); // lunedì 10:00 Roma
const at = (day: string, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return romeInstant(day, h * 60 + m);
};
const asMember = (id: string): Actor => ({ userId: id, mode: "member" });
const asAdmin = (id: string): Actor => ({ userId: id, mode: "admin" });

async function expectCode(p: Promise<unknown>, code: ViolationCode) {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(DomainError);
  expect((err as DomainError).violations.map((v) => v.code)).toContain(code);
}

describe("booking service", () => {
  beforeEach(async () => {
    await resetDb();
    await makeSettings();
  });

  it("creates a booking with price and one occupancy row per quarter", async () => {
    const field = await makeField({ priceCents: 1800 });
    const m = await makeMember();
    const b = await createBooking(prisma, asMember(m.id), m.id, { fieldId: field.id, start: at("2026-11-05", "10:00"), slots: 2 }, NOW);
    expect(b.status).toBe("CONFIRMED");
    expect(b.priceCents).toBe(3600);
    expect(b.end.getTime()).toBe(at("2026-11-05", "12:00").getTime());
    expect(await prisma.fieldOccupancy.count({ where: { bookingId: b.id } })).toBe(8);
    expect(await prisma.notification.count({ where: { userId: m.id, type: "BOOKING_CREATED" } })).toBe(1);
  });

  it("rejects overlaps on the same field, allows back-to-back and other fields", async () => {
    const f1 = await makeField();
    const f2 = await makeField();
    const a = await makeMember();
    const b = await makeMember();
    await createBooking(prisma, asMember(a.id), a.id, { fieldId: f1.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
    await expectCode(createBooking(prisma, asMember(b.id), b.id, { fieldId: f1.id, start: at("2026-11-05", "10:45"), slots: 1 }, NOW), "SLOT_TAKEN");
    await createBooking(prisma, asMember(b.id), b.id, { fieldId: f1.id, start: at("2026-11-05", "11:00"), slots: 1 }, NOW);
    await createBooking(prisma, asMember(b.id), b.id, { fieldId: f2.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
  });

  it("lets only one of two simultaneous requests win", async () => {
    const f = await makeField();
    const a = await makeMember();
    const b = await makeMember();
    const input = { fieldId: f.id, start: at("2026-11-05", "18:00"), slots: 1 };
    const results = await Promise.allSettled([
      createBooking(prisma, asMember(a.id), a.id, input, NOW),
      createBooking(prisma, asMember(b.id), b.id, input, NOW),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(DomainError);
    expect((rejected.reason as DomainError).violations[0].code).toBe("SLOT_TAKEN");
    expect(await prisma.booking.count()).toBe(1);
  });

  it("enforces max 3 active bookings but lets a member modify one of them", async () => {
    const f = await makeField();
    const m = await makeMember();
    const made = [];
    for (const t of ["09:00", "10:00", "11:00"]) {
      made.push(await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", t), slots: 1 }, NOW));
    }
    await expectCode(createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", "15:00"), slots: 1 }, NOW), "TOO_MANY_ACTIVE");
    const moved = await updateBooking(prisma, asMember(m.id), made[0].id, { fieldId: f.id, start: at("2026-11-06", "09:00"), slots: 1 }, NOW);
    expect(moved.start.getTime()).toBe(at("2026-11-06", "09:00").getTime());
  });

  it("moves a booking by 15 minutes overlapping itself", async () => {
    const f = await makeField();
    const m = await makeMember();
    const b = await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", "10:00"), slots: 2 }, NOW);
    const moved = await updateBooking(prisma, asMember(m.id), b.id, { fieldId: f.id, start: at("2026-11-05", "10:15"), slots: 2 }, NOW);
    expect(moved.end.getTime()).toBe(at("2026-11-05", "12:15").getTime());
    expect(await prisma.fieldOccupancy.count({ where: { bookingId: b.id } })).toBe(8);
  });

  it("moving to another field frees the old slot and recalculates the price", async () => {
    const tennis = await makeField({ priceCents: 1800 });
    const football = await makeField({ sport: "FOOTBALL", slotMinutes: 90, priceCents: 6000 });
    const a = await makeMember();
    const b = await makeMember();
    const booking = await createBooking(prisma, asMember(a.id), a.id, { fieldId: tennis.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
    const moved = await updateBooking(prisma, asMember(a.id), booking.id, { fieldId: football.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
    expect(moved.priceCents).toBe(6000);
    await createBooking(prisma, asMember(b.id), b.id, { fieldId: tennis.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
  });

  it("closes member changes 2 hours before the original start", async () => {
    const f = await makeField();
    const m = await makeMember();
    const b = await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-02", "12:00"), slots: 1 }, NOW);
    // NOW è esattamente 2 ore prima: si può ancora
    await updateBooking(prisma, asMember(m.id), b.id, { fieldId: f.id, start: at("2026-11-02", "12:15"), slots: 1 }, NOW);
    const later = new Date(NOW.getTime() + 20 * 60_000);
    await expectCode(updateBooking(prisma, asMember(m.id), b.id, { fieldId: f.id, start: at("2026-11-03", "12:00"), slots: 1 }, later), "CHANGE_WINDOW_CLOSED");
    await expectCode(cancelBooking(prisma, asMember(m.id), b.id, undefined, later), "CHANGE_WINDOW_CLOSED");
  });

  it("member cancellation in time is free and frees the slot", async () => {
    const f = await makeField();
    const m = await makeMember();
    const b = await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
    const c = await cancelBooking(prisma, asMember(m.id), b.id, "  ", NOW);
    expect(c.status).toBe("CANCELLED");
    expect(c.chargeable).toBe(false);
    expect(c.cancelReason).toBeNull();
    expect(await prisma.fieldOccupancy.count({ where: { bookingId: b.id } })).toBe(0);
    await expectCode(cancelBooking(prisma, asMember(m.id), b.id, undefined, NOW), "ALREADY_CANCELLED");
  });

  it("admin late cancellation stays chargeable, early one does not", async () => {
    const f = await makeField();
    const m = await makeMember();
    const admin = await makeAdmin();
    const soon = await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-02", "11:00"), slots: 1 }, NOW);
    const far = await createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", "11:00"), slots: 1 }, NOW);
    expect((await cancelBooking(prisma, asAdmin(admin.id), soon.id, "Campo allagato", NOW)).chargeable).toBe(true);
    expect((await cancelBooking(prisma, asAdmin(admin.id), far.id, undefined, NOW)).chargeable).toBe(false);
    const n = await prisma.notification.findFirst({ where: { userId: m.id, type: "BOOKING_CANCELLED" }, orderBy: { createdAt: "asc" } });
    expect(JSON.parse(n!.params)).toMatchObject({ by: "admin", reason: "Campo allagato", chargeable: 1 });
  });

  it("admin bypasses member rules but not overlaps or opening hours", async () => {
    const f = await makeField();
    const expired = await makeMember({ expiryDate: "2026-01-01" });
    const other = await makeMember();
    const admin = await makeAdmin();
    await createBooking(prisma, asAdmin(admin.id), expired.id, { fieldId: f.id, start: at("2026-12-20", "10:00"), slots: 1 }, NOW);
    await expectCode(createBooking(prisma, asAdmin(admin.id), other.id, { fieldId: f.id, start: at("2026-12-20", "10:30"), slots: 1 }, NOW), "SLOT_TAKEN");
    await expectCode(createBooking(prisma, asAdmin(admin.id), other.id, { fieldId: f.id, start: at("2026-12-20", "07:00"), slots: 1 }, NOW), "BEFORE_OPENING");
  });

  it("blocked members cannot book", async () => {
    const f = await makeField();
    const m = await makeMember();
    for (const day of ["2026-10-01", "2026-10-02"]) {
      const old = await prisma.booking.create({
        data: { memberId: m.id, fieldId: f.id, start: at(day, "10:00"), end: at(day, "11:00"), slots: 1, priceCents: 1800, paymentStatus: "UNPAID" },
      });
      await prisma.strike.create({ data: { memberId: m.id, bookingId: old.id } });
    }
    await expectCode(createBooking(prisma, asMember(m.id), m.id, { fieldId: f.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW), "BLOCKED");
  });

  it("a member cannot book for, change or cancel someone else's booking", async () => {
    const f = await makeField();
    const a = await makeMember();
    const b = await makeMember();
    await expectCode(createBooking(prisma, asMember(a.id), b.id, { fieldId: f.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW), "FORBIDDEN");
    const bk = await createBooking(prisma, asMember(b.id), b.id, { fieldId: f.id, start: at("2026-11-05", "10:00"), slots: 1 }, NOW);
    await expectCode(updateBooking(prisma, asMember(a.id), bk.id, { fieldId: f.id, start: at("2026-11-05", "12:00"), slots: 1 }, NOW), "FORBIDDEN");
    await expectCode(cancelBooking(prisma, asMember(a.id), bk.id, undefined, NOW), "FORBIDDEN");
  });
});
```

- [ ] **Step 3: Esegui e verifica che fallisca**

Run: `npm test -- src/server/bookings`
Expected: FAIL, "Failed to resolve import ./bookings".

- [ ] **Step 4: Implementa il servizio**

`src/server/bookings.ts`:
```ts
import { Prisma } from "@prisma/client";
import {
  bookingEnd,
  bookingPrice,
  canMemberChange,
  checkMemberRules,
  checkSchedule,
  isLateCancellation,
  quarterStarts,
} from "@/lib/booking-rules";
import type { Db, Tx } from "./db";
import { DomainError, fail } from "./errors";
import { getMemberState } from "./member-state";
import { notify } from "./notifications";
import { getSettings } from "./settings";

export type Actor = { userId: string; mode: "member" | "admin" };
export type BookingInput = { fieldId: string; start: Date; slots: number };

/** Esegue in transazione e trasforma la violazione della chiave di occupazione in SLOT_TAKEN. */
async function inTx<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.$transaction(fn);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new DomainError([{ code: "SLOT_TAKEN" }]);
    }
    throw e;
  }
}

async function validate(tx: Tx, actor: Actor, memberId: string, input: BookingInput, now: Date, excludeBookingId?: string) {
  const [field, settings] = await Promise.all([tx.field.findUnique({ where: { id: input.fieldId } }), getSettings(tx)]);
  if (!field) return fail("NOT_FOUND");
  const violations = checkSchedule(input, field, settings);
  if (actor.mode === "member") {
    const state = await getMemberState(tx, memberId, now, excludeBookingId);
    violations.push(...checkMemberRules(input, settings, state, now));
  }
  if (violations.length) throw new DomainError(violations);
  return { field, settings, end: bookingEnd(input.start, input.slots, field) };
}

async function occupy(tx: Tx, bookingId: string, fieldId: string, start: Date, end: Date) {
  const quarters = quarterStarts(start, end);
  const clash = await tx.fieldOccupancy.findFirst({ where: { fieldId, quarterStart: { in: quarters } } });
  if (clash) fail("SLOT_TAKEN");
  // Anche se due richieste passano il controllo insieme, la chiave primaria ne fa fallire una (P2002).
  await tx.fieldOccupancy.createMany({ data: quarters.map((quarterStart) => ({ fieldId, quarterStart, bookingId })) });
}

export async function releaseOccupancy(tx: Tx, bookingId: string) {
  await tx.fieldOccupancy.deleteMany({ where: { bookingId } });
}

async function loadForChange(tx: Tx, actor: Actor, bookingId: string) {
  const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { field: true } });
  if (!booking) return fail("NOT_FOUND");
  if (actor.mode === "member" && booking.memberId !== actor.userId) fail("FORBIDDEN");
  if (booking.status === "CANCELLED") fail("ALREADY_CANCELLED");
  return booking;
}

const by = (actor: Actor) => (actor.mode === "admin" ? "admin" : "self");

export async function createBooking(db: Db, actor: Actor, memberId: string, input: BookingInput, now = new Date()) {
  if (actor.mode === "member" && actor.userId !== memberId) fail("FORBIDDEN");
  return inTx(db, async (tx) => {
    const member = await tx.user.findUnique({ where: { id: memberId } });
    if (!member) return fail("NOT_FOUND");
    const { field, end } = await validate(tx, actor, memberId, input, now);
    const booking = await tx.booking.create({
      data: { memberId, fieldId: field.id, start: input.start, end, slots: input.slots, priceCents: bookingPrice(field.priceCents, input.slots) },
    });
    await occupy(tx, booking.id, field.id, input.start, end);
    await notify(tx, memberId, "BOOKING_CREATED", { field: field.name, start: input.start.toISOString(), by: by(actor) });
    return booking;
  });
}

export async function updateBooking(db: Db, actor: Actor, bookingId: string, input: BookingInput, now = new Date()) {
  return inTx(db, async (tx) => {
    const booking = await loadForChange(tx, actor, bookingId);
    const settings = await getSettings(tx);
    // La finestra si misura sull'inizio ORIGINALE della prenotazione.
    if (actor.mode === "member" && !canMemberChange(booking.start, now, settings)) {
      fail("CHANGE_WINDOW_CLOSED", { hours: settings.changeWindowMinutes / 60 });
    }
    await releaseOccupancy(tx, booking.id);
    const { field, end } = await validate(tx, actor, booking.memberId, input, now, booking.id);
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { fieldId: field.id, start: input.start, end, slots: input.slots, priceCents: bookingPrice(field.priceCents, input.slots) },
    });
    await occupy(tx, booking.id, field.id, input.start, end);
    await notify(tx, booking.memberId, "BOOKING_UPDATED", { field: field.name, start: input.start.toISOString(), by: by(actor) });
    return updated;
  });
}

export async function cancelBooking(db: Db, actor: Actor, bookingId: string, reason?: string, now = new Date()) {
  return inTx(db, async (tx) => {
    const booking = await loadForChange(tx, actor, bookingId);
    const settings = await getSettings(tx);
    if (actor.mode === "member" && !canMemberChange(booking.start, now, settings)) {
      fail("CHANGE_WINDOW_CLOSED", { hours: settings.changeWindowMinutes / 60 });
    }
    // Solo l'admin può cancellare in ritardo; in quel caso la prenotazione resta da pagare.
    const chargeable = actor.mode === "admin" && isLateCancellation(booking.start, now, settings);
    const cleanReason = reason?.trim() || null;
    const cancelled = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", chargeable, cancelReason: cleanReason, cancelledById: actor.userId, cancelledAt: now },
    });
    await releaseOccupancy(tx, booking.id);
    await notify(tx, booking.memberId, "BOOKING_CANCELLED", {
      field: booking.field.name,
      start: booking.start.toISOString(),
      by: by(actor),
      ...(cleanReason ? { reason: cleanReason } : {}),
      chargeable: chargeable ? 1 : 0,
    });
    return cancelled;
  });
}
```

- [ ] **Step 5: Esegui i test**

Run: `npm test -- src/server/bookings`
Expected: PASS (12 test). Se il test concorrente fallisce con "database is locked" o `P2034`, controlla che `DATABASE_URL` contenga `?connection_limit=1` (vedi `tests/test-db-url.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/server
git commit -m "feat(bookings): transactional create/update/cancel with occupancy table and notifications"
```

---

### Task 7: Autenticazione, attivazione account e ruoli

**Files:**
- Create: `src/lib/auth/normalize.ts`, `src/server/accounts.ts`, `src/server/accounts.test.ts`, `src/auth.ts`, `src/types/next-auth.d.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/server/guards.ts`, `src/server/action-result.ts`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/login/login-form.tsx`, `src/app/(auth)/login/actions.ts`, `src/app/(auth)/activate/page.tsx`, `src/app/(auth)/activate/activate-form.tsx`, `src/app/(auth)/activate/actions.ts`, `src/app/(app)/layout.tsx`, `src/components/app-nav.tsx`
- Modify: `src/lib/booking-rules/types.ts` (nuovi codici), `messages/it.json`, `messages/en.json`

**Interfaces:**
- Consumes: `DomainError`, `fail` (Task 6), `prisma` (Task 3), `LOCALE_COOKIE`, `toLocale` (Task 2).
- Produces:
  ```ts
  normalizeEmail(s: string): string             // trim + minuscolo
  normalizeCardNumber(s: string): string        // trim, senza spazi, maiuscolo
  activateAccount(db: Db, input: { cardNumber: string; email: string; password: string }): Promise<{ userId: string }>
  verifyCredentials(db: Db, email: string, password: string): Promise<User | null>
  hashPassword(p: string): Promise<string>
  MIN_PASSWORD_LENGTH = 8
  // guards.ts
  currentUser(): Promise<(User & { membership: Membership | null }) | null>
  requireUser(): Promise<User & { membership: Membership | null }>   // redirect a /login
  requireAdmin(): Promise<User & { membership: Membership | null }>  // redirect a /
  // action-result.ts
  type ActionResult<T = null> = { ok: true; data: T } | { ok: false; violations: Violation[] };
  runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>>
  ```
- Nuovi `ViolationCode`: `"ACTIVATION_MISMATCH" | "ALREADY_ACTIVE" | "PASSWORD_TOO_SHORT" | "INVALID_CREDENTIALS"`.
- `isAdmin` **non** va nel JWT: le guardie lo rileggono dal database a ogni richiesta, così una promozione o una revoca ha effetto subito. Se l'admin reimposta l'accesso di un utente (`passwordHash = null`), la sua sessione smette di valere alla richiesta successiva.

- [ ] **Step 1: Aggiungi i codici di errore**

In `src/lib/booking-rules/types.ts`, aggiungi alla union `ViolationCode`:
```ts
  | "ACTIVATION_MISMATCH"
  | "ALREADY_ACTIVE"
  | "PASSWORD_TOO_SHORT"
  | "INVALID_CREDENTIALS"
```

In `messages/it.json` → `errors`:
```json
"ACTIVATION_MISMATCH": "Numero tessera ed email non corrispondono a un socio registrato.",
"ALREADY_ACTIVE": "Questo account è già attivo. Accedi con la tua password.",
"PASSWORD_TOO_SHORT": "La password deve avere almeno {min} caratteri.",
"INVALID_CREDENTIALS": "Email o password non corretti."
```
In `messages/en.json` → `errors`:
```json
"ACTIVATION_MISMATCH": "Card number and email do not match a registered member.",
"ALREADY_ACTIVE": "This account is already active. Log in with your password.",
"PASSWORD_TOO_SHORT": "The password must be at least {min} characters long.",
"INVALID_CREDENTIALS": "Wrong email or password."
```

- [ ] **Step 2: Scrivi i test degli account**

`src/server/accounts.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { DomainError } from "./errors";
import { activateAccount, verifyCredentials } from "./accounts";
import { makeMember, resetDb } from "../../tests/helpers/db";

async function code(p: Promise<unknown>) {
  const e = await p.then(() => null, (x: unknown) => x);
  expect(e).toBeInstanceOf(DomainError);
  return (e as DomainError).violations[0].code;
}

describe("accounts", () => {
  beforeEach(resetDb);

  it("activates with matching card number and email", async () => {
    const m = await makeMember({ email: "mario.rossi@example.it", number: "PG-0042", password: null });
    await activateAccount(prisma, { cardNumber: "PG-0042", email: "mario.rossi@example.it", password: "segreta123" });
    expect(await verifyCredentials(prisma, "mario.rossi@example.it", "segreta123")).toMatchObject({ id: m.id });
  });

  it("ignores case and surrounding spaces in email and card number", async () => {
    await makeMember({ email: "mario.rossi@example.it", number: "PG-0042", password: null });
    await activateAccount(prisma, { cardNumber: " pg-0042 ", email: " Mario.Rossi@Example.it ", password: "segreta123" });
    expect(await verifyCredentials(prisma, "MARIO.ROSSI@example.it ", "segreta123")).not.toBeNull();
  });

  it("gives the same error for a wrong card number or a wrong email", async () => {
    await makeMember({ email: "a@example.it", number: "PG-1", password: null });
    await makeMember({ email: "b@example.it", number: "PG-2", password: null });
    expect(await code(activateAccount(prisma, { cardNumber: "PG-9", email: "a@example.it", password: "segreta123" }))).toBe("ACTIVATION_MISMATCH");
    expect(await code(activateAccount(prisma, { cardNumber: "PG-1", email: "b@example.it", password: "segreta123" }))).toBe("ACTIVATION_MISMATCH");
  });

  it("refuses an already active account and short passwords", async () => {
    await makeMember({ email: "a@example.it", number: "PG-1" });
    await makeMember({ email: "b@example.it", number: "PG-2", password: null });
    expect(await code(activateAccount(prisma, { cardNumber: "PG-1", email: "a@example.it", password: "segreta123" }))).toBe("ALREADY_ACTIVE");
    expect(await code(activateAccount(prisma, { cardNumber: "PG-2", email: "b@example.it", password: "corta" }))).toBe("PASSWORD_TOO_SHORT");
  });

  it("rejects wrong passwords and accounts not yet activated", async () => {
    await makeMember({ email: "a@example.it" });
    await makeMember({ email: "b@example.it", password: null });
    expect(await verifyCredentials(prisma, "a@example.it", "sbagliata")).toBeNull();
    expect(await verifyCredentials(prisma, "b@example.it", "")).toBeNull();
    expect(await verifyCredentials(prisma, "nessuno@example.it", "x")).toBeNull();
  });
});
```

- [ ] **Step 3: Esegui e verifica che fallisca**

Run: `npm test -- src/server/accounts`
Expected: FAIL, "Failed to resolve import ./accounts".

- [ ] **Step 4: Implementa normalizzazione e account**

`src/lib/auth/normalize.ts`:
```ts
export const normalizeEmail = (s: string) => s.trim().toLowerCase();
export const normalizeCardNumber = (s: string) => s.replace(/\s+/g, "").toUpperCase();
```

`src/server/accounts.ts`:
```ts
import bcrypt from "bcryptjs";
import { normalizeCardNumber, normalizeEmail } from "@/lib/auth/normalize";
import type { Db } from "./db";
import { fail } from "./errors";

export const MIN_PASSWORD_LENGTH = 8;

export const hashPassword = (p: string) => bcrypt.hash(p, 10);

export async function activateAccount(db: Db, input: { cardNumber: string; email: string; password: string }) {
  const membership = await db.membership.findUnique({
    where: { number: normalizeCardNumber(input.cardNumber) },
    include: { user: true },
  });
  // Stesso errore per tessera o email sbagliate: non riveliamo quale dei due esiste.
  if (!membership || membership.user.email !== normalizeEmail(input.email)) return fail("ACTIVATION_MISMATCH");
  if (membership.user.passwordHash) fail("ALREADY_ACTIVE");
  if (input.password.length < MIN_PASSWORD_LENGTH) fail("PASSWORD_TOO_SHORT", { min: MIN_PASSWORD_LENGTH });
  await db.user.update({ where: { id: membership.userId }, data: { passwordHash: await hashPassword(input.password) } });
  return { userId: membership.userId };
}

export async function verifyCredentials(db: Db, email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user?.passwordHash || !password) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}
```

Nota: le tessere vanno salvate già normalizzate (lo fa Task 8 alla creazione del socio). Il seed usa `PG-0001` ecc., che sono già in forma normalizzata.

- [ ] **Step 5: Esegui i test**

Run: `npm test -- src/server/accounts`
Expected: PASS (5 test).

- [ ] **Step 6: Auth.js**

`src/auth.ts`:
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/server/accounts";
import { prisma } from "@/server/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (c) => {
        const user = await verifyCredentials(prisma, String(c?.email ?? ""), String(c?.password ?? ""));
        return user ? { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` } : null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
```

`src/types/next-auth.d.ts`:
```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
```

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 7: Guardie e risultato delle action**

`src/server/guards.ts`:
```ts
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "./db";

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id }, include: { membership: true } });
}

export async function requireUser() {
  const user = await currentUser();
  if (!user || !user.passwordHash) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}
```

`src/server/action-result.ts`:
```ts
import type { Violation } from "@/lib/booking-rules";
import { DomainError } from "./errors";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; violations: Violation[] };

/** Le Server Action non lanciano mai DomainError al client: lo trasformano in un risultato da tradurre. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, violations: e.violations };
    throw e;
  }
}
```

- [ ] **Step 8: Messaggi per login, attivazione e navigazione**

`messages/it.json` (nuovo namespace `auth`):
```json
"auth": {
  "loginTitle": "Accedi", "email": "Email", "password": "Password", "login": "Accedi",
  "noAccount": "Primo accesso? Attiva il tuo account", "activateTitle": "Attiva il tuo account",
  "activateIntro": "Inserisci il numero della tua tessera e l'email che hai lasciato in segreteria, poi scegli una password.",
  "cardNumber": "Numero tessera", "newPassword": "Nuova password", "activate": "Attiva",
  "forgot": "Password dimenticata? Chiedi all'amministratore di reimpostare l'accesso.",
  "haveAccount": "Hai già un account? Accedi"
}
```
`messages/en.json`:
```json
"auth": {
  "loginTitle": "Log in", "email": "Email", "password": "Password", "login": "Log in",
  "noAccount": "First time? Activate your account", "activateTitle": "Activate your account",
  "activateIntro": "Enter your membership card number and the email you gave the office, then choose a password.",
  "cardNumber": "Card number", "newPassword": "New password", "activate": "Activate",
  "forgot": "Forgot your password? Ask the administrator to reset your access.",
  "haveAccount": "Already have an account? Log in"
}
```

- [ ] **Step 9: Pagine di login e attivazione**

`src/app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">{children}</main>;
}
```

`src/app/(auth)/login/actions.ts`:
```ts
"use server";

import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { signIn } from "@/auth";
import { normalizeEmail } from "@/lib/auth/normalize";
import { LOCALE_COOKIE } from "@/i18n/locales";
import { prisma } from "@/server/db";
import type { ActionResult } from "@/server/action-result";

export async function loginAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") ?? "");
  try {
    await signIn("credentials", { email, password: String(form.get("password") ?? ""), redirect: false });
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, violations: [{ code: "INVALID_CREDENTIALS" }] };
    throw e;
  }
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (user) (await cookies()).set(LOCALE_COOKIE, user.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return { ok: true, data: null };
}
```

`src/app/(auth)/login/login-form.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ViolationList } from "@/components/violation-list";
import { loginAction } from "./actions";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, action, pending] = useActionState(loginAction, null);
  useEffect(() => {
    if (state?.ok) router.replace("/");
  }, [state, router]);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state && !state.ok && <ViolationList violations={state.violations} />}
      <Button type="submit" className="w-full" disabled={pending}>{t("login")}</Button>
      <p className="text-sm text-muted-foreground"><Link className="underline" href="/activate">{t("noAccount")}</Link></p>
      <p className="text-sm text-muted-foreground">{t("forgot")}</p>
    </form>
  );
}
```

`src/app/(auth)/login/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{t("loginTitle")}</h1>
      <LoginForm />
    </>
  );
}
```

`src/components/violation-list.tsx` (lo usano tutti i form):
```tsx
"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Violation } from "@/lib/booking-rules";

/** Traduce i codici di violazione restituiti dal server. I parametri "YYYY-MM-DD" vengono formattati come date. */
export function ViolationList({ violations }: { violations: Violation[] }) {
  const t = useTranslations("errors");
  const format = useFormatter();
  const fmt = (v: string | number) =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? format.dateTime(new Date(`${v}T12:00:00Z`), { dateStyle: "medium" }) : v;
  return (
    <Alert variant="destructive">
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-4">
          {violations.map((v, i) => (
            <li key={i}>{t(v.code, Object.fromEntries(Object.entries(v.params ?? {}).map(([k, x]) => [k, fmt(x)])))}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
```

`src/app/(auth)/activate/actions.ts`:
```ts
"use server";

import { activateAccount } from "@/server/accounts";
import { runAction, type ActionResult } from "@/server/action-result";
import { prisma } from "@/server/db";

export async function activateAction(_: ActionResult<{ userId: string }> | null, form: FormData) {
  return runAction(() =>
    activateAccount(prisma, {
      cardNumber: String(form.get("cardNumber") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    }),
  );
}
```

`src/app/(auth)/activate/activate-form.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ViolationList } from "@/components/violation-list";
import { activateAction } from "./actions";

export function ActivateForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, action, pending] = useActionState(activateAction, null);
  useEffect(() => {
    if (state?.ok) router.replace("/login");
  }, [state, router]);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardNumber">{t("cardNumber")}</Label>
        <Input id="cardNumber" name="cardNumber" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state && !state.ok && <ViolationList violations={state.violations} />}
      <Button type="submit" className="w-full" disabled={pending}>{t("activate")}</Button>
      <p className="text-sm text-muted-foreground"><Link className="underline" href="/login">{t("haveAccount")}</Link></p>
    </form>
  );
}
```

`src/app/(auth)/activate/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { ActivateForm } from "./activate-form";

export default async function ActivatePage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">{t("activateTitle")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("activateIntro")}</p>
      <ActivateForm />
    </>
  );
}
```

- [ ] **Step 10: Layout dell'area autenticata con navigazione**

`src/app/(app)/layout.tsx`:
```tsx
import { requireUser } from "@/server/guards";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <AppNav isAdmin={user.isAdmin} userName={`${user.firstName} ${user.lastName}`} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:pb-6">{children}</main>
    </div>
  );
}
```

`src/components/app-nav.tsx`:
```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays, ClipboardList, LayoutDashboard, LogOut, PlusCircle, Settings, User, Users, Wallet, BarChart3 } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function AppNav({ isAdmin, userName }: { isAdmin: boolean; userName: string }) {
  const t = await getTranslations("nav");
  const member = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/calendar", label: t("calendar"), icon: CalendarDays },
    { href: "/book", label: t("book"), icon: PlusCircle },
    { href: "/bookings", label: t("bookings"), icon: ClipboardList },
    { href: "/profile", label: t("profile"), icon: User },
  ];
  const admin = [
    { href: "/admin/dashboard", label: t("adminDashboard"), icon: BarChart3 },
    { href: "/admin/members", label: t("adminMembers"), icon: Users },
    { href: "/admin/bookings", label: t("adminBookings"), icon: ClipboardList },
    { href: "/admin/payments", label: t("adminPayments"), icon: Wallet },
    { href: "/admin/settings", label: t("adminSettings"), icon: Settings },
  ];
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  const item = (l: (typeof member)[number]) => (
    <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent">
      <l.icon className="size-4" aria-hidden /> <span>{l.label}</span>
    </Link>
  );
  return (
    <>
      <aside className="hidden border-r bg-card md:flex md:flex-col md:gap-1 md:p-3">
        <p className="px-3 py-2 text-sm font-medium">{userName}</p>
        {member.map(item)}
        {isAdmin && <p className="mt-4 px-3 text-xs uppercase text-muted-foreground">{t("admin")}</p>}
        {isAdmin && admin.map(item)}
        <form action={logout} className="mt-auto">
          <Button variant="ghost" className="w-full justify-start" type="submit"><LogOut className="size-4" aria-hidden /> {t("logout")}</Button>
        </form>
      </aside>
      {/* Barra in basso su telefono: solo le voci principali del socio. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card py-1 md:hidden">
        {member.slice(0, 4).map((l) => (
          <Link key={l.href} href={l.href} className="flex flex-col items-center px-2 py-1 text-xs">
            <l.icon className="size-5" aria-hidden /> <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
```

Su telefono l'area admin e il profilo si raggiungono dal menu che Task 19 aggiunge in alto (`Sheet`). Fino ad allora si usano su desktop.

- [ ] **Step 11: Verifica manuale e commit**

Run: `npm run dev`. Apri `http://localhost:3000/login` e accedi con `giulia@example.it` / `socio1234`. Dopo il login vieni mandato a `/`, poi a `/calendar`: per ora è un 404, che si risolve in Task 9. Poi esci, attiva `paolo@example.it` con tessera ` pg-0004 ` e accedi.
Run: `npm test` → PASS. `npm run lint` → nessun errore.

```bash
git add -A
git commit -m "feat(auth): Auth.js credentials login, account activation by card + email, guards"
```

---

### Task 8: Gestione soci e tessere (admin)

**Files:**
- Create: `src/lib/membership.ts`, `src/lib/membership.test.ts`, `src/server/members.ts`, `src/server/members.test.ts`, `src/app/(app)/admin/layout.tsx`, `src/app/(app)/admin/members/page.tsx`, `src/app/(app)/admin/members/new/page.tsx`, `src/app/(app)/admin/members/[id]/page.tsx`, `src/app/(app)/admin/members/actions.ts`, `src/components/admin/member-form.tsx`, `src/components/admin/member-actions.tsx`
- Modify: `src/lib/booking-rules/types.ts`, `messages/*.json`

**Interfaces:**
- Consumes: `addDays`, `diffDays`, `romeDay` (Task 4), `normalizeEmail`, `normalizeCardNumber` (Task 7), `requireAdmin`, `runAction` (Task 7), `fail` (Task 6).
- Produces:
  ```ts
  // lib/membership.ts
  addYears(day: string, n: number): string           // 29/02 → 28/02
  defaultExpiry(issueDate: string): string           // issue + 1 anno
  proposeRenewal(today: string, currentExpiry: string): { issueDate: string; expiryDate: string }
  daysUntilExpiry(expiry: string, today: string): number
  // server/members.ts
  memberInputSchema: z.ZodType<MemberInput>
  type MemberInput = { firstName; lastName; birthDate?: string; email; phone?: string; cardNumber; issueDate; expiryDate }
  createMember(db: Db, input: MemberInput): Promise<User>
  updateMember(db: Db, userId: string, input: MemberInput): Promise<User>
  renewMembership(db: Db, userId: string, today: string, expiryOverride?: string): Promise<Membership>
  resetAccess(db: Db, userId: string): Promise<void>
  setAdmin(db: Db, actorId: string, userId: string, isAdmin: boolean): Promise<void>
  ```
- Nuovi `ViolationCode`: `"EMAIL_TAKEN" | "CARD_TAKEN" | "CANNOT_DEMOTE_SELF"`.

- [ ] **Step 1: Test delle date di tessera (puri)**

`src/lib/membership.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { addYears, daysUntilExpiry, defaultExpiry, proposeRenewal } from "./membership";

describe("membership dates", () => {
  it("expires one year after issue", () => {
    expect(defaultExpiry("2026-10-13")).toBe("2027-10-13");
  });
  it("clamps 29 February", () => {
    expect(addYears("2028-02-29", 1)).toBe("2029-02-28");
  });
  it("early renewal keeps the remaining days", () => {
    expect(proposeRenewal("2026-10-01", "2026-10-20")).toEqual({ issueDate: "2026-10-01", expiryDate: "2027-10-20" });
  });
  it("late renewal starts from today", () => {
    expect(proposeRenewal("2026-10-01", "2026-03-01")).toEqual({ issueDate: "2026-10-01", expiryDate: "2027-10-01" });
  });
  it("counts days to expiry", () => {
    expect(daysUntilExpiry("2026-10-28", "2026-10-13")).toBe(15);
    expect(daysUntilExpiry("2026-10-10", "2026-10-13")).toBe(-3);
  });
});
```

Run: `npm test -- src/lib/membership` → FAIL (modulo mancante).

- [ ] **Step 2: Implementa `membership.ts`**

`src/lib/membership.ts`:
```ts
import { diffDays } from "@/lib/time/rome";

export function addYears(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const lastOfMonth = new Date(Date.UTC(y + n, m, 0)).getUTCDate();
  return `${y + n}-${String(m).padStart(2, "0")}-${String(Math.min(d, lastOfMonth)).padStart(2, "0")}`;
}

export const defaultExpiry = (issueDate: string) => addYears(issueDate, 1);

/** Rinnovo: emissione = oggi, scadenza = max(oggi, scadenza attuale) + 1 anno. */
export function proposeRenewal(today: string, currentExpiry: string) {
  const base = currentExpiry > today ? currentExpiry : today;
  return { issueDate: today, expiryDate: addYears(base, 1) };
}

export const daysUntilExpiry = (expiry: string, today: string) => diffDays(today, expiry);
```

Run: `npm test -- src/lib/membership` → PASS.

- [ ] **Step 3: Codici e test del servizio soci**

In `src/lib/booking-rules/types.ts` aggiungi alla union: `| "EMAIL_TAKEN" | "CARD_TAKEN" | "CANNOT_DEMOTE_SELF"`.
Messaggi `errors` IT: `"EMAIL_TAKEN": "Esiste già un utente con questa email."`, `"CARD_TAKEN": "Questo numero di tessera è già assegnato."`, `"CANNOT_DEMOTE_SELF": "Non puoi togliere a te stesso i permessi di amministratore."`. EN: `"EMAIL_TAKEN": "A user with this email already exists."`, `"CARD_TAKEN": "This card number is already assigned."`, `"CANNOT_DEMOTE_SELF": "You cannot remove your own administrator rights."`.

`src/server/members.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { DomainError } from "./errors";
import { createMember, renewMembership, resetAccess, setAdmin, updateMember, type MemberInput } from "./members";
import { makeAdmin, makeMember, resetDb } from "../../tests/helpers/db";

const input = (o: Partial<MemberInput> = {}): MemberInput => ({
  firstName: "Anna", lastName: "Blu", email: " Anna.Blu@Example.it ", cardNumber: " pg 0100 ",
  issueDate: "2026-10-13", expiryDate: "2027-10-13", ...o,
});
const code = async (p: Promise<unknown>) => ((await p.then(() => null, (e) => e)) as DomainError).violations[0].code;

describe("members service", () => {
  beforeEach(resetDb);

  it("creates a member with normalized email and card, not yet activated", async () => {
    const u = await createMember(prisma, input());
    const full = await prisma.user.findUniqueOrThrow({ where: { id: u.id }, include: { membership: { include: { renewals: true } } } });
    expect(full.email).toBe("anna.blu@example.it");
    expect(full.membership?.number).toBe("PG0100");
    expect(full.passwordHash).toBeNull();
    expect(full.membership?.renewals).toHaveLength(1);
  });

  it("rejects duplicate email or card number", async () => {
    await createMember(prisma, input());
    expect(await code(createMember(prisma, input({ cardNumber: "PG0101" })))).toBe("EMAIL_TAKEN");
    expect(await code(createMember(prisma, input({ email: "altra@example.it" })))).toBe("CARD_TAKEN");
  });

  it("updates data keeping the same card", async () => {
    const u = await createMember(prisma, input());
    await updateMember(prisma, u.id, input({ phone: "333", expiryDate: "2027-12-31" }));
    const m = await prisma.membership.findUniqueOrThrow({ where: { userId: u.id } });
    expect(m.expiryDate).toBe("2027-12-31");
  });

  it("renews keeping the number and logging history", async () => {
    const u = await createMember(prisma, input({ expiryDate: "2026-10-20" }));
    const m = await renewMembership(prisma, u.id, "2026-10-01");
    expect(m).toMatchObject({ number: "PG0100", issueDate: "2026-10-01", expiryDate: "2027-10-20" });
    expect(await prisma.membershipRenewal.count({ where: { membershipId: m.id } })).toBe(2);
    expect((await renewMembership(prisma, u.id, "2026-10-01", "2027-12-31")).expiryDate).toBe("2027-12-31");
  });

  it("reset access makes the account 'to activate' again", async () => {
    const m = await makeMember();
    await resetAccess(prisma, m.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: m.id } })).passwordHash).toBeNull();
  });

  it("promotes users but an admin cannot demote themselves", async () => {
    const admin = await makeAdmin();
    const m = await makeMember();
    await setAdmin(prisma, admin.id, m.id, true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: m.id } })).isAdmin).toBe(true);
    expect(await code(setAdmin(prisma, admin.id, admin.id, false))).toBe("CANNOT_DEMOTE_SELF");
  });
});
```

Run: `npm test -- src/server/members` → FAIL (modulo mancante).

- [ ] **Step 4: Implementa il servizio soci**

`src/server/members.ts`:
```ts
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { normalizeCardNumber, normalizeEmail } from "@/lib/auth/normalize";
import { proposeRenewal } from "@/lib/membership";
import type { Db } from "./db";
import { fail } from "./errors";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optional = (s: z.ZodString) => s.optional().or(z.literal("").transform(() => undefined));

export const memberInputSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    birthDate: optional(day),
    email: z.string().trim().email().max(200),
    phone: optional(z.string().trim().max(40)),
    cardNumber: z.string().trim().min(1).max(40),
    issueDate: day,
    expiryDate: day,
  })
  .refine((v) => v.expiryDate >= v.issueDate, { path: ["expiryDate"] });

export type MemberInput = z.input<typeof memberInputSchema>;

function parse(input: MemberInput) {
  const r = memberInputSchema.safeParse(input);
  if (!r.success) return fail("INVALID_INPUT");
  return { ...r.data, email: normalizeEmail(r.data.email), cardNumber: normalizeCardNumber(r.data.cardNumber) };
}

/** Converte le violazioni di unicità di Prisma in codici leggibili. */
function mapUnique(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = String((e.meta?.target as string[] | string | undefined) ?? "");
    fail(target.includes("email") ? "EMAIL_TAKEN" : "CARD_TAKEN");
  }
  throw e;
}

export async function createMember(db: Db, input: MemberInput) {
  const v = parse(input);
  try {
    return await db.user.create({
      data: {
        firstName: v.firstName, lastName: v.lastName, birthDate: v.birthDate, email: v.email, phone: v.phone,
        membership: {
          create: {
            number: v.cardNumber, issueDate: v.issueDate, expiryDate: v.expiryDate,
            renewals: { create: { issueDate: v.issueDate, expiryDate: v.expiryDate } },
          },
        },
      },
    });
  } catch (e) {
    return mapUnique(e);
  }
}

export async function updateMember(db: Db, userId: string, input: MemberInput) {
  const v = parse(input);
  try {
    return await db.user.update({
      where: { id: userId },
      data: {
        firstName: v.firstName, lastName: v.lastName, birthDate: v.birthDate ?? null, email: v.email, phone: v.phone ?? null,
        membership: {
          upsert: {
            create: { number: v.cardNumber, issueDate: v.issueDate, expiryDate: v.expiryDate },
            update: { number: v.cardNumber, issueDate: v.issueDate, expiryDate: v.expiryDate },
          },
        },
      },
    });
  } catch (e) {
    return mapUnique(e);
  }
}

export async function renewMembership(db: Db, userId: string, today: string, expiryOverride?: string) {
  const current = await db.membership.findUnique({ where: { userId } });
  if (!current) return fail("NOT_FOUND");
  const proposal = proposeRenewal(today, current.expiryDate);
  const expiryDate = expiryOverride && day.safeParse(expiryOverride).success ? expiryOverride : proposal.expiryDate;
  return db.membership.update({
    where: { id: current.id },
    data: { issueDate: proposal.issueDate, expiryDate, renewals: { create: { issueDate: proposal.issueDate, expiryDate } } },
  });
}

export async function resetAccess(db: Db, userId: string) {
  await db.user.update({ where: { id: userId }, data: { passwordHash: null } });
}

export async function setAdmin(db: Db, actorId: string, userId: string, isAdmin: boolean) {
  if (actorId === userId && !isAdmin) fail("CANNOT_DEMOTE_SELF");
  await db.user.update({ where: { id: userId }, data: { isAdmin } });
}
```

Run: `npm test -- src/server/members` → PASS (6 test).

- [ ] **Step 5: Messaggi dell'area soci**

`messages/it.json`, namespace `members`:
```json
"members": {
  "title": "Soci", "new": "Nuovo socio", "searchPlaceholder": "Cerca per nome, email o tessera",
  "firstName": "Nome", "lastName": "Cognome", "birthDate": "Data di nascita", "email": "Email", "phone": "Telefono",
  "cardNumber": "Numero tessera", "issueDate": "Emissione", "expiryDate": "Scadenza",
  "status": "Stato", "active": "Attivo", "toActivate": "Da attivare", "expired": "Tessera scaduta", "blocked": "Bloccato", "admin": "Admin",
  "renew": "Rinnova tessera", "renewHint": "Nuova scadenza proposta: {date}. Puoi modificarla.", "resetAccess": "Reimposta accesso",
  "resetConfirm": "Il socio dovrà riattivare l'account con tessera ed email. Continuare?",
  "makeAdmin": "Rendi amministratore", "removeAdmin": "Togli amministratore", "saved": "Salvato",
  "strikes": "Strike", "unpaid": "Insoluti", "debt": "Debito", "history": "Storico prenotazioni", "renewals": "Storico rinnovi", "none": "Nessun socio trovato"
}
```
`messages/en.json`:
```json
"members": {
  "title": "Members", "new": "New member", "searchPlaceholder": "Search by name, email or card",
  "firstName": "First name", "lastName": "Last name", "birthDate": "Date of birth", "email": "Email", "phone": "Phone",
  "cardNumber": "Card number", "issueDate": "Issued", "expiryDate": "Expires",
  "status": "Status", "active": "Active", "toActivate": "To activate", "expired": "Card expired", "blocked": "Blocked", "admin": "Admin",
  "renew": "Renew card", "renewHint": "Proposed new expiry: {date}. You can change it.", "resetAccess": "Reset access",
  "resetConfirm": "The member will have to activate the account again with card and email. Continue?",
  "makeAdmin": "Make administrator", "removeAdmin": "Remove administrator", "saved": "Saved",
  "strikes": "Strikes", "unpaid": "Unpaid", "debt": "Debt", "history": "Booking history", "renewals": "Renewal history", "none": "No members found"
}
```

- [ ] **Step 6: Server Action dell'area soci**

`src/app/(app)/admin/members/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { romeDay } from "@/lib/time/rome";
import { runAction } from "@/server/action-result";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { createMember, renewMembership, resetAccess, setAdmin, updateMember, type MemberInput } from "@/server/members";

const fromForm = (f: FormData): MemberInput => ({
  firstName: String(f.get("firstName") ?? ""), lastName: String(f.get("lastName") ?? ""),
  birthDate: String(f.get("birthDate") ?? ""), email: String(f.get("email") ?? ""), phone: String(f.get("phone") ?? ""),
  cardNumber: String(f.get("cardNumber") ?? ""), issueDate: String(f.get("issueDate") ?? ""), expiryDate: String(f.get("expiryDate") ?? ""),
});

export async function saveMemberAction(userId: string | null, _: unknown, form: FormData) {
  await requireAdmin();
  const res = await runAction(async () => {
    const u = userId ? await updateMember(prisma, userId, fromForm(form)) : await createMember(prisma, fromForm(form));
    return { id: u.id };
  });
  revalidatePath("/admin/members");
  return res;
}

export async function renewAction(userId: string, expiryOverride: string) {
  await requireAdmin();
  const res = await runAction(() => renewMembership(prisma, userId, romeDay(new Date()), expiryOverride || undefined).then(() => null));
  revalidatePath(`/admin/members/${userId}`);
  return res;
}

export async function resetAccessAction(userId: string) {
  await requireAdmin();
  const res = await runAction(() => resetAccess(prisma, userId).then(() => null));
  revalidatePath(`/admin/members/${userId}`);
  return res;
}

export async function setAdminAction(userId: string, isAdmin: boolean) {
  const me = await requireAdmin();
  const res = await runAction(() => setAdmin(prisma, me.id, userId, isAdmin).then(() => null));
  revalidatePath(`/admin/members/${userId}`);
  return res;
}
```

- [ ] **Step 7: Pagine e componenti**

`src/app/(app)/admin/layout.tsx`:
```tsx
import { requireAdmin } from "@/server/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
```

`src/components/admin/member-form.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ViolationList } from "@/components/violation-list";
import { saveMemberAction } from "@/app/(app)/admin/members/actions";

export type MemberFormValues = {
  firstName: string; lastName: string; birthDate: string; email: string; phone: string;
  cardNumber: string; issueDate: string; expiryDate: string;
};

export function MemberForm({ userId, initial }: { userId: string | null; initial: MemberFormValues }) {
  const t = useTranslations("members");
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, action, pending] = useActionState(saveMemberAction.bind(null, userId), null);
  useEffect(() => {
    if (state?.ok) {
      toast.success(t("saved"));
      router.push(`/admin/members/${state.data.id}`);
    }
  }, [state, router, t]);
  const field = (name: keyof MemberFormValues, type = "text", required = true) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{t(name)}</Label>
      <Input id={name} name={name} type={type} defaultValue={initial[name]} required={required} />
    </div>
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {field("firstName")}
      {field("lastName")}
      {field("email", "email")}
      {field("phone", "tel", false)}
      {field("birthDate", "date", false)}
      {field("cardNumber")}
      {field("issueDate", "date")}
      {field("expiryDate", "date")}
      {state && !state.ok && <div className="sm:col-span-2"><ViolationList violations={state.violations} /></div>}
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{tc("save")}</Button></div>
    </form>
  );
}
```

`src/app/(app)/admin/members/new/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { defaultExpiry } from "@/lib/membership";
import { romeDay } from "@/lib/time/rome";
import { MemberForm } from "@/components/admin/member-form";

export default async function NewMemberPage() {
  const t = await getTranslations("members");
  const today = romeDay(new Date());
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("new")}</h1>
      <MemberForm
        userId={null}
        initial={{ firstName: "", lastName: "", birthDate: "", email: "", phone: "", cardNumber: "", issueDate: today, expiryDate: defaultExpiry(today) }}
      />
    </div>
  );
}
```

`src/app/(app)/admin/members/page.tsx`:
```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { romeDay } from "@/lib/time/rome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/server/db";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getTranslations("members");
  const tc = await getTranslations("common");
  const q = (await searchParams).q?.trim() ?? "";
  const today = romeDay(new Date());
  const members = await prisma.user.findMany({
    where: q
      ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q.toLowerCase() } }, { membership: { number: { contains: q.toUpperCase() } } }] }
      : undefined,
    include: { membership: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild><Link href="/admin/members/new">{t("new")}</Link></Button>
      </div>
      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} />
        <Button type="submit" variant="secondary">{tc("search")}</Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("lastName")}</TableHead>
            <TableHead>{t("cardNumber")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("expiryDate")}</TableHead>
            <TableHead>{t("status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-muted-foreground">{t("none")}</TableCell></TableRow>
          )}
          {members.map((m) => (
            <TableRow key={m.id}>
              <TableCell><Link className="underline-offset-2 hover:underline" href={`/admin/members/${m.id}`}>{m.lastName} {m.firstName}</Link></TableCell>
              <TableCell>{m.membership?.number}</TableCell>
              <TableCell className="hidden sm:table-cell">{m.membership?.expiryDate}</TableCell>
              <TableCell className="space-x-1">
                {!m.passwordHash && <Badge variant="outline">{t("toActivate")}</Badge>}
                {m.membership && m.membership.expiryDate < today && <Badge variant="destructive">{t("expired")}</Badge>}
                {m.isAdmin && <Badge>{t("admin")}</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

Nota: su SQLite `contains` non distingue maiuscole e minuscole solo per i caratteri ASCII, e per una ricerca tra i soci di un paese basta così. Su PostgreSQL aggiungi `mode: "insensitive"` (vedi README, Task 20).

`src/components/admin/member-actions.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ViolationList } from "@/components/violation-list";
import type { Violation } from "@/lib/booking-rules";
import { renewAction, resetAccessAction, setAdminAction } from "@/app/(app)/admin/members/actions";

export function MemberActions({ userId, isAdmin, proposedExpiry, hasMembership }: { userId: string; isAdmin: boolean; proposedExpiry: string | null; hasMembership: boolean }) {
  const t = useTranslations("members");
  const router = useRouter();
  const [expiry, setExpiry] = useState(proposedExpiry ?? "");
  const [errors, setErrors] = useState<Violation[]>([]);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; violations?: Violation[] }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setErrors([]);
        toast.success(t("saved"));
        router.refresh();
      } else setErrors(r.violations ?? []);
    });
  return (
    <div className="space-y-4">
      {hasMembership && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t("renewHint", { date: proposedExpiry ?? "" })}</p>
            <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-44" />
          </div>
          <Button disabled={pending} onClick={() => run(() => renewAction(userId, expiry))}>{t("renew")}</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending} onClick={() => confirm(t("resetConfirm")) && run(() => resetAccessAction(userId))}>{t("resetAccess")}</Button>
        <Button variant="outline" disabled={pending} onClick={() => run(() => setAdminAction(userId, !isAdmin))}>{isAdmin ? t("removeAdmin") : t("makeAdmin")}</Button>
      </div>
      {errors.length > 0 && <ViolationList violations={errors} />}
    </div>
  );
}
```

`src/app/(app)/admin/members/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { proposeRenewal } from "@/lib/membership";
import { romeDay } from "@/lib/time/rome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberForm } from "@/components/admin/member-form";
import { MemberActions } from "@/components/admin/member-actions";
import { prisma } from "@/server/db";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("members");
  const user = await prisma.user.findUnique({ where: { id }, include: { membership: { include: { renewals: { orderBy: { createdAt: "desc" } } } } } });
  if (!user) notFound();
  const today = romeDay(new Date());
  const m = user.membership;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{user.lastName} {user.firstName}</h1>
      <Card>
        <CardContent className="pt-6">
          <MemberForm
            userId={user.id}
            initial={{
              firstName: user.firstName, lastName: user.lastName, birthDate: user.birthDate ?? "", email: user.email, phone: user.phone ?? "",
              cardNumber: m?.number ?? "", issueDate: m?.issueDate ?? today, expiryDate: m?.expiryDate ?? today,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <MemberActions userId={user.id} isAdmin={user.isAdmin} hasMembership={!!m} proposedExpiry={m ? proposeRenewal(today, m.expiryDate).expiryDate : null} />
        </CardContent>
      </Card>
      {m && (
        <Card>
          <CardHeader><CardTitle>{t("renewals")}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {m.renewals.map((r) => <li key={r.id}>{r.issueDate} – {r.expiryDate}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

Task 14 aggiunge a questa pagina strike, insoluti, debito e storico delle prenotazioni.

Aggiungi `<Toaster />` di sonner a `src/app/layout.tsx` (dentro `NextIntlClientProvider`, dopo `{children}`):
```tsx
import { Toaster } from "@/components/ui/sonner";
// …
<NextIntlClientProvider>
  {children}
  <Toaster richColors />
</NextIntlClientProvider>
```

- [ ] **Step 8: Verifica e commit**

Run: `npm test` → PASS; `npm run lint` → nessun errore.
Verifica manuale: accedi come admin, crea un socio con email `" Test@Example.it "`, controlla che compaia `test@example.it` e "Da attivare". Rinnovagli la tessera e reimposta l'accesso.

```bash
git add -A
git commit -m "feat(admin): members and memberships with renewal history, reset access and admin promotion"
```

---

### Task 9: Calendario della disponibilità

**Files:**
- Create: `src/lib/calendar/grid.ts`, `src/lib/calendar/grid.test.ts`, `src/lib/calendar/free-starts.ts`, `src/lib/calendar/free-starts.test.ts`, `src/server/availability.ts`, `src/server/availability.test.ts`, `src/app/(app)/calendar/page.tsx`, `src/components/calendar/day-grid.tsx`, `src/components/calendar/day-picker.tsx`
- Modify: `messages/*.json`

**Interfaces:**
- Consumes: `romeInstant`, `romeMinutesOfDay`, `addDays`, `minutesToHHMM` (Task 4); `RuleSettings` (Task 5).
- Produces:
  ```ts
  // lib/calendar/grid.ts
  type BusyInterval = { startMin: number; endMin: number };
  quarterRows(openMinutes: number, closeMinutes: number): number[]    // [480, 495, …, 1365]
  overlaps(a: BusyInterval, b: BusyInterval): boolean
  // lib/calendar/free-starts.ts
  type FreeStart = { minute: number; maxSlots: number };
  freeStarts(p: { slotMinutes: number; settings: RuleSettings; busy: BusyInterval[]; notBeforeMinute?: number }): FreeStart[]
  // server/availability.ts
  type Viewer = { userId: string; isAdmin: boolean };
  type DayBooking = { id: string; fieldId: string; startMin: number; endMin: number; mine: boolean; memberName?: string };
  type DayAvailability = { day: string; fields: { id: string; name: string; sport: string; slotMinutes: number; priceCents: number }[]; bookings: DayBooking[] };
  getDayAvailability(db: Db, day: string, viewer: Viewer): Promise<DayAvailability>
  busyForField(db: Db, fieldId: string, day: string, excludeBookingId?: string): Promise<BusyInterval[]>
  ```
- `memberName` c'è **solo** se `viewer.isAdmin`: un socio non riceve mai i dati di altri soci, nemmeno nel payload.

- [ ] **Step 1: Test della griglia e degli orari liberi**

`src/lib/calendar/grid.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { overlaps, quarterRows } from "./grid";

describe("grid", () => {
  it("lists quarter rows from opening to the last quarter before closing", () => {
    const rows = quarterRows(480, 1380);
    expect(rows[0]).toBe(480);
    expect(rows.at(-1)).toBe(1365);
    expect(rows).toHaveLength(60);
  });
  it("treats touching intervals as not overlapping", () => {
    expect(overlaps({ startMin: 600, endMin: 660 }, { startMin: 660, endMin: 720 })).toBe(false);
    expect(overlaps({ startMin: 600, endMin: 660 }, { startMin: 645, endMin: 720 })).toBe(true);
  });
});
```

`src/lib/calendar/free-starts.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { RuleSettings } from "@/lib/booking-rules";
import { freeStarts } from "./free-starts";

const S: RuleSettings = { openMinutes: 480, closeMinutes: 1380, startStepMinutes: 15, maxAdvanceDays: 14, maxActiveBookings: 3, changeWindowMinutes: 120, maxSlotsPerBooking: 2 };

describe("freeStarts", () => {
  it("offers every 15 minutes on an empty field, with 2 slots when they fit", () => {
    const r = freeStarts({ slotMinutes: 60, settings: S, busy: [] });
    expect(r[0]).toEqual({ minute: 480, maxSlots: 2 });
    expect(r.find((x) => x.minute === 1260)).toEqual({ minute: 1260, maxSlots: 2 }); // 21:00–23:00
    expect(r.find((x) => x.minute === 1275)).toEqual({ minute: 1275, maxSlots: 1 }); // 21:15: solo 1h
    expect(r.at(-1)).toEqual({ minute: 1320, maxSlots: 1 }); // 22:00
  });
  it("skips starts that would overlap and limits the second slot", () => {
    const r = freeStarts({ slotMinutes: 60, settings: S, busy: [{ startMin: 600, endMin: 660 }] });
    expect(r.find((x) => x.minute === 555)).toBeUndefined(); // 09:15–10:15 si sovrappone
    expect(r.find((x) => x.minute === 540)).toEqual({ minute: 540, maxSlots: 1 }); // 09:00–10:00
    expect(r.find((x) => x.minute === 480)).toEqual({ minute: 480, maxSlots: 2 }); // 08:00–10:00
    expect(r.find((x) => x.minute === 660)).toEqual({ minute: 660, maxSlots: 2 });
  });
  it("hides starts already passed today", () => {
    const r = freeStarts({ slotMinutes: 60, settings: S, busy: [], notBeforeMinute: 600 });
    expect(r[0].minute).toBe(615);
  });
});
```

Run: `npm test -- src/lib/calendar` → FAIL (moduli mancanti).

- [ ] **Step 2: Implementa**

`src/lib/calendar/grid.ts`:
```ts
export type BusyInterval = { startMin: number; endMin: number };

export function quarterRows(openMinutes: number, closeMinutes: number): number[] {
  const rows: number[] = [];
  for (let m = openMinutes; m < closeMinutes; m += 15) rows.push(m);
  return rows;
}

export const overlaps = (a: BusyInterval, b: BusyInterval) => a.startMin < b.endMin && b.startMin < a.endMin;
```

`src/lib/calendar/free-starts.ts`:
```ts
import type { RuleSettings } from "@/lib/booking-rules";
import { overlaps, type BusyInterval } from "./grid";

export type FreeStart = { minute: number; maxSlots: number };

/** Orari di inizio liberi di un campo in un giorno. È solo un aiuto per l'interfaccia: il server riverifica tutto. */
export function freeStarts(p: { slotMinutes: number; settings: RuleSettings; busy: BusyInterval[]; notBeforeMinute?: number }): FreeStart[] {
  const { slotMinutes, settings: s, busy } = p;
  const out: FreeStart[] = [];
  for (let m = s.openMinutes; m < s.closeMinutes; m += s.startStepMinutes) {
    if (p.notBeforeMinute !== undefined && m <= p.notBeforeMinute) continue;
    let maxSlots = 0;
    for (let n = 1; n <= s.maxSlotsPerBooking; n++) {
      const interval = { startMin: m, endMin: m + n * slotMinutes };
      if (interval.endMin > s.closeMinutes || busy.some((b) => overlaps(b, interval))) break;
      maxSlots = n;
    }
    if (maxSlots > 0) out.push({ minute: m, maxSlots });
  }
  return out;
}
```

Run: `npm test -- src/lib/calendar` → PASS.

- [ ] **Step 3: Test della disponibilità lato server (privacy)**

`src/server/availability.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { createBooking, cancelBooking } from "./bookings";
import { busyForField, getDayAvailability } from "./availability";
import { makeField, makeMember, makeSettings, resetDb } from "../../tests/helpers/db";

const NOW = romeInstant("2026-11-02", 600);

describe("availability", () => {
  beforeEach(async () => {
    await resetDb();
    await makeSettings();
  });

  it("hides other members' identity from members and shows it to admins", async () => {
    const f = await makeField();
    const a = await makeMember();
    const b = await makeMember();
    await createBooking(prisma, { userId: a.id, mode: "member" }, a.id, { fieldId: f.id, start: romeInstant("2026-11-05", 600), slots: 1 }, NOW);

    const forB = await getDayAvailability(prisma, "2026-11-05", { userId: b.id, isAdmin: false });
    expect(forB.bookings).toHaveLength(1);
    expect(forB.bookings[0]).toEqual({ id: expect.any(String), fieldId: f.id, startMin: 600, endMin: 660, mine: false });
    expect(JSON.stringify(forB)).not.toContain(a.lastName);

    const forA = await getDayAvailability(prisma, "2026-11-05", { userId: a.id, isAdmin: false });
    expect(forA.bookings[0].mine).toBe(true);

    const forAdmin = await getDayAvailability(prisma, "2026-11-05", { userId: b.id, isAdmin: true });
    expect(forAdmin.bookings[0].memberName).toBe(`${a.firstName} ${a.lastName}`);
  });

  it("ignores cancelled bookings and other days", async () => {
    const f = await makeField();
    const a = await makeMember();
    const bk = await createBooking(prisma, { userId: a.id, mode: "member" }, a.id, { fieldId: f.id, start: romeInstant("2026-11-05", 600), slots: 1 }, NOW);
    await createBooking(prisma, { userId: a.id, mode: "member" }, a.id, { fieldId: f.id, start: romeInstant("2026-11-06", 600), slots: 1 }, NOW);
    await cancelBooking(prisma, { userId: a.id, mode: "member" }, bk.id, undefined, NOW);
    expect((await getDayAvailability(prisma, "2026-11-05", { userId: a.id, isAdmin: false })).bookings).toHaveLength(0);
    expect(await busyForField(prisma, f.id, "2026-11-06")).toEqual([{ startMin: 600, endMin: 660 }]);
  });
});
```

Run: `npm test -- src/server/availability` → FAIL.

- [ ] **Step 4: Implementa `availability.ts`**

`src/server/availability.ts`:
```ts
import type { BusyInterval } from "@/lib/calendar/grid";
import { addDays, romeInstant, romeMinutesOfDay } from "@/lib/time/rome";
import type { Db } from "./db";

export type Viewer = { userId: string; isAdmin: boolean };
export type DayBooking = { id: string; fieldId: string; startMin: number; endMin: number; mine: boolean; memberName?: string };
export type DayAvailability = {
  day: string;
  fields: { id: string; name: string; sport: string; slotMinutes: number; priceCents: number }[];
  bookings: DayBooking[];
};

const dayRange = (day: string) => ({ gte: romeInstant(day, 0), lt: romeInstant(addDays(day, 1), 0) });
// Le prenotazioni finiscono entro le 23:00, quindi la fine cade sempre nello stesso giorno.
const toInterval = (b: { start: Date; end: Date }): BusyInterval => ({ startMin: romeMinutesOfDay(b.start), endMin: romeMinutesOfDay(b.end) });

export async function getDayAvailability(db: Db, day: string, viewer: Viewer): Promise<DayAvailability> {
  const [fields, bookings] = await Promise.all([
    db.field.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.booking.findMany({
      where: { status: "CONFIRMED", start: dayRange(day) },
      include: viewer.isAdmin ? { member: { select: { firstName: true, lastName: true } } } : undefined,
      orderBy: { start: "asc" },
    }),
  ]);
  return {
    day,
    fields: fields.map(({ id, name, sport, slotMinutes, priceCents }) => ({ id, name, sport, slotMinutes, priceCents })),
    bookings: bookings.map((b) => {
      const base: DayBooking = { id: b.id, fieldId: b.fieldId, ...toInterval(b), mine: b.memberId === viewer.userId };
      if (viewer.isAdmin && "member" in b) {
        const m = b.member as { firstName: string; lastName: string };
        base.memberName = `${m.firstName} ${m.lastName}`;
      }
      return base;
    }),
  };
}

export async function busyForField(db: Db, fieldId: string, day: string, excludeBookingId?: string): Promise<BusyInterval[]> {
  const rows = await db.booking.findMany({
    where: { fieldId, status: "CONFIRMED", start: dayRange(day), ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}) },
    select: { start: true, end: true },
  });
  return rows.map(toInterval);
}
```

Run: `npm test -- src/server/availability` → PASS.

- [ ] **Step 5: Messaggi del calendario**

IT, namespace `calendar`:
```json
"calendar": { "title": "Disponibilità", "free": "Libero", "busy": "Occupato", "mine": "Tua", "today": "Oggi", "prev": "Giorno precedente", "next": "Giorno successivo", "field": "Campo", "time": "Ora", "legend": "Tocca uno slot libero per prenotare." }
```
EN:
```json
"calendar": { "title": "Availability", "free": "Free", "busy": "Taken", "mine": "Yours", "today": "Today", "prev": "Previous day", "next": "Next day", "field": "Court", "time": "Time", "legend": "Tap a free slot to book it." }
```

- [ ] **Step 6: Pagina e componenti del calendario**

`src/app/(app)/calendar/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { quarterRows } from "@/lib/calendar/grid";
import { romeDay } from "@/lib/time/rome";
import { DayGrid } from "@/components/calendar/day-grid";
import { DayPicker } from "@/components/calendar/day-picker";
import { getDayAvailability } from "@/server/availability";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

const isDay = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ day?: string; field?: string }> }) {
  const user = await requireUser();
  const t = await getTranslations("calendar");
  const sp = await searchParams;
  const day = isDay(sp.day) ? sp.day! : romeDay(new Date());
  const [availability, settings] = await Promise.all([getDayAvailability(prisma, day, { userId: user.id, isAdmin: user.isAdmin }), getSettings(prisma)]);
  const selectedField = availability.fields.find((f) => f.id === sp.field)?.id ?? availability.fields[0]?.id;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <DayPicker day={day} today={romeDay(new Date())} fields={availability.fields} selectedField={selectedField} />
      <p className="text-sm text-muted-foreground">{t("legend")}</p>
      <DayGrid availability={availability} rows={quarterRows(settings.openMinutes, settings.closeMinutes)} selectedField={selectedField} isAdmin={user.isAdmin} />
    </div>
  );
}
```

`src/components/calendar/day-picker.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays } from "@/lib/time/rome";

export function DayPicker({ day, today, fields, selectedField }: { day: string; today: string; fields: { id: string; name: string }[]; selectedField?: string }) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  const router = useRouter();
  const href = (d: string, f = selectedField) => `/calendar?day=${d}${f ? `&field=${f}` : ""}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" asChild aria-label={t("prev")}><Link href={href(addDays(day, -1))}><ChevronLeft /></Link></Button>
      <Input type="date" value={day} onChange={(e) => e.target.value && router.push(href(e.target.value))} className="w-44" />
      <Button variant="outline" size="icon" asChild aria-label={t("next")}><Link href={href(addDays(day, 1))}><ChevronRight /></Link></Button>
      {day !== today && <Button variant="ghost" asChild><Link href={href(today)}>{t("today")}</Link></Button>}
      <span className="text-sm font-medium">{format.dateTime(new Date(`${day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" })}</span>
      {/* Su telefono si vede un campo alla volta. */}
      <select
        aria-label={t("field")}
        className="h-9 rounded-md border bg-background px-2 text-sm md:hidden"
        value={selectedField}
        onChange={(e) => router.push(href(day, e.target.value))}
      >
        {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
    </div>
  );
}
```

`src/components/calendar/day-grid.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { minutesToHHMM } from "@/lib/time/rome";
import type { DayAvailability } from "@/server/availability";

export function DayGrid({ availability, rows, selectedField, isAdmin }: { availability: DayAvailability; rows: number[]; selectedField?: string; isAdmin: boolean }) {
  const t = useTranslations("calendar");
  const { fields, bookings, day } = availability;
  const at = (fieldId: string, minute: number) => bookings.find((b) => b.fieldId === fieldId && b.startMin <= minute && minute < b.endMin);
  const hideOnMobile = (id: string) => (id === selectedField ? "" : "hidden md:table-cell");
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-card">
          <tr>
            <th className="w-16 p-2 text-left font-medium">{t("time")}</th>
            {fields.map((f) => <th key={f.id} className={cn("p-2 text-left font-medium", hideOnMobile(f.id))}>{f.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((minute) => (
            <tr key={minute} className={minute % 60 === 0 ? "border-t" : ""}>
              <td className="p-1 pl-2 align-top text-xs tabular-nums text-muted-foreground">{minute % 60 === 0 ? minutesToHHMM(minute) : ""}</td>
              {fields.map((f) => {
                const b = at(f.id, minute);
                const first = b && b.startMin === minute;
                if (b) {
                  const label = isAdmin ? b.memberName : b.mine ? t("mine") : t("busy");
                  return (
                    <td key={f.id} className={cn("h-6 px-2 text-xs", hideOnMobile(f.id), b.mine ? "bg-primary/80 text-primary-foreground" : "bg-muted-foreground/25")}>
                      {first ? label : ""}
                    </td>
                  );
                }
                return (
                  <td key={f.id} className={cn("h-6 p-0", hideOnMobile(f.id))}>
                    <Link
                      href={`/book?field=${f.id}&day=${day}&time=${minute}`}
                      className="block h-full w-full hover:bg-emerald-500/20 focus-visible:bg-emerald-500/30"
                      aria-label={`${f.name} ${minutesToHHMM(minute)} ${t("free")}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Verifica e commit**

Run: `npm test` → PASS; `npm run lint` → OK.
Verifica manuale: `/calendar` mostra 5 colonne su desktop. Con la finestra stretta (< 768 px) si vede un campo solo e il selettore. Un socio vede "Occupato" o "Tua", l'admin vede i nomi.

```bash
git add -A
git commit -m "feat(calendar): day availability grid with privacy-safe payload and mobile field selector"
```

---

### Task 10: Prenotazione guidata, le mie prenotazioni e profilo

**Files:**
- Create: `src/app/(app)/book/page.tsx`, `src/app/(app)/book/actions.ts`, `src/components/booking/booking-wizard.tsx`, `src/app/(app)/bookings/page.tsx`, `src/app/(app)/bookings/[id]/edit/page.tsx`, `src/components/booking/cancel-button.tsx`, `src/app/(app)/profile/page.tsx`, `src/components/money.tsx`
- Modify: `messages/*.json`

**Interfaces:**
- Consumes: `createBooking`, `updateBooking`, `cancelBooking`, `Actor` (Task 6); `busyForField`, `getDayAvailability` (Task 9); `freeStarts` (Task 9); `runAction`, `requireUser` (Task 7); `canMemberChange` (Task 5).
- Produces:
  ```ts
  // book/actions.ts (Server Actions)
  freeStartsAction(p: { fieldId: string; day: string; excludeBookingId?: string }): Promise<FreeStart[]>
  submitBookingAction(p: { bookingId?: string; memberId?: string; mode: "member" | "admin"; fieldId: string; day: string; minute: number; slots: number }): Promise<ActionResult<{ id: string }>>
  cancelBookingAction(p: { bookingId: string; reason?: string; mode: "member" | "admin" }): Promise<ActionResult>
  // components
  <BookingWizard fields initial mode bookingId? memberId? maxSlots />
  <Money cents={number} />
  ```
- `mode: "admin"` è accettato solo se l'utente è admin (controllo sul server); in caso contrario si torna a `"member"` con `memberId = user.id`. Task 14 riusa il wizard in modalità admin.

- [ ] **Step 1: Messaggi**

IT, namespace `wizard`, `bookings`, `profile`:
```json
"wizard": {
  "title": "Prenota", "editTitle": "Modifica prenotazione", "stepField": "1. Campo", "stepDay": "2. Giorno", "stepTime": "3. Orario", "stepDuration": "4. Durata", "stepSummary": "5. Riepilogo",
  "noTimes": "Nessun orario libero in questo giorno.", "slots": "{count, plural, one {1 slot} other {# slot}} · {minutes} min",
  "summary": "{field}, {date} dalle {from} alle {to}", "price": "Prezzo", "confirm": "Conferma prenotazione", "confirmEdit": "Salva modifiche",
  "member": "Socio", "done": "Prenotazione confermata", "doneEdit": "Prenotazione modificata"
},
"bookings": {
  "title": "Le mie prenotazioni", "upcoming": "Prossime", "history": "Storico", "empty": "Nessuna prenotazione.",
  "edit": "Modifica", "cancel": "Cancella", "cancelTitle": "Cancellare la prenotazione?", "reason": "Motivo (facoltativo)",
  "cancelled": "Cancellata", "lateNotice": "Mancano meno di {hours} ore: non è più possibile modificarla o cancellarla.",
  "status": { "CONFIRMED": "Confermata", "CANCELLED": "Cancellata" },
  "payment": { "PENDING": "Da registrare", "PAID": "Pagata", "UNPAID": "Non pagata", "EXEMPT": "Esente" },
  "done": "Prenotazione cancellata"
},
"profile": { "title": "Profilo", "card": "Tessera", "number": "Numero", "expires": "Scade il {date}", "daysLeft": "{days, plural, =0 {Scade oggi} one {Manca 1 giorno} other {Mancano # giorni}}", "expired": "Scaduta il {date}", "noCard": "Nessuna tessera registrata", "data": "Dati personali" }
```
EN:
```json
"wizard": {
  "title": "Book", "editTitle": "Change booking", "stepField": "1. Court", "stepDay": "2. Day", "stepTime": "3. Time", "stepDuration": "4. Duration", "stepSummary": "5. Summary",
  "noTimes": "No free times on this day.", "slots": "{count, plural, one {1 slot} other {# slots}} · {minutes} min",
  "summary": "{field}, {date} from {from} to {to}", "price": "Price", "confirm": "Confirm booking", "confirmEdit": "Save changes",
  "member": "Member", "done": "Booking confirmed", "doneEdit": "Booking changed"
},
"bookings": {
  "title": "My bookings", "upcoming": "Upcoming", "history": "History", "empty": "No bookings.",
  "edit": "Change", "cancel": "Cancel", "cancelTitle": "Cancel this booking?", "reason": "Reason (optional)",
  "cancelled": "Cancelled", "lateNotice": "Less than {hours} hours left: it can no longer be changed or cancelled.",
  "status": { "CONFIRMED": "Confirmed", "CANCELLED": "Cancelled" },
  "payment": { "PENDING": "To record", "PAID": "Paid", "UNPAID": "Unpaid", "EXEMPT": "Exempt" },
  "done": "Booking cancelled"
},
"profile": { "title": "Profile", "card": "Membership card", "number": "Number", "expires": "Expires on {date}", "daysLeft": "{days, plural, =0 {Expires today} one {1 day left} other {# days left}}", "expired": "Expired on {date}", "noCard": "No card registered", "data": "Personal data" }
```

Nota: il test di parità dei placeholder di Task 2 prende anche `count` e `days` dentro i plurali: vanno tenuti uguali nelle due lingue.

- [ ] **Step 2: Server Action**

`src/app/(app)/book/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { freeStarts } from "@/lib/calendar/free-starts";
import { romeDay, romeInstant, romeMinutesOfDay } from "@/lib/time/rome";
import { runAction } from "@/server/action-result";
import { busyForField } from "@/server/availability";
import { cancelBooking, createBooking, updateBooking, type Actor } from "@/server/bookings";
import { prisma } from "@/server/db";
import { fail } from "@/server/errors";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function freeStartsAction(p: { fieldId: string; day: string; excludeBookingId?: string }) {
  await requireUser();
  if (!day.safeParse(p.day).success) return [];
  const [field, settings] = await Promise.all([prisma.field.findUnique({ where: { id: p.fieldId } }), getSettings(prisma)]);
  if (!field) return [];
  const now = new Date();
  const today = romeDay(now);
  if (p.day < today) return [];
  return freeStarts({
    slotMinutes: field.slotMinutes,
    settings,
    busy: await busyForField(prisma, field.id, p.day, p.excludeBookingId),
    notBeforeMinute: p.day === today ? romeMinutesOfDay(now) : undefined,
  });
}

const submitSchema = z.object({
  bookingId: z.string().optional(),
  memberId: z.string().optional(),
  mode: z.enum(["member", "admin"]),
  fieldId: z.string().min(1),
  day,
  minute: z.number().int().min(0).max(1439),
  slots: z.number().int(),
});

export async function submitBookingAction(raw: z.input<typeof submitSchema>) {
  const user = await requireUser();
  return runAction(async () => {
    const p = submitSchema.safeParse(raw);
    if (!p.success) return fail("INVALID_INPUT");
    const v = p.data;
    // Solo un admin può agire come admin; un socio prenota sempre per sé.
    const actor: Actor = { userId: user.id, mode: v.mode === "admin" && user.isAdmin ? "admin" : "member" };
    const memberId = actor.mode === "admin" && v.memberId ? v.memberId : user.id;
    const input = { fieldId: v.fieldId, start: romeInstant(v.day, v.minute), slots: v.slots };
    const booking = v.bookingId ? await updateBooking(prisma, actor, v.bookingId, input) : await createBooking(prisma, actor, memberId, input);
    revalidatePath("/calendar");
    revalidatePath("/bookings");
    return { id: booking.id };
  });
}

export async function cancelBookingAction(p: { bookingId: string; reason?: string; mode: "member" | "admin" }) {
  const user = await requireUser();
  return runAction(async () => {
    const actor: Actor = { userId: user.id, mode: p.mode === "admin" && user.isAdmin ? "admin" : "member" };
    await cancelBooking(prisma, actor, p.bookingId, p.reason?.slice(0, 500));
    revalidatePath("/calendar");
    revalidatePath("/bookings");
    return null;
  });
}
```

- [ ] **Step 3: Componente `Money` e wizard**

`src/components/money.tsx`:
```tsx
"use client";

import { useFormatter } from "next-intl";

export function Money({ cents }: { cents: number }) {
  const format = useFormatter();
  return <>{format.number(cents / 100, { style: "currency", currency: "EUR" })}</>;
}
```

`src/components/booking/booking-wizard.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/money";
import { ViolationList } from "@/components/violation-list";
import type { Violation } from "@/lib/booking-rules";
import type { FreeStart } from "@/lib/calendar/free-starts";
import { minutesToHHMM } from "@/lib/time/rome";
import { cn } from "@/lib/utils";
import { freeStartsAction, submitBookingAction } from "@/app/(app)/book/actions";

export type WizardField = { id: string; name: string; slotMinutes: number; priceCents: number };

export function BookingWizard(props: {
  fields: WizardField[];
  initial: { fieldId?: string; day: string; minute?: number; slots?: number };
  minDay: string;
  maxDay?: string;
  maxSlots: number;
  mode: "member" | "admin";
  bookingId?: string;
  members?: { id: string; name: string }[];
}) {
  const t = useTranslations("wizard");
  const format = useFormatter();
  const router = useRouter();
  const [fieldId, setFieldId] = useState(props.initial.fieldId ?? props.fields[0]?.id ?? "");
  const [day, setDay] = useState(props.initial.day);
  const [minute, setMinute] = useState<number | undefined>(props.initial.minute);
  const [slots, setSlots] = useState(props.initial.slots ?? 1);
  const [memberId, setMemberId] = useState(props.members?.[0]?.id);
  const [starts, setStarts] = useState<FreeStart[]>([]);
  const [errors, setErrors] = useState<Violation[]>([]);
  const [loading, startLoading] = useTransition();
  const [submitting, startSubmit] = useTransition();

  const field = props.fields.find((f) => f.id === fieldId);
  const chosen = starts.find((s) => s.minute === minute);

  const key = `${fieldId}|${day}`;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    startLoading(async () => {
      setStarts(await freeStartsAction({ fieldId, day, excludeBookingId: props.bookingId }));
      setLoadedFor(`${fieldId}|${day}`);
    });
  }, [fieldId, day, props.bookingId]);

  // Se l'orario scelto non è libero per il campo e il giorno appena caricati, si toglie la selezione.
  // Prima del primo caricamento non si tocca nulla, così l'orario arrivato dal calendario resta selezionato.
  useEffect(() => {
    if (loadedFor !== key) return;
    if (minute !== undefined && !starts.some((s) => s.minute === minute)) setMinute(undefined);
    if (chosen && slots > chosen.maxSlots) setSlots(chosen.maxSlots);
  }, [loadedFor, key, starts, minute, chosen, slots]);

  const submit = () =>
    startSubmit(async () => {
      if (minute === undefined) return;
      const r = await submitBookingAction({ bookingId: props.bookingId, memberId, mode: props.mode, fieldId, day, minute, slots });
      if (r.ok) {
        toast.success(props.bookingId ? t("doneEdit") : t("done"));
        router.push(props.mode === "admin" ? "/admin/bookings" : "/bookings");
      } else {
        setErrors(r.violations);
        setStarts(await freeStartsAction({ fieldId, day, excludeBookingId: props.bookingId }));
      }
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        {props.members && (
          <Card>
            <CardHeader><CardTitle className="text-base">{t("member")}</CardTitle></CardHeader>
            <CardContent>
              <select className="h-9 w-full rounded-md border bg-background px-2" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                {props.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("stepField")}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {props.fields.map((f) => (
              <Button key={f.id} variant={f.id === fieldId ? "default" : "outline"} onClick={() => setFieldId(f.id)}>{f.name}</Button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("stepDay")}</CardTitle></CardHeader>
          <CardContent>
            <Input type="date" value={day} min={props.minDay} max={props.maxDay} onChange={(e) => e.target.value && setDay(e.target.value)} className="w-44" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("stepTime")}</CardTitle></CardHeader>
          <CardContent>
            {!loading && starts.length === 0 && <p className="text-sm text-muted-foreground">{t("noTimes")}</p>}
            <div className={cn("grid grid-cols-4 gap-2 sm:grid-cols-6", loading && "opacity-50")}>
              {starts.map((s) => (
                <Button key={s.minute} size="sm" variant={s.minute === minute ? "default" : "outline"} className="tabular-nums" onClick={() => setMinute(s.minute)}>
                  {minutesToHHMM(s.minute)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("stepDuration")}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {field &&
              Array.from({ length: props.maxSlots }, (_, i) => i + 1).map((n) => (
                <Button key={n} variant={n === slots ? "default" : "outline"} disabled={!chosen || n > chosen.maxSlots} onClick={() => setSlots(n)}>
                  {t("slots", { count: n, minutes: n * field.slotMinutes })}
                </Button>
              ))}
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader><CardTitle className="text-base">{t("stepSummary")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {field && minute !== undefined && (
            <>
              <p className="text-sm">
                {t("summary", {
                  field: field.name,
                  date: format.dateTime(new Date(`${day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" }),
                  from: minutesToHHMM(minute),
                  to: minutesToHHMM(minute + slots * field.slotMinutes),
                })}
              </p>
              <p className="text-2xl font-semibold"><span className="sr-only">{t("price")}</span><Money cents={field.priceCents * slots} /></p>
            </>
          )}
          {errors.length > 0 && <ViolationList violations={errors} />}
          <Button className="w-full" disabled={minute === undefined || submitting} onClick={submit}>
            {props.bookingId ? t("confirmEdit") : t("confirm")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Pagine prenota, le mie prenotazioni, modifica**

`src/app/(app)/book/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { addDays, romeDay } from "@/lib/time/rome";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ field?: string; day?: string; time?: string }> }) {
  await requireUser();
  const t = await getTranslations("wizard");
  const sp = await searchParams;
  const [fields, settings] = await Promise.all([prisma.field.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), getSettings(prisma)]);
  const today = romeDay(new Date());
  const minute = sp.time ? Number(sp.time) : undefined;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <BookingWizard
        fields={fields}
        initial={{ fieldId: sp.field, day: sp.day && sp.day >= today ? sp.day : today, minute: Number.isInteger(minute) ? minute : undefined }}
        minDay={today}
        maxDay={addDays(today, settings.maxAdvanceDays)}
        maxSlots={settings.maxSlotsPerBooking}
        mode="member"
      />
    </div>
  );
}
```

`src/components/booking/cancel-button.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ViolationList } from "@/components/violation-list";
import type { Violation } from "@/lib/booking-rules";
import { cancelBookingAction } from "@/app/(app)/book/actions";

export function CancelButton({ bookingId, mode, defaultReason = "" }: { bookingId: string; mode: "member" | "admin"; defaultReason?: string }) {
  const t = useTranslations("bookings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(defaultReason);
  const [errors, setErrors] = useState<Violation[]>([]);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">{t("cancel")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("cancelTitle")}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`reason-${bookingId}`}>{t("reason")}</Label>
          <Textarea id={`reason-${bookingId}`} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
        </div>
        {errors.length > 0 && <ViolationList violations={errors} />}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{tc("back")}</Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await cancelBookingAction({ bookingId, reason, mode });
                if (r.ok) {
                  toast.success(t("done"));
                  setOpen(false);
                  router.refresh();
                } else setErrors(r.violations);
              })
            }
          >
            {tc("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

`src/app/(app)/bookings/page.tsx`:
```tsx
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { canMemberChange } from "@/lib/booking-rules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CancelButton } from "@/components/booking/cancel-button";
import { Money } from "@/components/money";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export default async function MyBookingsPage() {
  const user = await requireUser();
  const t = await getTranslations("bookings");
  const format = await getFormatter();
  const now = new Date();
  const [settings, bookings] = await Promise.all([
    getSettings(prisma),
    prisma.booking.findMany({ where: { memberId: user.id }, include: { field: true }, orderBy: { start: "desc" }, take: 200 }),
  ]);
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && b.end > now).reverse();
  const history = bookings.filter((b) => !upcoming.includes(b));
  const when = (b: (typeof bookings)[number]) =>
    `${format.dateTime(b.start, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} – ${format.dateTime(b.end, { hour: "2-digit", minute: "2-digit" })}`;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("upcoming")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
          {upcoming.map((b) => {
            const changeable = canMemberChange(b.start, now, settings);
            return (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <p className="font-medium">{b.field.name}</p>
                  <p className="text-sm text-muted-foreground">{when(b)} · <Money cents={b.priceCents} /></p>
                  {!changeable && <p className="text-xs text-muted-foreground">{t("lateNotice", { hours: settings.changeWindowMinutes / 60 })}</p>}
                </div>
                {changeable && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild><Link href={`/bookings/${b.id}/edit`}>{t("edit")}</Link></Button>
                    <CancelButton bookingId={b.id} mode="member" />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("history")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
          {history.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
              <span>{b.field.name} · {when(b)}</span>
              <span className="flex gap-1">
                <Badge variant={b.status === "CANCELLED" ? "outline" : "secondary"}>{t(`status.${b.status as "CONFIRMED" | "CANCELLED"}`)}</Badge>
                {b.chargeable && <Badge variant={b.paymentStatus === "UNPAID" ? "destructive" : "secondary"}>{t(`payment.${b.paymentStatus as "PENDING" | "PAID" | "UNPAID" | "EXEMPT"}`)}</Badge>}
              </span>
              {b.cancelReason && <p className="w-full text-xs text-muted-foreground">{b.cancelReason}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

`src/app/(app)/bookings/[id]/edit/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { addDays, romeDay, romeMinutesOfDay } from "@/lib/time/rome";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { getSettings } from "@/server/settings";

export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const t = await getTranslations("wizard");
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.memberId !== user.id || booking.status !== "CONFIRMED") notFound();
  const [fields, settings] = await Promise.all([prisma.field.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), getSettings(prisma)]);
  const today = romeDay(new Date());
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("editTitle")}</h1>
      <BookingWizard
        fields={fields}
        initial={{ fieldId: booking.fieldId, day: romeDay(booking.start), minute: romeMinutesOfDay(booking.start), slots: booking.slots }}
        minDay={today}
        maxDay={addDays(today, settings.maxAdvanceDays)}
        maxSlots={settings.maxSlotsPerBooking}
        mode="member"
        bookingId={booking.id}
      />
    </div>
  );
}
```

- [ ] **Step 5: Profilo**

`src/app/(app)/profile/page.tsx`:
```tsx
import { getFormatter, getTranslations } from "next-intl/server";
import { daysUntilExpiry } from "@/lib/membership";
import { romeDay } from "@/lib/time/rome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/guards";

export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslations("profile");
  const tm = await getTranslations("members");
  const format = await getFormatter();
  const m = user.membership;
  const date = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { dateStyle: "long" });
  const days = m ? daysUntilExpiry(m.expiryDate, romeDay(new Date())) : null;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("card")}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {!m && <p>{t("noCard")}</p>}
          {m && <p>{t("number")}: <span className="font-mono">{m.number}</span></p>}
          {m && days !== null && days >= 0 && <p>{t("expires", { date: date(m.expiryDate) })} · {t("daysLeft", { days })}</p>}
          {m && days !== null && days < 0 && <p className="text-destructive">{t("expired", { date: date(m.expiryDate) })}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("data")}</CardTitle></CardHeader>
        <CardContent className="grid gap-1 text-sm sm:grid-cols-2">
          <p>{tm("firstName")}: {user.firstName}</p>
          <p>{tm("lastName")}: {user.lastName}</p>
          <p>{tm("email")}: {user.email}</p>
          {user.phone && <p>{tm("phone")}: {user.phone}</p>}
          {user.birthDate && <p>{tm("birthDate")}: {date(user.birthDate)}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Verifica e commit**

Run: `npm test` → PASS; `npm run lint` → OK; `npm run build` → OK.
Verifica manuale, come `giulia@example.it`:
1. Dal calendario tocca uno slot libero: il wizard si apre già compilato. Conferma e controlla che compaia in "Le mie prenotazioni" e come "Tua" nel calendario.
2. Apri lo stesso slot in due schede e conferma in entrambe: la seconda mostra "Questo orario è già occupato." (nessun errore 500).
3. Crea 3 prenotazioni; la quarta mostra "Hai già 3 prenotazioni attive."
4. Modifica una prenotazione spostandola di 15 minuti: riesce.
5. Come `sara@example.it` (tessera scaduta) la prenotazione viene rifiutata con il messaggio sulla tessera.

```bash
git add -A
git commit -m "feat(booking): guided booking wizard, my bookings with edit/cancel, profile page"
```

---

### Task 11: Chiusura della Sessione 1

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Verifica completa**

Run: `npm test` → tutti PASS. `npm run lint` → 0 errori. `npm run build` → OK.

- [ ] **Step 2: README**

Aggiungi a `README.md`:
```markdown
## Architettura

- `src/lib/**`: logica pura (regole di prenotazione, fuso orario, calendario, statistiche), testata in isolamento.
- `src/server/**`: servizi con Prisma; ogni operazione di prenotazione gira in una transazione.
- `src/app/**`: pagine e Server Action (App Router). Le action chiamano i servizi e restituiscono `ActionResult`.
- Nessuna doppia prenotazione: la tabella `FieldOccupancy` ha una riga per ogni quarto d'ora occupato con chiave primaria `(fieldId, quarterStart)`.
- Tutte le regole temporali sono calcolate sul server in Europe/Rome.
- Testi: `messages/it.json` e `messages/en.json` (stesse chiavi, verificate da `tests/i18n.test.ts`).

## Stack

Next.js 15, Prisma + SQLite, Auth.js (credenziali, JWT), next-intl, Tailwind + shadcn/ui, Recharts, Vitest.
```

- [ ] **Step 3: Commit e push (con conferma)**

```bash
git add -A
git commit -m "docs: README architecture section for session 1"
```

Il primo push è già stato fatto (23/10/2026): fai push direttamente.
```bash
git push -u origin main
```
Se il remoto ha già dei commit (per esempio un README creato da GitHub), fai `git pull --rebase origin main`, risolvi eventuali conflitti e rifai il push. **Mai** `--force`.

---

# PARTE 2 – Sessione 2: gestione, notifiche e rifinitura

All'inizio della Sessione 2: `git pull`, `npm install`, `npm run db:setup` (se il database locale manca), `npm test` → tutto verde prima di iniziare.

### Task 12: Pagamenti e strike

**Files:**
- Create: `src/server/payments.ts`, `src/server/payments.test.ts`

**Interfaces:**
- Consumes: `isBlocked`, `strikeConsequence` (Task 5); `releaseOccupancy` (Task 6); `notify` (Task 6); `fail` (Task 6).
- Produces:
  ```ts
  type PaymentStatus = "PAID" | "UNPAID" | "EXEMPT";
  setPaymentStatus(db: Db, bookingId: string, status: PaymentStatus, now?: Date): Promise<void>
  setNoShow(db: Db, bookingId: string, noShow: boolean): Promise<void>
  pendingPayments(db: Db, now?: Date): Promise<(Booking & { field: Field; member: User })[]>
  memberAccount(db: Db, memberId: string): Promise<{ strikes: number; unpaid: number; debtCents: number; blocked: boolean }>
  ```
- Regole (spec §6, §8):
  - `UNPAID` crea uno strike (al massimo uno per prenotazione). Se è il 1° → `STRIKE_WARNING`; dal 2° in poi → blocco: tutte le prenotazioni `CONFIRMED` del socio con **inizio nel futuro** diventano `CANCELLED`, `chargeable=false`, `cancelledById=null`, poi una notifica `BOOKING_CANCELLED_BLOCK` per ognuna e una `ACCOUNT_BLOCKED`.
  - `UNPAID` → `EXEMPT` cancella lo strike. `UNPAID` → `PAID` lo lascia.
  - Se il socio era bloccato e dopo la modifica non lo è più → `ACCOUNT_UNBLOCKED`.
  - Se si rimette a `UNPAID` una prenotazione che ha già uno strike (es. `PAID` per errore e poi corretta), non si crea un secondo strike, ma se il socio torna bloccato scatta comunque il blocco.
  - Si possono registrare solo prenotazioni concluse (`end ≤ now`) e da pagare (`chargeable = true`), altrimenti `INVALID_INPUT`.

- [ ] **Step 1: Scrivi i test**

`src/server/payments.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { DomainError } from "./errors";
import { createBooking, cancelBooking } from "./bookings";
import { memberAccount, pendingPayments, setPaymentStatus } from "./payments";
import { makeAdmin, makeField, makeMember, makeSettings, resetDb } from "../../tests/helpers/db";

const NOW = romeInstant("2026-11-10", 12 * 60);
let fieldId: string;

/** Prenotazione già conclusa, creata direttamente nel DB. */
async function pastBooking(memberId: string, day: string) {
  return prisma.booking.create({
    data: { memberId, fieldId, start: romeInstant(day, 600), end: romeInstant(day, 660), slots: 1, priceCents: 1800 },
  });
}
const types = async (userId: string) => (await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })).map((n) => n.type);

describe("payments and strikes", () => {
  beforeEach(async () => {
    await resetDb();
    await makeSettings();
    fieldId = (await makeField()).id;
  });

  it("first unpaid booking gives a warning, not a block", async () => {
    const m = await makeMember();
    const b = await pastBooking(m.id, "2026-11-01");
    await setPaymentStatus(prisma, b.id, "UNPAID", NOW);
    expect(await memberAccount(prisma, m.id)).toEqual({ strikes: 1, unpaid: 1, debtCents: 1800, blocked: false });
    expect(await types(m.id)).toContain("STRIKE_WARNING");
  });

  it("second unpaid booking blocks and cancels future bookings only", async () => {
    const m = await makeMember();
    const b1 = await pastBooking(m.id, "2026-11-01");
    const b2 = await pastBooking(m.id, "2026-11-02");
    const future = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId, start: romeInstant("2026-11-12", 600), slots: 1 }, NOW);
    // Prenotazione in corso adesso: non va toccata.
    const ongoing = await prisma.booking.create({
      data: { memberId: m.id, fieldId, start: romeInstant("2026-11-10", 690), end: romeInstant("2026-11-10", 750), slots: 1, priceCents: 1800 },
    });
    await setPaymentStatus(prisma, b1.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b2.id, "UNPAID", NOW);

    const acc = await memberAccount(prisma, m.id);
    expect(acc).toMatchObject({ strikes: 2, unpaid: 2, debtCents: 3600, blocked: true });
    const f = await prisma.booking.findUniqueOrThrow({ where: { id: future.id } });
    expect(f).toMatchObject({ status: "CANCELLED", chargeable: false, cancelledById: null });
    expect(await prisma.fieldOccupancy.count({ where: { bookingId: future.id } })).toBe(0);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: ongoing.id } })).status).toBe("CONFIRMED");
    expect(await types(m.id)).toEqual(expect.arrayContaining(["ACCOUNT_BLOCKED", "BOOKING_CANCELLED_BLOCK"]));
  });

  it("unblocks only when every unpaid booking is paid, strikes stay", async () => {
    const m = await makeMember();
    const b1 = await pastBooking(m.id, "2026-11-01");
    const b2 = await pastBooking(m.id, "2026-11-02");
    await setPaymentStatus(prisma, b1.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b2.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b1.id, "PAID", NOW);
    expect((await memberAccount(prisma, m.id)).blocked).toBe(true);
    await setPaymentStatus(prisma, b2.id, "PAID", NOW);
    expect(await memberAccount(prisma, m.id)).toEqual({ strikes: 2, unpaid: 0, debtCents: 0, blocked: false });
    expect(await types(m.id)).toContain("ACCOUNT_UNBLOCKED");
  });

  it("a third unpaid booking blocks again immediately", async () => {
    const m = await makeMember();
    const [b1, b2, b3] = [await pastBooking(m.id, "2026-11-01"), await pastBooking(m.id, "2026-11-02"), await pastBooking(m.id, "2026-11-03")];
    for (const b of [b1, b2]) await setPaymentStatus(prisma, b.id, "UNPAID", NOW);
    for (const b of [b1, b2]) await setPaymentStatus(prisma, b.id, "PAID", NOW);
    const future = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId, start: romeInstant("2026-11-12", 600), slots: 1 }, NOW);
    await setPaymentStatus(prisma, b3.id, "UNPAID", NOW);
    expect(await memberAccount(prisma, m.id)).toMatchObject({ strikes: 3, blocked: true });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: future.id } })).status).toBe("CANCELLED");
  });

  it("correcting UNPAID to EXEMPT removes the strike", async () => {
    const m = await makeMember();
    const b = await pastBooking(m.id, "2026-11-01");
    await setPaymentStatus(prisma, b.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b.id, "EXEMPT", NOW);
    expect(await memberAccount(prisma, m.id)).toEqual({ strikes: 0, unpaid: 0, debtCents: 0, blocked: false });
  });

  it("re-marking UNPAID does not add a second strike for the same booking", async () => {
    const m = await makeMember();
    const b = await pastBooking(m.id, "2026-11-01");
    await setPaymentStatus(prisma, b.id, "UNPAID", NOW);
    await setPaymentStatus(prisma, b.id, "PAID", NOW);
    await setPaymentStatus(prisma, b.id, "UNPAID", NOW);
    expect((await memberAccount(prisma, m.id)).strikes).toBe(1);
  });

  it("lists ended chargeable bookings to record, including late admin cancellations", async () => {
    const m = await makeMember();
    const admin = await makeAdmin();
    const ended = await pastBooking(m.id, "2026-11-01");
    const late = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId, start: romeInstant("2026-11-10", 13 * 60), slots: 1 }, NOW);
    await cancelBooking(prisma, { userId: admin.id, mode: "admin" }, late.id, "Pioggia", NOW);
    const free = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId, start: romeInstant("2026-11-10", 18 * 60), slots: 1 }, NOW);
    await cancelBooking(prisma, { userId: m.id, mode: "member" }, free.id, undefined, NOW);

    const later = romeInstant("2026-11-10", 21 * 60);
    const ids = (await pendingPayments(prisma, later)).map((b) => b.id);
    expect(ids).toContain(ended.id);
    expect(ids).toContain(late.id);
    expect(ids).not.toContain(free.id);
    expect((await pendingPayments(prisma, NOW)).map((b) => b.id)).not.toContain(late.id); // non ancora finita
  });

  it("refuses to record bookings that are not finished or not chargeable", async () => {
    const m = await makeMember();
    const future = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId, start: romeInstant("2026-11-12", 600), slots: 1 }, NOW);
    const e = await setPaymentStatus(prisma, future.id, "PAID", NOW).then(() => null, (x) => x);
    expect(e).toBeInstanceOf(DomainError);
  });
});
```

Run: `npm test -- src/server/payments` → FAIL (modulo mancante).

- [ ] **Step 2: Implementa**

`src/server/payments.ts`:
```ts
import { isBlocked, strikeConsequence } from "@/lib/booking-rules";
import { releaseOccupancy } from "./bookings";
import type { Db, Tx } from "./db";
import { fail } from "./errors";
import { notify } from "./notifications";

export type PaymentStatus = "PAID" | "UNPAID" | "EXEMPT";

async function blockedState(tx: Tx | Db, memberId: string) {
  const [strikes, unpaid] = await Promise.all([
    tx.strike.count({ where: { memberId } }),
    tx.booking.count({ where: { memberId, paymentStatus: "UNPAID" } }),
  ]);
  return { strikes, unpaid, blocked: isBlocked(strikes, unpaid) };
}

/** Blocco: cancella le prenotazioni future (non quelle in corso o passate). Non sono da pagare. */
async function applyBlock(tx: Tx, memberId: string, now: Date) {
  const future = await tx.booking.findMany({ where: { memberId, status: "CONFIRMED", start: { gt: now } }, include: { field: true } });
  for (const b of future) {
    await tx.booking.update({
      where: { id: b.id },
      data: { status: "CANCELLED", chargeable: false, cancelledById: null, cancelledAt: now },
    });
    await releaseOccupancy(tx, b.id);
    await notify(tx, memberId, "BOOKING_CANCELLED_BLOCK", { field: b.field.name, start: b.start.toISOString() });
  }
  await notify(tx, memberId, "ACCOUNT_BLOCKED", { cancelled: future.length });
}

export async function setPaymentStatus(db: Db, bookingId: string, status: PaymentStatus, now = new Date()) {
  await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { strike: true } });
    if (!booking) return fail("NOT_FOUND");
    if (!booking.chargeable || booking.end > now) fail("INVALID_INPUT");
    if (booking.paymentStatus === status) return;

    const memberId = booking.memberId;
    const before = await blockedState(tx, memberId);
    await tx.booking.update({ where: { id: booking.id }, data: { paymentStatus: status } });

    if (status === "UNPAID") {
      if (!booking.strike) {
        await tx.strike.create({ data: { memberId, bookingId: booking.id } });
        const after = await blockedState(tx, memberId);
        if (strikeConsequence(after.strikes) === "WARNING") await notify(tx, memberId, "STRIKE_WARNING", { strikes: after.strikes });
        else await applyBlock(tx, memberId, now);
      } else if (!before.blocked && (await blockedState(tx, memberId)).blocked) {
        await applyBlock(tx, memberId, now);
      }
      return;
    }

    // Esente = errore di registrazione: lo strike sparisce. Pagata: lo strike resta.
    if (status === "EXEMPT" && booking.strike) await tx.strike.delete({ where: { id: booking.strike.id } });
    if (before.blocked && !(await blockedState(tx, memberId)).blocked) await notify(tx, memberId, "ACCOUNT_UNBLOCKED");
  });
}

export async function setNoShow(db: Db, bookingId: string, noShow: boolean) {
  await db.booking.update({ where: { id: bookingId }, data: { noShow } });
}

export function pendingPayments(db: Db, now = new Date()) {
  return db.booking.findMany({
    where: { paymentStatus: "PENDING", chargeable: true, end: { lte: now } },
    include: { field: true, member: true },
    orderBy: { start: "asc" },
  });
}

export async function memberAccount(db: Db, memberId: string) {
  const [state, debt] = await Promise.all([
    blockedState(db, memberId),
    db.booking.aggregate({ where: { memberId, paymentStatus: "UNPAID" }, _sum: { priceCents: true } }),
  ]);
  return { strikes: state.strikes, unpaid: state.unpaid, debtCents: debt._sum.priceCents ?? 0, blocked: state.blocked };
}
```

- [ ] **Step 3: Esegui i test**

Run: `npm test -- src/server/payments`
Expected: PASS (8 test).

- [ ] **Step 4: Commit**

```bash
git add src/server/payments.ts src/server/payments.test.ts
git commit -m "feat(payments): payment recording with permanent strikes, auto-block and unblock"
```

---

### Task 13: Notifiche (campanella e notifiche temporali)

**Files:**
- Modify: `src/server/notifications.ts`, `src/app/(app)/layout.tsx`, `src/components/app-nav.tsx`, `messages/*.json`
- Create: `src/server/notifications.test.ts`, `src/components/notifications/bell.tsx`, `src/components/notifications/notification-text.tsx`, `src/app/(app)/notifications/page.tsx`, `src/app/(app)/notifications/actions.ts`

**Interfaces:**
- Consumes: `notify`, `NotificationType` (Task 6); `getSettings` (Task 6); `romeDay`, `addDays` (Task 4); `daysUntilExpiry` (Task 8).
- Produces:
  ```ts
  ensureTimedNotifications(db: Db, userId: string, now?: Date): Promise<void>
  unreadCount(db: Db, userId: string): Promise<number>
  listNotifications(db: Db, userId: string, take?: number): Promise<Notification[]>
  markRead(db: Db, userId: string, id: string): Promise<void>
  markAllRead(db: Db, userId: string): Promise<void>
  ```
- Chiavi di deduplica: `reminder:<bookingId>:<startISO>` (se la prenotazione viene spostata arriva un nuovo promemoria), `expiring:<expiryDate>`, `expired:<expiryDate>` (se la tessera viene rinnovata, la data cambia e gli avvisi ripartono).

- [ ] **Step 1: Scrivi i test**

`src/server/notifications.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { createBooking, updateBooking } from "./bookings";
import { ensureTimedNotifications, listNotifications, markAllRead, markRead, unreadCount } from "./notifications";
import { makeField, makeMember, makeSettings, resetDb } from "../../tests/helpers/db";

const NOW = romeInstant("2026-11-10", 600);
const count = (userId: string, type: string) => prisma.notification.count({ where: { userId, type } });

describe("timed notifications", () => {
  beforeEach(async () => {
    await resetDb();
    await makeSettings({ reminderHours: 24, membershipWarningDays: 15 });
  });

  it("creates one reminder per booking within the reminder window, idempotently", async () => {
    const f = await makeField();
    const m = await makeMember();
    const soon = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId: f.id, start: romeInstant("2026-11-11", 540), slots: 1 }, NOW);
    await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId: f.id, start: romeInstant("2026-11-13", 540), slots: 1 }, NOW);
    await ensureTimedNotifications(prisma, m.id, NOW);
    await ensureTimedNotifications(prisma, m.id, NOW);
    expect(await count(m.id, "BOOKING_REMINDER")).toBe(1);
    // Spostata: nuovo promemoria per il nuovo orario.
    await updateBooking(prisma, { userId: m.id, mode: "member" }, soon.id, { fieldId: f.id, start: romeInstant("2026-11-11", 600), slots: 1 }, NOW);
    await ensureTimedNotifications(prisma, m.id, NOW);
    expect(await count(m.id, "BOOKING_REMINDER")).toBe(2);
  });

  it("warns once when the card expires within 15 days, and once when expired", async () => {
    const expiring = await makeMember({ expiryDate: "2026-11-25" });
    const notYet = await makeMember({ expiryDate: "2026-11-26" });
    const expired = await makeMember({ expiryDate: "2026-11-09" });
    for (const u of [expiring, notYet, expired]) {
      await ensureTimedNotifications(prisma, u.id, NOW);
      await ensureTimedNotifications(prisma, u.id, NOW);
    }
    expect(await count(expiring.id, "MEMBERSHIP_EXPIRING")).toBe(1);
    expect(await count(notYet.id, "MEMBERSHIP_EXPIRING")).toBe(0);
    expect(await count(expired.id, "MEMBERSHIP_EXPIRED")).toBe(1);
    expect(await count(expired.id, "MEMBERSHIP_EXPIRING")).toBe(0);
  });

  it("counts, lists and marks as read only the user's own notifications", async () => {
    const a = await makeMember({ expiryDate: "2026-11-09" });
    const b = await makeMember({ expiryDate: "2026-11-09" });
    await ensureTimedNotifications(prisma, a.id, NOW);
    await ensureTimedNotifications(prisma, b.id, NOW);
    const [na] = await listNotifications(prisma, a.id);
    await markRead(prisma, b.id, na.id); // non è sua: nessun effetto
    expect(await unreadCount(prisma, a.id)).toBe(1);
    await markRead(prisma, a.id, na.id);
    expect(await unreadCount(prisma, a.id)).toBe(0);
    await markAllRead(prisma, b.id);
    expect(await unreadCount(prisma, b.id)).toBe(0);
  });
});
```

Run: `npm test -- src/server/notifications` → FAIL (funzioni mancanti).

- [ ] **Step 2: Implementa** (aggiungi in fondo a `src/server/notifications.ts`)

```ts
import { daysUntilExpiry } from "@/lib/membership";
import { romeDay } from "@/lib/time/rome";
import { getSettings } from "./settings";

/**
 * Le notifiche temporali vengono generate in modo pigro quando l'utente apre una pagina:
 * in locale non c'è un cron. Le chiavi di deduplica le rendono idempotenti.
 */
export async function ensureTimedNotifications(db: Db, userId: string, now = new Date()) {
  const [settings, membership] = await Promise.all([getSettings(db), db.membership.findUnique({ where: { userId } })]);
  const reminders = await db.booking.findMany({
    where: { memberId: userId, status: "CONFIRMED", start: { gt: now, lte: new Date(now.getTime() + settings.reminderHours * 3_600_000) } },
    include: { field: true },
  });
  for (const b of reminders) {
    const start = b.start.toISOString();
    await notify(db, userId, "BOOKING_REMINDER", { field: b.field.name, start }, `reminder:${b.id}:${start}`);
  }
  if (membership) {
    const days = daysUntilExpiry(membership.expiryDate, romeDay(now));
    if (days < 0) {
      await notify(db, userId, "MEMBERSHIP_EXPIRED", { expiry: membership.expiryDate }, `expired:${membership.expiryDate}`);
    } else if (days <= settings.membershipWarningDays) {
      await notify(db, userId, "MEMBERSHIP_EXPIRING", { expiry: membership.expiryDate, days }, `expiring:${membership.expiryDate}`);
    }
  }
}

export const unreadCount = (db: Db, userId: string) => db.notification.count({ where: { userId, read: false } });

export const listNotifications = (db: Db, userId: string, take = 50) =>
  db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });

export async function markRead(db: Db, userId: string, id: string) {
  await db.notification.updateMany({ where: { id, userId }, data: { read: true } });
}

export async function markAllRead(db: Db, userId: string) {
  await db.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
```

Sposta gli `import` in cima al file insieme a quello già esistente (`import type { Db, Tx } from "./db";`).

- [ ] **Step 3: Esegui i test**

Run: `npm test -- src/server/notifications` → PASS.

- [ ] **Step 4: Messaggi delle notifiche**

IT, namespace `notifications`:
```json
"notifications": {
  "title": "Notifiche", "empty": "Nessuna notifica.", "markAll": "Segna tutte come lette", "markRead": "Segna come letta", "unread": "{count, plural, one {1 non letta} other {# non lette}}",
  "byAdmin": " (dall'amministratore)", "reason": "Motivo: {reason}", "chargeable": "La prenotazione va comunque pagata.",
  "BOOKING_CREATED": "Prenotazione confermata: {field}, {start}.",
  "BOOKING_UPDATED": "Prenotazione modificata: {field}, {start}.",
  "BOOKING_CANCELLED": "Prenotazione cancellata: {field}, {start}.",
  "BOOKING_CANCELLED_BLOCK": "Prenotazione cancellata per blocco dovuto a mancato pagamento: {field}, {start}.",
  "STRIKE_WARNING": "Attenzione: una prenotazione risulta non pagata. Al prossimo mancato pagamento l'account verrà bloccato.",
  "ACCOUNT_BLOCKED": "Account bloccato per mancati pagamenti. {cancelled, plural, =0 {} one {È stata cancellata 1 prenotazione futura.} other {Sono state cancellate # prenotazioni future.}} Salda gli insoluti per tornare a prenotare.",
  "ACCOUNT_UNBLOCKED": "Pagamenti registrati: il tuo account è di nuovo attivo.",
  "BOOKING_REMINDER": "Promemoria: {field}, {start}.",
  "MEMBERSHIP_EXPIRING": "La tua tessera scade il {expiry} ({days, plural, =0 {oggi} one {tra 1 giorno} other {tra # giorni}}).",
  "MEMBERSHIP_EXPIRED": "La tua tessera è scaduta il {expiry}. Rinnovala in segreteria per prenotare."
}
```
EN:
```json
"notifications": {
  "title": "Notifications", "empty": "No notifications.", "markAll": "Mark all as read", "markRead": "Mark as read", "unread": "{count, plural, one {1 unread} other {# unread}}",
  "byAdmin": " (by the administrator)", "reason": "Reason: {reason}", "chargeable": "The booking must still be paid.",
  "BOOKING_CREATED": "Booking confirmed: {field}, {start}.",
  "BOOKING_UPDATED": "Booking changed: {field}, {start}.",
  "BOOKING_CANCELLED": "Booking cancelled: {field}, {start}.",
  "BOOKING_CANCELLED_BLOCK": "Booking cancelled because your account is blocked for non-payment: {field}, {start}.",
  "STRIKE_WARNING": "Warning: a booking is recorded as unpaid. Next time your account will be blocked.",
  "ACCOUNT_BLOCKED": "Account blocked for unpaid bookings. {cancelled, plural, =0 {} one {1 upcoming booking was cancelled.} other {# upcoming bookings were cancelled.}} Settle them to book again.",
  "ACCOUNT_UNBLOCKED": "Payments recorded: your account is active again.",
  "BOOKING_REMINDER": "Reminder: {field}, {start}.",
  "MEMBERSHIP_EXPIRING": "Your card expires on {expiry} ({days, plural, =0 {today} one {in 1 day} other {in # days}}).",
  "MEMBERSHIP_EXPIRED": "Your card expired on {expiry}. Renew it at the office to book."
}
```

- [ ] **Step 5: Testo tradotto, campanella, pagina**

`src/components/notifications/notification-text.tsx`:
```tsx
"use client";

import { useFormatter, useTranslations } from "next-intl";

/** I parametri sono salvati grezzi (ISO, YYYY-MM-DD) e vengono formattati nella lingua di chi legge. */
export function NotificationText({ type, params }: { type: string; params: Record<string, string | number> }) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const p: Record<string, string | number> = { ...params };
  if (typeof p.start === "string") p.start = format.dateTime(new Date(p.start), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  if (typeof p.expiry === "string") p.expiry = format.dateTime(new Date(`${p.expiry}T12:00:00Z`), { dateStyle: "medium" });
  return (
    <>
      {t(type as "BOOKING_CREATED", p)}
      {params.by === "admin" && t("byAdmin")}
      {params.reason && <> {t("reason", { reason: String(params.reason) })}</>}
      {params.chargeable === 1 && <> {t("chargeable")}</>}
    </>
  );
}
```

`src/app/(app)/notifications/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { markAllRead, markRead } from "@/server/notifications";

export async function markReadAction(id: string) {
  const user = await requireUser();
  await markRead(prisma, user.id, id);
  revalidatePath("/", "layout");
}

export async function markAllReadAction() {
  const user = await requireUser();
  await markAllRead(prisma, user.id);
  revalidatePath("/", "layout");
}
```

`src/components/notifications/bell.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { markAllReadAction, markReadAction } from "@/app/(app)/notifications/actions";
import { NotificationText } from "./notification-text";

export type BellItem = { id: string; type: string; params: Record<string, string | number>; read: boolean };

export function NotificationBell({ unread, items }: { unread: number; items: BellItem[] }) {
  const t = useTranslations("notifications");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`${t("title")} · ${t("unread", { count: unread })}`}>
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {items.length === 0 && <p className="p-3 text-sm text-muted-foreground">{t("empty")}</p>}
        {items.map((n) => (
          <DropdownMenuItem key={n.id} className={n.read ? "text-muted-foreground" : "font-medium"} onSelect={() => !n.read && markReadAction(n.id)}>
            <span className="text-sm"><NotificationText type={n.type} params={n.params} /></span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="flex justify-between p-1">
          <Button variant="ghost" size="sm" onClick={() => markAllReadAction()}>{t("markAll")}</Button>
          <Button variant="ghost" size="sm" asChild><Link href="/notifications">{t("title")}</Link></Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

`src/app/(app)/notifications/page.tsx`:
```tsx
import { getFormatter, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationText } from "@/components/notifications/notification-text";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { listNotifications } from "@/server/notifications";
import { markAllReadAction, markReadAction } from "./actions";

export default async function NotificationsPage() {
  const user = await requireUser();
  const t = await getTranslations("notifications");
  const format = await getFormatter();
  const items = await listNotifications(prisma, user.id, 200);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <form action={markAllReadAction}><Button variant="outline" size="sm">{t("markAll")}</Button></form>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {items.length === 0 && <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>}
          {items.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-3 p-4">
              <div className={n.read ? "text-muted-foreground" : ""}>
                <p className="text-sm"><NotificationText type={n.type} params={JSON.parse(n.params)} /></p>
                <p className="text-xs text-muted-foreground">{format.relativeTime(n.createdAt)}</p>
              </div>
              {!n.read && (
                <form action={markReadAction.bind(null, n.id)}><Button variant="ghost" size="sm">{t("markRead")}</Button></form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Collega la campanella al layout**

In `src/app/(app)/layout.tsx`, prima del `return`:
```tsx
import { NotificationBell } from "@/components/notifications/bell";
import { prisma } from "@/server/db";
import { ensureTimedNotifications, listNotifications, unreadCount } from "@/server/notifications";
// …
await ensureTimedNotifications(prisma, user.id);
const [unread, latest] = await Promise.all([unreadCount(prisma, user.id), listNotifications(prisma, user.id, 8)]);
const bellItems = latest.map((n) => ({ id: n.id, type: n.type, params: JSON.parse(n.params), read: n.read }));
```
e sostituisci il blocco `<main>` con:
```tsx
<div className="flex min-w-0 flex-col">
  <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b bg-background/80 px-4 backdrop-blur">
    <NotificationBell unread={unread} items={bellItems} />
  </header>
  <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:pb-6">{children}</main>
</div>
```
In `src/components/app-nav.tsx` aggiungi alla lista `member` la voce `{ href: "/notifications", label: t("notifications"), icon: Bell }` (importa `Bell` da lucide-react) dopo `/bookings`.

- [ ] **Step 7: Verifica e commit**

Run: `npm test` → PASS; `npm run lint` → OK.
Verifica manuale: come `luca@example.it` (tessera in scadenza tra 10 giorni) compare 1 notifica; ricaricando la pagina non se ne aggiungono altre.

```bash
git add -A
git commit -m "feat(notifications): bell with unread badge, notifications page, lazy idempotent timed notifications"
```

---

### Task 14: Area admin – prenotazioni e pagamenti

**Files:**
- Create: `src/server/admin-bookings.ts`, `src/server/admin-bookings.test.ts`, `src/app/(app)/admin/bookings/page.tsx`, `src/app/(app)/admin/bookings/new/page.tsx`, `src/app/(app)/admin/bookings/[id]/edit/page.tsx`, `src/app/(app)/admin/payments/page.tsx`, `src/app/(app)/admin/payments/actions.ts`, `src/components/admin/payment-buttons.tsx`
- Modify: `src/app/(app)/admin/members/[id]/page.tsx`, `messages/*.json`

**Interfaces:**
- Consumes: `BookingWizard`, `CancelButton`, `submitBookingAction`, `cancelBookingAction` (Task 10); `setPaymentStatus`, `setNoShow`, `pendingPayments`, `memberAccount` (Task 12).
- Produces:
  ```ts
  type BookingFilters = { fieldId?: string; memberId?: string; status?: "CONFIRMED" | "CANCELLED"; payment?: "PENDING" | "PAID" | "UNPAID" | "EXEMPT"; from?: string; to?: string };
  parseBookingFilters(sp: Record<string, string | undefined>): BookingFilters
  listBookings(db: Db, f: BookingFilters, take?: number): Promise<(Booking & { field: Field; member: User })[]>
  ```
- Le prenotazioni che l'admin crea per un socio contano nel limite di 3 del socio (spec §13), ma l'admin può superarlo.

- [ ] **Step 1: Test dei filtri**

`src/server/admin-bookings.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { listBookings, parseBookingFilters } from "./admin-bookings";
import { makeField, makeMember, resetDb } from "../../tests/helpers/db";

describe("admin booking list", () => {
  beforeEach(resetDb);

  it("parses only valid filter values", () => {
    expect(parseBookingFilters({ status: "CONFIRMED", payment: "NOPE", from: "2026-11-01", to: "x", fieldId: "f1" })).toEqual({ status: "CONFIRMED", from: "2026-11-01", fieldId: "f1" });
  });

  it("filters by field, member, status and Rome day range (inclusive)", async () => {
    const f1 = await makeField();
    const f2 = await makeField();
    const m = await makeMember();
    const mk = (fieldId: string, day: string, status = "CONFIRMED") =>
      prisma.booking.create({ data: { memberId: m.id, fieldId, start: romeInstant(day, 600), end: romeInstant(day, 660), slots: 1, priceCents: 1800, status } });
    const a = await mk(f1.id, "2026-11-01");
    const b = await mk(f1.id, "2026-11-03", "CANCELLED");
    await mk(f2.id, "2026-11-04");
    expect((await listBookings(prisma, { fieldId: f1.id })).map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
    expect((await listBookings(prisma, { status: "CANCELLED" })).map((x) => x.id)).toEqual([b.id]);
    expect((await listBookings(prisma, { from: "2026-11-03", to: "2026-11-03" })).map((x) => x.id)).toEqual([b.id]);
    expect(await listBookings(prisma, { memberId: "nessuno" })).toHaveLength(0);
  });
});
```

Run: `npm test -- src/server/admin-bookings` → FAIL.

- [ ] **Step 2: Implementa**

`src/server/admin-bookings.ts`:
```ts
import type { Prisma } from "@prisma/client";
import { addDays, romeInstant } from "@/lib/time/rome";
import type { Db } from "./db";

export type BookingFilters = {
  fieldId?: string;
  memberId?: string;
  status?: "CONFIRMED" | "CANCELLED";
  payment?: "PENDING" | "PAID" | "UNPAID" | "EXEMPT";
  from?: string;
  to?: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ["CONFIRMED", "CANCELLED"] as const;
const PAYMENTS = ["PENDING", "PAID", "UNPAID", "EXEMPT"] as const;

export function parseBookingFilters(sp: Record<string, string | undefined>): BookingFilters {
  const f: BookingFilters = {};
  if (sp.fieldId) f.fieldId = sp.fieldId;
  if (sp.memberId) f.memberId = sp.memberId;
  if (STATUSES.includes(sp.status as never)) f.status = sp.status as BookingFilters["status"];
  if (PAYMENTS.includes(sp.payment as never)) f.payment = sp.payment as BookingFilters["payment"];
  if (sp.from && DAY.test(sp.from)) f.from = sp.from;
  if (sp.to && DAY.test(sp.to)) f.to = sp.to;
  return f;
}

export function listBookings(db: Db, f: BookingFilters, take = 300) {
  const where: Prisma.BookingWhereInput = {
    fieldId: f.fieldId,
    memberId: f.memberId,
    status: f.status,
    paymentStatus: f.payment,
    start: f.from || f.to ? { gte: f.from ? romeInstant(f.from, 0) : undefined, lt: f.to ? romeInstant(addDays(f.to, 1), 0) : undefined } : undefined,
  };
  return db.booking.findMany({ where, include: { field: true, member: true }, orderBy: { start: "desc" }, take });
}
```

Run: `npm test -- src/server/admin-bookings` → PASS.

- [ ] **Step 3: Messaggi**

IT, namespace `adminBookings` e `payments`:
```json
"adminBookings": {
  "title": "Prenotazioni", "new": "Nuova prenotazione", "filter": "Filtra", "all": "Tutti", "from": "Dal", "to": "Al",
  "field": "Campo", "member": "Socio", "when": "Quando", "status": "Stato", "payment": "Pagamento", "price": "Prezzo",
  "edit": "Modifica", "empty": "Nessuna prenotazione con questi filtri.", "adminReason": "Cancellata dall'amministrazione", "system": "Cancellata per blocco"
},
"payments": {
  "title": "Pagamenti da registrare", "empty": "Nessun pagamento da registrare.", "paid": "Pagata", "unpaid": "Non pagata", "exempt": "Esente",
  "noShow": "No-show", "cancelledLate": "Cancellata in ritardo", "saved": "Registrato", "unpaidTitle": "Insoluti", "noUnpaid": "Nessun insoluto."
}
```
EN:
```json
"adminBookings": {
  "title": "Bookings", "new": "New booking", "filter": "Filter", "all": "All", "from": "From", "to": "To",
  "field": "Court", "member": "Member", "when": "When", "status": "Status", "payment": "Payment", "price": "Price",
  "edit": "Change", "empty": "No bookings match these filters.", "adminReason": "Cancelled by the administration", "system": "Cancelled because of a block"
},
"payments": {
  "title": "Payments to record", "empty": "No payments to record.", "paid": "Paid", "unpaid": "Unpaid", "exempt": "Exempt",
  "noShow": "No-show", "cancelledLate": "Cancelled late", "saved": "Recorded", "unpaidTitle": "Unpaid", "noUnpaid": "Nothing unpaid."
}
```

- [ ] **Step 4: Action dei pagamenti e pulsanti**

`src/app/(app)/admin/payments/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-result";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { setNoShow, setPaymentStatus, type PaymentStatus } from "@/server/payments";

export async function setPaymentAction(bookingId: string, status: PaymentStatus) {
  await requireAdmin();
  const r = await runAction(() => setPaymentStatus(prisma, bookingId, status).then(() => null));
  revalidatePath("/admin", "layout");
  return r;
}

export async function setNoShowAction(bookingId: string, noShow: boolean) {
  await requireAdmin();
  await setNoShow(prisma, bookingId, noShow);
  revalidatePath("/admin/payments");
}
```

`src/components/admin/payment-buttons.tsx`:
```tsx
"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setNoShowAction, setPaymentAction } from "@/app/(app)/admin/payments/actions";

export function PaymentButtons({ bookingId, noShow, showNoShow = true }: { bookingId: string; noShow: boolean; showNoShow?: boolean }) {
  const t = useTranslations("payments");
  const te = useTranslations("errors");
  const [pending, start] = useTransition();
  const set = (status: "PAID" | "UNPAID" | "EXEMPT") =>
    start(async () => {
      const r = await setPaymentAction(bookingId, status);
      if (r.ok) toast.success(t("saved"));
      else toast.error(te(r.violations[0].code));
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => set("PAID")}>{t("paid")}</Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => set("UNPAID")}>{t("unpaid")}</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => set("EXEMPT")}>{t("exempt")}</Button>
      {showNoShow && (
        <div className="flex items-center gap-1">
          <Switch id={`ns-${bookingId}`} defaultChecked={noShow} onCheckedChange={(v) => start(() => setNoShowAction(bookingId, v))} />
          <Label htmlFor={`ns-${bookingId}`} className="text-xs">{t("noShow")}</Label>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Pagina pagamenti**

`src/app/(app)/admin/payments/page.tsx`:
```tsx
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";
import { PaymentButtons } from "@/components/admin/payment-buttons";
import { prisma } from "@/server/db";
import { pendingPayments } from "@/server/payments";

export default async function PaymentsPage() {
  const t = await getTranslations("payments");
  const format = await getFormatter();
  const [pending, unpaid] = await Promise.all([
    pendingPayments(prisma),
    prisma.booking.findMany({ where: { paymentStatus: "UNPAID" }, include: { field: true, member: true }, orderBy: { start: "asc" } }),
  ]);
  const row = (b: (typeof pending)[number], buttons: boolean) => (
    <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-0">
      <div className="text-sm">
        <Link href={`/admin/members/${b.memberId}`} className="font-medium hover:underline">{b.member.lastName} {b.member.firstName}</Link>
        <p className="text-muted-foreground">
          {b.field.name} · {format.dateTime(b.start, { dateStyle: "medium", timeStyle: "short" })} · <Money cents={b.priceCents} />
        </p>
        {b.status === "CANCELLED" && <Badge variant="outline">{t("cancelledLate")}</Badge>}
      </div>
      <PaymentButtons bookingId={b.id} noShow={b.noShow} showNoShow={buttons} />
    </div>
  );
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t("title")}</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
          {pending.map((b) => row(b, true))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("unpaidTitle")}</CardTitle></CardHeader>
        <CardContent>
          {unpaid.length === 0 && <p className="text-sm text-muted-foreground">{t("noUnpaid")}</p>}
          {unpaid.map((b) => row(b, false))}
        </CardContent>
      </Card>
    </div>
  );
}
```

La sezione "Insoluti" permette di registrare un pagamento tardivo (`UNPAID` → `PAID`) o di correggere un errore (`UNPAID` → `EXEMPT`), e da lì scatta lo sblocco.

- [ ] **Step 6: Elenco, creazione e modifica delle prenotazioni (admin)**

`src/app/(app)/admin/bookings/page.tsx`:
```tsx
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CancelButton } from "@/components/booking/cancel-button";
import { Money } from "@/components/money";
import { listBookings, parseBookingFilters } from "@/server/admin-bookings";
import { prisma } from "@/server/db";

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getTranslations("adminBookings");
  const tb = await getTranslations("bookings");
  const format = await getFormatter();
  const filters = parseBookingFilters(await searchParams);
  const [bookings, fields] = await Promise.all([listBookings(prisma, filters), prisma.field.findMany({ orderBy: { sortOrder: "asc" } })]);
  const select = "h-9 rounded-md border bg-background px-2 text-sm";
  const now = new Date();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button asChild><Link href="/admin/bookings/new">{t("new")}</Link></Button>
      </div>
      <form className="flex flex-wrap items-end gap-2">
        <select name="fieldId" defaultValue={filters.fieldId ?? ""} className={select} aria-label={t("field")}>
          <option value="">{t("all")}</option>
          {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select name="status" defaultValue={filters.status ?? ""} className={select} aria-label={t("status")}>
          <option value="">{t("all")}</option>
          <option value="CONFIRMED">{tb("status.CONFIRMED")}</option>
          <option value="CANCELLED">{tb("status.CANCELLED")}</option>
        </select>
        <select name="payment" defaultValue={filters.payment ?? ""} className={select} aria-label={t("payment")}>
          <option value="">{t("all")}</option>
          {(["PENDING", "PAID", "UNPAID", "EXEMPT"] as const).map((p) => <option key={p} value={p}>{tb(`payment.${p}`)}</option>)}
        </select>
        <Input type="date" name="from" defaultValue={filters.from} aria-label={t("from")} className="w-40" />
        <Input type="date" name="to" defaultValue={filters.to} aria-label={t("to")} className="w-40" />
        {filters.memberId && <input type="hidden" name="memberId" value={filters.memberId} />}
        <Button type="submit" variant="secondary">{t("filter")}</Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("when")}</TableHead>
            <TableHead>{t("field")}</TableHead>
            <TableHead>{t("member")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("price")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">{t("empty")}</TableCell></TableRow>}
          {bookings.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="whitespace-nowrap">{format.dateTime(b.start, { dateStyle: "short", timeStyle: "short" })}</TableCell>
              <TableCell>{b.field.name}</TableCell>
              <TableCell><Link className="hover:underline" href={`/admin/members/${b.memberId}`}>{b.member.lastName} {b.member.firstName}</Link></TableCell>
              <TableCell className="hidden md:table-cell"><Money cents={b.priceCents} /></TableCell>
              <TableCell className="space-x-1">
                <Badge variant={b.status === "CANCELLED" ? "outline" : "secondary"}>{tb(`status.${b.status as "CONFIRMED" | "CANCELLED"}`)}</Badge>
                {b.chargeable && b.end <= now && <Badge variant={b.paymentStatus === "UNPAID" ? "destructive" : "secondary"}>{tb(`payment.${b.paymentStatus as "PENDING"}`)}</Badge>}
              </TableCell>
              <TableCell className="space-x-1 whitespace-nowrap text-right">
                {b.status === "CONFIRMED" && (
                  <>
                    <Button size="sm" variant="outline" asChild><Link href={`/admin/bookings/${b.id}/edit`}>{t("edit")}</Link></Button>
                    <CancelButton bookingId={b.id} mode="admin" defaultReason={t("adminReason")} />
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

`src/app/(app)/admin/bookings/new/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { romeDay } from "@/lib/time/rome";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { prisma } from "@/server/db";
import { getSettings } from "@/server/settings";

export default async function AdminNewBookingPage({ searchParams }: { searchParams: Promise<{ memberId?: string }> }) {
  const t = await getTranslations("adminBookings");
  const { memberId } = await searchParams;
  const [fields, settings, users] = await Promise.all([
    prisma.field.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(prisma),
    prisma.user.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select: { id: true, firstName: true, lastName: true } }),
  ]);
  const members = users.map((u) => ({ id: u.id, name: `${u.lastName} ${u.firstName}` }));
  // Il socio passato nell'URL va in cima alla lista, così è già selezionato.
  members.sort((a, b) => Number(b.id === memberId) - Number(a.id === memberId));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("new")}</h1>
      {/* Admin: nessun limite di anticipo, quindi niente minDay/maxDay restrittivi oltre a oggi come default. */}
      <BookingWizard fields={fields} initial={{ day: romeDay(new Date()) }} minDay="2000-01-01" maxSlots={settings.maxSlotsPerBooking} mode="admin" members={members} />
    </div>
  );
}
```

`src/app/(app)/admin/bookings/[id]/edit/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { romeDay, romeMinutesOfDay } from "@/lib/time/rome";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { prisma } from "@/server/db";
import { getSettings } from "@/server/settings";

export default async function AdminEditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("wizard");
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.status !== "CONFIRMED") notFound();
  const [fields, settings] = await Promise.all([prisma.field.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), getSettings(prisma)]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("editTitle")}</h1>
      <BookingWizard
        fields={fields}
        initial={{ fieldId: booking.fieldId, day: romeDay(booking.start), minute: romeMinutesOfDay(booking.start), slots: booking.slots }}
        minDay="2000-01-01"
        maxSlots={settings.maxSlotsPerBooking}
        mode="admin"
        bookingId={booking.id}
      />
    </div>
  );
}
```

`freeStartsAction` (Task 10) restituisce `[]` per i giorni passati, anche all'admin. Va bene così: l'admin crea e modifica prenotazioni da oggi in avanti, mentre per correggere quelle passate usa i pagamenti e il no-show.

- [ ] **Step 7: Conto del socio nella sua pagina admin**

In `src/app/(app)/admin/members/[id]/page.tsx` aggiungi i dati economici e lo storico:
```tsx
import Link from "next/link";
import { getFormatter } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";
import { memberAccount } from "@/server/payments";
// … dentro la pagina, dopo aver caricato `user`:
const format = await getFormatter();
const tb = await getTranslations("bookings");
const tab = await getTranslations("adminBookings");
const [account, history] = await Promise.all([
  memberAccount(prisma, user.id),
  prisma.booking.findMany({ where: { memberId: user.id }, include: { field: true }, orderBy: { start: "desc" }, take: 50 }),
]);
```
e nel JSX, subito sotto il titolo:
```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
  <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("strikes")}</p><p className="text-2xl font-semibold">{account.strikes}</p></CardContent></Card>
  <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("unpaid")}</p><p className="text-2xl font-semibold">{account.unpaid}</p></CardContent></Card>
  <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("debt")}</p><p className="text-2xl font-semibold"><Money cents={account.debtCents} /></p></CardContent></Card>
  <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{t("status")}</p>{account.blocked ? <Badge variant="destructive">{t("blocked")}</Badge> : <Badge variant="secondary">{t("active")}</Badge>}</CardContent></Card>
</div>
<Button asChild variant="outline"><Link href={`/admin/bookings/new?memberId=${user.id}`}>{tab("new")}</Link></Button>
```
e in fondo:
```tsx
<Card>
  <CardHeader><CardTitle>{t("history")}</CardTitle></CardHeader>
  <CardContent className="space-y-1 text-sm">
    {history.map((b) => (
      <div key={b.id} className="flex flex-wrap justify-between gap-2 border-b py-1 last:border-0">
        <span>{b.field.name} · {format.dateTime(b.start, { dateStyle: "medium", timeStyle: "short" })}</span>
        <span className="space-x-1">
          <Badge variant="outline">{tb(`status.${b.status as "CONFIRMED" | "CANCELLED"}`)}</Badge>
          {b.chargeable && <Badge variant={b.paymentStatus === "UNPAID" ? "destructive" : "secondary"}>{tb(`payment.${b.paymentStatus as "PENDING"}`)}</Badge>}
          {b.status === "CANCELLED" && !b.cancelledById && <Badge variant="destructive">{tab("system")}</Badge>}
        </span>
        {b.cancelReason && <p className="w-full text-xs text-muted-foreground">{b.cancelReason}</p>}
      </div>
    ))}
  </CardContent>
</Card>
```

- [ ] **Step 8: Verifica e commit**

Run: `npm test` → PASS; `npm run lint` → OK.
Verifica manuale come admin:
1. Crea una prenotazione per `sara@example.it` (tessera scaduta): riesce.
2. Cancella in ritardo una prenotazione che inizia tra meno di 2 ore: dopo la sua fine compare in "Pagamenti da registrare" con il badge "Cancellata in ritardo".
3. Segna 2 prenotazioni concluse dello stesso socio come "Non pagata": il socio risulta bloccato e le sue prenotazioni future sono cancellate. Segnale "Pagata" dagli insoluti: il socio è sbloccato e gli strike restano 2.

```bash
git add -A
git commit -m "feat(admin): bookings list with filters, admin booking wizard, payments to record, member account"
```

---

### Task 15: Impostazioni e campi (admin)

**Files:**
- Create: `src/server/fields.ts`, `src/server/fields.test.ts`, `src/app/(app)/admin/settings/page.tsx`, `src/app/(app)/admin/settings/actions.ts`, `src/components/admin/settings-form.tsx`, `src/components/admin/field-row.tsx`
- Modify: `messages/*.json`

**Interfaces:**
- Consumes: `releaseOccupancy`, `notify`, `fail` (Task 6).
- Produces:
  ```ts
  settingsSchema; type SettingsInput = z.input<typeof settingsSchema>
  updateSettings(db: Db, input: SettingsInput): Promise<Settings>
  fieldSchema; type FieldInput = { name: string; sport: string; slotMinutes: number; priceCents: number; sortOrder: number }
  createField(db: Db, input: FieldInput): Promise<Field>
  updateField(db: Db, id: string, input: FieldInput): Promise<Field>
  futureBookingsCount(db: Db, fieldId: string, now?: Date): Promise<number>
  deactivateField(db: Db, adminId: string, fieldId: string, now?: Date): Promise<number>   // ritorna le prenotazioni cancellate
  activateField(db: Db, fieldId: string): Promise<void>
  ```
- La modifica di durata o prezzo di un campo non tocca le prenotazioni esistenti: il prezzo è salvato su ogni prenotazione al momento della creazione o modifica (spec §6).

- [ ] **Step 1: Scrivi i test**

`src/server/fields.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { prisma } from "./db";
import { DomainError } from "./errors";
import { createBooking } from "./bookings";
import { deactivateField, futureBookingsCount, updateSettings } from "./fields";
import { makeAdmin, makeField, makeMember, makeSettings, resetDb } from "../../tests/helpers/db";

const NOW = romeInstant("2026-11-10", 600);

describe("fields and settings", () => {
  beforeEach(async () => {
    await resetDb();
    await makeSettings();
  });

  it("deactivating a field cancels and notifies only future bookings", async () => {
    const f = await makeField();
    const m = await makeMember();
    const admin = await makeAdmin();
    const past = await prisma.booking.create({ data: { memberId: m.id, fieldId: f.id, start: romeInstant("2026-11-01", 600), end: romeInstant("2026-11-01", 660), slots: 1, priceCents: 1800 } });
    const fut = await createBooking(prisma, { userId: m.id, mode: "member" }, m.id, { fieldId: f.id, start: romeInstant("2026-11-12", 600), slots: 1 }, NOW);
    expect(await futureBookingsCount(prisma, f.id, NOW)).toBe(1);
    expect(await deactivateField(prisma, admin.id, f.id, NOW)).toBe(1);
    expect((await prisma.field.findUniqueOrThrow({ where: { id: f.id } })).active).toBe(false);
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: fut.id } })).toMatchObject({ status: "CANCELLED", chargeable: false, cancelledById: admin.id });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: past.id } })).status).toBe("CONFIRMED");
    expect(await prisma.notification.count({ where: { userId: m.id, type: "BOOKING_CANCELLED" } })).toBe(1);
  });

  it("validates settings", async () => {
    const base = { openMinutes: 480, closeMinutes: 1380, startStepMinutes: 15, maxAdvanceDays: 14, maxActiveBookings: 3, changeWindowMinutes: 120, maxSlotsPerBooking: 2, membershipWarningDays: 15, reminderHours: 24 };
    expect((await updateSettings(prisma, { ...base, maxAdvanceDays: 21 })).maxAdvanceDays).toBe(21);
    const bad = await updateSettings(prisma, { ...base, closeMinutes: 400 }).then(() => null, (e) => e);
    expect(bad).toBeInstanceOf(DomainError);
    const badStep = await updateSettings(prisma, { ...base, startStepMinutes: 7 }).then(() => null, (e) => e);
    expect(badStep).toBeInstanceOf(DomainError);
  });
});
```

Run: `npm test -- src/server/fields` → FAIL.

- [ ] **Step 2: Implementa**

`src/server/fields.ts`:
```ts
import { z } from "zod";
import { releaseOccupancy } from "./bookings";
import type { Db } from "./db";
import { fail } from "./errors";
import { notify } from "./notifications";

const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const settingsSchema = z
  .object({
    openMinutes: int(0, 1425),
    closeMinutes: int(15, 1440),
    startStepMinutes: z.coerce.number().refine((n) => [5, 10, 15, 30, 60].includes(n)),
    maxAdvanceDays: int(0, 365),
    maxActiveBookings: int(1, 50),
    changeWindowMinutes: int(0, 2880),
    maxSlotsPerBooking: int(1, 4),
    membershipWarningDays: int(0, 90),
    reminderHours: int(1, 168),
  })
  .refine((s) => s.closeMinutes > s.openMinutes && s.openMinutes % s.startStepMinutes === 0);

export type SettingsInput = z.input<typeof settingsSchema>;

export async function updateSettings(db: Db, input: SettingsInput) {
  const r = settingsSchema.safeParse(input);
  if (!r.success) return fail("INVALID_INPUT");
  return db.settings.upsert({ where: { id: 1 }, update: r.data, create: { id: 1, ...r.data } });
}

export const fieldSchema = z.object({
  name: z.string().trim().min(1).max(60),
  sport: z.enum(["FOOTBALL", "TENNIS", "BASKETBALL", "BOCCE"]),
  slotMinutes: z.coerce.number().int().refine((n) => n >= 15 && n <= 240 && n % 15 === 0),
  priceCents: z.coerce.number().int().min(0).max(1_000_000),
  sortOrder: z.coerce.number().int().min(0).max(1000),
});

export type FieldInput = z.input<typeof fieldSchema>;

const parseField = (input: FieldInput) => {
  const r = fieldSchema.safeParse(input);
  return r.success ? r.data : fail("INVALID_INPUT");
};

export const createField = (db: Db, input: FieldInput) => db.field.create({ data: parseField(input) });
export const updateField = (db: Db, id: string, input: FieldInput) => db.field.update({ where: { id }, data: parseField(input) });

export const futureBookingsCount = (db: Db, fieldId: string, now = new Date()) =>
  db.booking.count({ where: { fieldId, status: "CONFIRMED", start: { gt: now } } });

export async function deactivateField(db: Db, adminId: string, fieldId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const future = await tx.booking.findMany({ where: { fieldId, status: "CONFIRMED", start: { gt: now } }, include: { field: true } });
    for (const b of future) {
      await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED", chargeable: false, cancelledById: adminId, cancelledAt: now } });
      await releaseOccupancy(tx, b.id);
      await notify(tx, b.memberId, "BOOKING_CANCELLED", { field: b.field.name, start: b.start.toISOString(), by: "admin", chargeable: 0 });
    }
    await tx.field.update({ where: { id: fieldId }, data: { active: false } });
    return future.length;
  });
}

export async function activateField(db: Db, fieldId: string) {
  await db.field.update({ where: { id: fieldId }, data: { active: true } });
}
```

Run: `npm test -- src/server/fields` → PASS.

- [ ] **Step 3: Messaggi**

IT, namespace `settings`:
```json
"settings": {
  "title": "Impostazioni", "rules": "Regole di prenotazione", "fields": "Campi", "addField": "Aggiungi campo", "saved": "Salvato",
  "openMinutes": "Apertura", "closeMinutes": "Chiusura", "startStepMinutes": "Passo orari (min)", "maxAdvanceDays": "Anticipo massimo (giorni)",
  "maxActiveBookings": "Prenotazioni attive per socio", "changeWindowMinutes": "Finestra modifica/cancellazione (min)", "maxSlotsPerBooking": "Slot massimi per prenotazione",
  "membershipWarningDays": "Avviso scadenza tessera (giorni)", "reminderHours": "Promemoria prenotazione (ore prima)",
  "name": "Nome", "sport": "Sport", "slotMinutes": "Durata slot (min)", "price": "Prezzo a slot (€)", "sortOrder": "Ordine",
  "active": "Attivo", "deactivate": "Disattiva", "activate": "Riattiva",
  "deactivateConfirm": "{count, plural, =0 {Disattivare il campo?} one {C'è 1 prenotazione futura: verrà cancellata e il socio avvisato. Continuare?} other {Ci sono # prenotazioni future: verranno cancellate e i soci avvisati. Continuare?}}",
  "sports": { "FOOTBALL": "Calcio", "TENNIS": "Tennis", "BASKETBALL": "Basket", "BOCCE": "Bocce" }
}
```
EN:
```json
"settings": {
  "title": "Settings", "rules": "Booking rules", "fields": "Courts", "addField": "Add court", "saved": "Saved",
  "openMinutes": "Opening", "closeMinutes": "Closing", "startStepMinutes": "Start time step (min)", "maxAdvanceDays": "Max days ahead",
  "maxActiveBookings": "Active bookings per member", "changeWindowMinutes": "Change/cancel window (min)", "maxSlotsPerBooking": "Max slots per booking",
  "membershipWarningDays": "Card expiry warning (days)", "reminderHours": "Booking reminder (hours before)",
  "name": "Name", "sport": "Sport", "slotMinutes": "Slot length (min)", "price": "Price per slot (€)", "sortOrder": "Order",
  "active": "Active", "deactivate": "Deactivate", "activate": "Reactivate",
  "deactivateConfirm": "{count, plural, =0 {Deactivate this court?} one {There is 1 upcoming booking: it will be cancelled and the member notified. Continue?} other {There are # upcoming bookings: they will be cancelled and the members notified. Continue?}}",
  "sports": { "FOOTBALL": "Football", "TENNIS": "Tennis", "BASKETBALL": "Basketball", "BOCCE": "Bocce" }
}
```

- [ ] **Step 4: Action e UI**

`src/app/(app)/admin/settings/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action-result";
import { prisma } from "@/server/db";
import { activateField, createField, deactivateField, futureBookingsCount, updateField, updateSettings, type FieldInput, type SettingsInput } from "@/server/fields";
import { requireAdmin } from "@/server/guards";

const hhmmToMinutes = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export async function saveSettingsAction(_: unknown, form: FormData) {
  await requireAdmin();
  const input = Object.fromEntries(form) as Record<string, string>;
  const r = await runAction(() =>
    updateSettings(prisma, { ...input, openMinutes: hhmmToMinutes(input.openMinutes), closeMinutes: hhmmToMinutes(input.closeMinutes) } as SettingsInput).then(() => null),
  );
  revalidatePath("/", "layout");
  return r;
}

export async function saveFieldAction(id: string | null, input: Omit<FieldInput, "priceCents"> & { priceEuro: string }) {
  await requireAdmin();
  const data: FieldInput = { ...input, priceCents: Math.round(Number(input.priceEuro.replace(",", ".")) * 100) };
  const r = await runAction(() => (id ? updateField(prisma, id, data) : createField(prisma, data)).then(() => null));
  revalidatePath("/admin/settings");
  return r;
}

export async function futureCountAction(fieldId: string) {
  await requireAdmin();
  return futureBookingsCount(prisma, fieldId);
}

export async function toggleFieldAction(fieldId: string, active: boolean) {
  const admin = await requireAdmin();
  if (active) await activateField(prisma, fieldId);
  else await deactivateField(prisma, admin.id, fieldId);
  revalidatePath("/", "layout");
}
```

`src/components/admin/settings-form.tsx`:
```tsx
"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ViolationList } from "@/components/violation-list";
import { minutesToHHMM } from "@/lib/time/rome";
import { saveSettingsAction } from "@/app/(app)/admin/settings/actions";

type S = { openMinutes: number; closeMinutes: number; startStepMinutes: number; maxAdvanceDays: number; maxActiveBookings: number; changeWindowMinutes: number; maxSlotsPerBooking: number; membershipWarningDays: number; reminderHours: number };

export function SettingsForm({ settings }: { settings: S }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  useEffect(() => {
    if (state?.ok) toast.success(t("saved"));
  }, [state, t]);
  const num = (k: Exclude<keyof S, "openMinutes" | "closeMinutes">) => (
    <div className="space-y-1">
      <Label htmlFor={k}>{t(k)}</Label>
      <Input id={k} name={k} type="number" defaultValue={settings[k]} required />
    </div>
  );
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-1"><Label htmlFor="openMinutes">{t("openMinutes")}</Label><Input id="openMinutes" name="openMinutes" type="time" step={900} defaultValue={minutesToHHMM(settings.openMinutes)} required /></div>
      <div className="space-y-1"><Label htmlFor="closeMinutes">{t("closeMinutes")}</Label><Input id="closeMinutes" name="closeMinutes" type="time" step={900} defaultValue={minutesToHHMM(settings.closeMinutes)} required /></div>
      {num("startStepMinutes")}
      {num("maxAdvanceDays")}
      {num("maxActiveBookings")}
      {num("changeWindowMinutes")}
      {num("maxSlotsPerBooking")}
      {num("membershipWarningDays")}
      {num("reminderHours")}
      {state && !state.ok && <div className="sm:col-span-3"><ViolationList violations={state.violations} /></div>}
      <div className="sm:col-span-3"><Button type="submit" disabled={pending}>{tc("save")}</Button></div>
    </form>
  );
}
```

`src/components/admin/field-row.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { futureCountAction, saveFieldAction, toggleFieldAction } from "@/app/(app)/admin/settings/actions";

export type FieldRowValue = { id: string | null; name: string; sport: string; slotMinutes: number; priceCents: number; sortOrder: number; active: boolean };
const SPORTS = ["FOOTBALL", "TENNIS", "BASKETBALL", "BOCCE"] as const;

export function FieldRow({ field }: { field: FieldRowValue }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [v, setV] = useState({ ...field, priceEuro: (field.priceCents / 100).toFixed(2) });
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await saveFieldAction(field.id, { name: v.name, sport: v.sport, slotMinutes: v.slotMinutes, sortOrder: v.sortOrder, priceEuro: v.priceEuro });
      if (r.ok) toast.success(t("saved"));
      else toast.error(te(r.violations[0].code));
    });
  const toggle = () =>
    start(async () => {
      if (field.active) {
        const count = await futureCountAction(field.id!);
        if (!confirm(t("deactivateConfirm", { count }))) return;
      }
      await toggleFieldAction(field.id!, !field.active);
    });
  return (
    <div className="grid grid-cols-2 items-end gap-2 border-b py-3 last:border-0 sm:grid-cols-[2fr_1.5fr_1fr_1fr_0.7fr_auto]">
      <Input aria-label={t("name")} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      <select aria-label={t("sport")} className="h-9 rounded-md border bg-background px-2 text-sm" value={v.sport} onChange={(e) => setV({ ...v, sport: e.target.value })}>
        {SPORTS.map((s) => <option key={s} value={s}>{t(`sports.${s}`)}</option>)}
      </select>
      <Input aria-label={t("slotMinutes")} type="number" step={15} value={v.slotMinutes} onChange={(e) => setV({ ...v, slotMinutes: Number(e.target.value) })} />
      <Input aria-label={t("price")} inputMode="decimal" value={v.priceEuro} onChange={(e) => setV({ ...v, priceEuro: e.target.value })} />
      <Input aria-label={t("sortOrder")} type="number" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} />
      <div className="flex gap-1">
        <Button size="sm" disabled={pending} onClick={save}>{tc("save")}</Button>
        {field.id && <Button size="sm" variant="outline" disabled={pending} onClick={toggle}>{field.active ? t("deactivate") : t("activate")}</Button>}
      </div>
    </div>
  );
}
```

`src/app/(app)/admin/settings/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldRow } from "@/components/admin/field-row";
import { SettingsForm } from "@/components/admin/settings-form";
import { prisma } from "@/server/db";
import { getSettings } from "@/server/settings";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const [settings, fields] = await Promise.all([getSettings(prisma), prisma.field.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("rules")}</CardTitle></CardHeader>
        <CardContent><SettingsForm settings={settings} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("fields")}</CardTitle></CardHeader>
        <CardContent>
          {fields.map((f) => <FieldRow key={f.id} field={f} />)}
          <p className="mt-4 text-sm font-medium">{t("addField")}</p>
          <FieldRow field={{ id: null, name: "", sport: "TENNIS", slotMinutes: 60, priceCents: 0, sortOrder: fields.length + 1, active: true }} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Verifica e commit**

Run: `npm test` → PASS; `npm run lint` → OK.
Verifica manuale: cambia il prezzo di Basket a 30 € e controlla che il riepilogo del wizard mostri 30 €, mentre le prenotazioni già fatte restano al prezzo vecchio. Disattiva Bocce con una prenotazione futura: compare la conferma con il numero di prenotazioni, Bocce sparisce dal calendario e il socio riceve la notifica.

```bash
git add -A
git commit -m "feat(admin): editable booking rules and courts, deactivation cancels future bookings"
```

---

### Task 16: Dashboard del socio

**Files:**
- Create: `src/lib/stats/member.ts`, `src/lib/stats/member.test.ts`, `src/components/charts/bar-chart-card.tsx`, `src/components/kpi-card.tsx`, `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/page.tsx` (redirect a `/dashboard`), `messages/*.json`

**Interfaces:**
- Consumes: `romeDay`, `romeInstant` (Task 4); `memberAccount` (Task 12); `daysUntilExpiry` (Task 8); `CancelButton` (Task 10).
- Produces:
  ```ts
  type StatBooking = { sport: string; fieldId: string; start: Date; end: Date; status: string; chargeable: boolean; paymentStatus: string; priceCents: number; noShow: boolean };
  hoursBySport(bookings: StatBooking[], now: Date): { sport: string; hours: number }[]     // solo CONFIRMED già finite
  bookingsByMonth(bookings: StatBooking[], months: string[]): { month: string; count: number }[]  // months "YYYY-MM", solo CONFIRMED
  lastMonths(today: string, n: number): string[]                                          // es. ["2026-06", …, "2026-11"]
  <KpiCard label value hint? tone? />
  <BarChartCard title data xKey yKey format? />
  ```
- I grafici usano i colori dei token di shadcn (`var(--chart-1)` … `var(--chart-5)`), che funzionano sia con il tema chiaro sia con quello scuro.

- [ ] **Step 1: Test delle aggregazioni**

`src/lib/stats/member.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { bookingsByMonth, hoursBySport, lastMonths, type StatBooking } from "./member";

const b = (sport: string, day: string, minutes: number, o: Partial<StatBooking> = {}): StatBooking => ({
  sport, fieldId: sport, start: romeInstant(day, 600), end: romeInstant(day, 600 + minutes), status: "CONFIRMED",
  chargeable: true, paymentStatus: "PAID", priceCents: 1000, noShow: false, ...o,
});
const NOW = romeInstant("2026-11-10", 600);

describe("member stats", () => {
  it("sums played hours per sport, ignoring cancelled and future bookings", () => {
    const r = hoursBySport([b("TENNIS", "2026-11-01", 60), b("TENNIS", "2026-11-02", 120), b("FOOTBALL", "2026-11-03", 90), b("TENNIS", "2026-11-04", 60, { status: "CANCELLED" }), b("BOCCE", "2026-11-20", 60)], NOW);
    expect(r).toEqual([{ sport: "TENNIS", hours: 3 }, { sport: "FOOTBALL", hours: 1.5 }]);
  });
  it("counts bookings per Rome month, with empty months as 0", () => {
    // 01/11 00:30 a Roma è già novembre, anche se in UTC è ancora il 31/10 alle 23:30.
    const earlyNov = { ...b("TENNIS", "2026-11-01", 30), start: romeInstant("2026-11-01", 30) };
    expect(bookingsByMonth([earlyNov, b("TENNIS", "2026-10-15", 60)], ["2026-09", "2026-10", "2026-11"])).toEqual([
      { month: "2026-09", count: 0 }, { month: "2026-10", count: 1 }, { month: "2026-11", count: 1 },
    ]);
  });
  it("lists the last n months ending with the current one", () => {
    expect(lastMonths("2026-02-15", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});
```

Run: `npm test -- src/lib/stats/member` → FAIL.

- [ ] **Step 2: Implementa**

`src/lib/stats/member.ts`:
```ts
import { romeDay } from "@/lib/time/rome";

export type StatBooking = {
  sport: string;
  fieldId: string;
  start: Date;
  end: Date;
  status: string;
  chargeable: boolean;
  paymentStatus: string;
  priceCents: number;
  noShow: boolean;
};

export function hoursBySport(bookings: StatBooking[], now: Date) {
  const acc = new Map<string, number>();
  for (const x of bookings) {
    if (x.status !== "CONFIRMED" || x.end > now) continue;
    acc.set(x.sport, (acc.get(x.sport) ?? 0) + (x.end.getTime() - x.start.getTime()) / 3_600_000);
  }
  return [...acc].map(([sport, hours]) => ({ sport, hours })).sort((a, b) => b.hours - a.hours);
}

export const romeMonth = (d: Date) => romeDay(d).slice(0, 7);

export function bookingsByMonth(bookings: StatBooking[], months: string[]) {
  const counts = new Map(months.map((m) => [m, 0]));
  for (const x of bookings) {
    const m = romeMonth(x.start);
    if (x.status === "CONFIRMED" && counts.has(m)) counts.set(m, counts.get(m)! + 1);
  }
  return months.map((month) => ({ month, count: counts.get(month)! }));
}

export function lastMonths(today: string, n: number): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}
```

Run: `npm test -- src/lib/stats/member` → PASS.

- [ ] **Step 3: Componenti KPI e grafico**

`src/components/kpi-card.tsx`:
```tsx
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({ label, value, hint, tone = "default" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "default" | "warning" | "danger" }) {
  return (
    <Card className={cn(tone === "warning" && "border-amber-500/50", tone === "danger" && "border-destructive/60")}>
      <CardContent className="space-y-1 pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
```

`src/components/charts/bar-chart-card.tsx`:
```tsx
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BarChartCard<T extends Record<string, string | number>>({ title, data, xKey, yKey, empty, color = "var(--chart-1)" }: { title: string; data: T[]; xKey: keyof T & string; yKey: keyof T & string; empty: string; color?: string }) {
  const hasData = data.some((d) => Number(d[yKey]) > 0);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">
        {!hasData ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -16 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey={xKey} tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Messaggi**

IT, namespace `dashboard`:
```json
"dashboard": {
  "title": "Ciao {name}", "next": "Prossime prenotazioni", "none": "Nessuna prenotazione in arrivo.", "bookNow": "Prenota un campo",
  "active": "Prenotazioni attive", "card": "Tessera", "cardDays": "{days, plural, =0 {scade oggi} one {1 giorno} other {# giorni}}", "cardExpired": "Scaduta", "noCard": "Nessuna",
  "toPay": "Da saldare", "strikes": "{count, plural, =0 {Nessuno strike} one {1 strike} other {# strike}}", "blocked": "Account bloccato",
  "hoursBySport": "Ore giocate per sport", "byMonth": "Prenotazioni per mese", "noData": "Ancora nessun dato."
}
```
EN:
```json
"dashboard": {
  "title": "Hi {name}", "next": "Upcoming bookings", "none": "No upcoming bookings.", "bookNow": "Book a court",
  "active": "Active bookings", "card": "Membership card", "cardDays": "{days, plural, =0 {expires today} one {1 day} other {# days}}", "cardExpired": "Expired", "noCard": "None",
  "toPay": "To pay", "strikes": "{count, plural, =0 {No strikes} one {1 strike} other {# strikes}}", "blocked": "Account blocked",
  "hoursBySport": "Hours played by sport", "byMonth": "Bookings per month", "noData": "No data yet."
}
```

- [ ] **Step 5: Pagina**

`src/app/(app)/dashboard/page.tsx`:
```tsx
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { canMemberChange } from "@/lib/booking-rules";
import { daysUntilExpiry } from "@/lib/membership";
import { bookingsByMonth, hoursBySport, lastMonths } from "@/lib/stats/member";
import { romeDay } from "@/lib/time/rome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { CancelButton } from "@/components/booking/cancel-button";
import { KpiCard } from "@/components/kpi-card";
import { Money } from "@/components/money";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/guards";
import { memberAccount } from "@/server/payments";
import { getSettings } from "@/server/settings";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const tb = await getTranslations("bookings");
  const ts = await getTranslations("settings");
  const format = await getFormatter();
  const now = new Date();
  const today = romeDay(now);
  const months = lastMonths(today, 6);
  const [settings, account, bookings] = await Promise.all([
    getSettings(prisma),
    memberAccount(prisma, user.id),
    prisma.booking.findMany({ where: { memberId: user.id, start: { gte: new Date(`${months[0]}-01T00:00:00Z`) } }, include: { field: true }, orderBy: { start: "asc" } }),
  ]);
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && b.start > now);
  const stats = bookings.map((b) => ({ ...b, sport: b.field.sport }));
  const days = user.membership ? daysUntilExpiry(user.membership.expiryDate, today) : null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title", { name: user.firstName })}</h1>
        <Button asChild><Link href="/book">{t("bookNow")}</Link></Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("active")} value={`${upcoming.length}/${settings.maxActiveBookings}`} />
        <KpiCard
          label={t("card")}
          value={days === null ? t("noCard") : days < 0 ? t("cardExpired") : t("cardDays", { days })}
          tone={days === null || days < 0 ? "danger" : days <= settings.membershipWarningDays ? "warning" : "default"}
        />
        <KpiCard label={t("toPay")} value={<Money cents={account.debtCents} />} hint={t("strikes", { count: account.strikes })} tone={account.debtCents > 0 ? "warning" : "default"} />
        {account.blocked && <KpiCard label={t("blocked")} value="!" tone="danger" />}
      </div>
      <Card>
        <CardHeader><CardTitle>{t("next")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">{t("none")}</p>}
          {upcoming.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div className="text-sm">
                <p className="font-medium">{b.field.name}</p>
                <p className="text-muted-foreground">{format.dateTime(b.start, { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              {canMemberChange(b.start, now, settings) && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild><Link href={`/bookings/${b.id}/edit`}>{tb("edit")}</Link></Button>
                  <CancelButton bookingId={b.id} mode="member" />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={t("hoursBySport")}
          empty={t("noData")}
          data={hoursBySport(stats, now).map((r) => ({ sport: ts(`sports.${r.sport as "TENNIS"}`), hours: r.hours }))}
          xKey="sport"
          yKey="hours"
        />
        <BarChartCard
          title={t("byMonth")}
          empty={t("noData")}
          data={bookingsByMonth(stats, months).map((r) => ({ month: format.dateTime(new Date(`${r.month}-15T12:00:00Z`), { month: "short" }), count: r.count }))}
          xKey="month"
          yKey="count"
          color="var(--chart-2)"
        />
      </div>
    </div>
  );
}
```

`src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { currentUser } from "@/server/guards";

export default async function Home() {
  const user = await currentUser();
  redirect(user?.isAdmin ? "/admin/dashboard" : "/dashboard");
}
```

- [ ] **Step 6: Verifica e commit**

Run: `npm test` → PASS; `npm run lint` → OK.

```bash
git add -A
git commit -m "feat(dashboard): member dashboard with KPIs, upcoming bookings and charts"
```

---

### Task 17: Dashboard dell'admin

**Files:**
- Create: `src/lib/stats/admin.ts`, `src/lib/stats/admin.test.ts`, `src/server/dashboard.ts`, `src/components/charts/line-chart-card.tsx`, `src/components/charts/hour-heatmap.tsx`, `src/app/(app)/admin/dashboard/page.tsx`
- Modify: `messages/*.json`

**Interfaces:**
- Consumes: `StatBooking`, `romeMonth`, `lastMonths` (Task 16); `romeInstant`, `romeDay`, `romeMinutesOfDay`, `addDays`, `diffDays` (Task 4); `isBlocked` (Task 5).
- Produces:
  ```ts
  type Range = "day" | "week" | "month";
  rangeBounds(range: Range, today: string): { from: string; to: string }   // to escluso; settimana da lunedì
  occupancyByField(bookings: StatBooking[], fields: { id: string; name: string }[], from: string, to: string, open: number, close: number): { fieldId: string; name: string; rate: number }[]
  revenueSummary(bookings: StatBooking[], now: Date): { expectedCents: number; collectedCents: number; unpaidCents: number }
  hourHistogram(bookings: StatBooking[]): { weekday: number; hour: number; count: number }[]   // weekday 0 = lunedì
  // server/dashboard.ts
  loadAdminDashboard(db: Db, range: Range, now?: Date): Promise<{ … }>
  ```
- Definizioni:
  - Occupazione = minuti prenotati (`CONFIRMED`) nel periodo ÷ (giorni × (chiusura − apertura)).
  - Incasso atteso = prenotazioni da pagare (`chargeable`) già concluse e non `EXEMPT`; incassato = `PAID`; insoluto = `UNPAID`.

- [ ] **Step 1: Test**

`src/lib/stats/admin.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { romeInstant } from "@/lib/time/rome";
import { hourHistogram, occupancyByField, rangeBounds, revenueSummary } from "./admin";
import type { StatBooking } from "./member";

const b = (fieldId: string, day: string, startMin: number, minutes: number, o: Partial<StatBooking> = {}): StatBooking => ({
  sport: "TENNIS", fieldId, start: romeInstant(day, startMin), end: romeInstant(day, startMin + minutes), status: "CONFIRMED",
  chargeable: true, paymentStatus: "PENDING", priceCents: 1000, noShow: false, ...o,
});

describe("admin stats", () => {
  it("computes range bounds with weeks starting on Monday", () => {
    expect(rangeBounds("day", "2026-11-11")).toEqual({ from: "2026-11-11", to: "2026-11-12" });
    expect(rangeBounds("week", "2026-11-11")).toEqual({ from: "2026-11-09", to: "2026-11-16" }); // mercoledì → lunedì 9
    expect(rangeBounds("week", "2026-11-15")).toEqual({ from: "2026-11-09", to: "2026-11-16" }); // domenica
    expect(rangeBounds("month", "2026-11-11")).toEqual({ from: "2026-11-01", to: "2026-12-01" });
  });

  it("computes occupancy per field over open hours", () => {
    const fields = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
    // 1 giorno, 08–23 = 900 minuti aperti
    const r = occupancyByField([b("a", "2026-11-11", 600, 450), b("a", "2026-11-11", 480, 60, { status: "CANCELLED" }), b("b", "2026-11-12", 600, 60)], fields, "2026-11-11", "2026-11-12", 480, 1380);
    expect(r).toEqual([{ fieldId: "a", name: "A", rate: 0.5 }, { fieldId: "b", name: "B", rate: 0 }]);
  });

  it("sums expected, collected and unpaid revenue", () => {
    const now = romeInstant("2026-11-20", 600);
    const r = revenueSummary(
      [
        b("a", "2026-11-01", 600, 60, { paymentStatus: "PAID", priceCents: 1800 }),
        b("a", "2026-11-02", 600, 60, { paymentStatus: "UNPAID", priceCents: 2500 }),
        b("a", "2026-11-03", 600, 60, { paymentStatus: "EXEMPT", priceCents: 1000 }),
        b("a", "2026-11-04", 600, 60, { status: "CANCELLED", chargeable: false, priceCents: 6000 }),
        b("a", "2026-11-05", 600, 60, { status: "CANCELLED", chargeable: true, priceCents: 1000 }),
        b("a", "2026-11-30", 600, 60, { priceCents: 9999 }), // futura
      ],
      now,
    );
    expect(r).toEqual({ expectedCents: 1800 + 2500 + 1000, collectedCents: 1800, unpaidCents: 2500 });
  });

  it("builds a weekday × hour histogram in Rome time", () => {
    const h = hourHistogram([b("a", "2026-11-09", 18 * 60, 60), b("a", "2026-11-16", 18 * 60 + 30, 60), b("a", "2026-11-10", 9 * 60, 60, { status: "CANCELLED" })]);
    expect(h).toEqual([{ weekday: 0, hour: 18, count: 2 }]);
  });
});
```

Run: `npm test -- src/lib/stats/admin` → FAIL.

- [ ] **Step 2: Implementa**

`src/lib/stats/admin.ts`:
```ts
import { addDays, diffDays, romeDay, romeMinutesOfDay } from "@/lib/time/rome";
import type { StatBooking } from "./member";

export type Range = "day" | "week" | "month";

/** 0 = lunedì … 6 = domenica, per un giorno di calendario. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function rangeBounds(range: Range, today: string): { from: string; to: string } {
  if (range === "day") return { from: today, to: addDays(today, 1) };
  if (range === "week") {
    const from = addDays(today, -weekdayOf(today));
    return { from, to: addDays(from, 7) };
  }
  const [y, m] = today.split("-").map(Number);
  const from = `${today.slice(0, 7)}-01`;
  return { from, to: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10) };
}

export function occupancyByField(bookings: StatBooking[], fields: { id: string; name: string }[], from: string, to: string, open: number, close: number) {
  const available = diffDays(from, to) * (close - open);
  return fields.map((f) => {
    const used = bookings
      .filter((x) => x.fieldId === f.id && x.status === "CONFIRMED" && romeDay(x.start) >= from && romeDay(x.start) < to)
      .reduce((s, x) => s + (x.end.getTime() - x.start.getTime()) / 60_000, 0);
    return { fieldId: f.id, name: f.name, rate: available > 0 ? Math.round((used / available) * 1000) / 1000 : 0 };
  });
}

export function revenueSummary(bookings: StatBooking[], now: Date) {
  let expectedCents = 0, collectedCents = 0, unpaidCents = 0;
  for (const x of bookings) {
    if (!x.chargeable || x.end > now || x.paymentStatus === "EXEMPT") continue;
    expectedCents += x.priceCents;
    if (x.paymentStatus === "PAID") collectedCents += x.priceCents;
    if (x.paymentStatus === "UNPAID") unpaidCents += x.priceCents;
  }
  return { expectedCents, collectedCents, unpaidCents };
}

export function hourHistogram(bookings: StatBooking[]) {
  const acc = new Map<string, number>();
  for (const x of bookings) {
    if (x.status !== "CONFIRMED") continue;
    const key = `${weekdayOf(romeDay(x.start))}:${Math.floor(romeMinutesOfDay(x.start) / 60)}`;
    acc.set(key, (acc.get(key) ?? 0) + 1);
  }
  return [...acc].map(([k, count]) => {
    const [weekday, hour] = k.split(":").map(Number);
    return { weekday, hour, count };
  });
}
```

Nota: nel test di `revenueSummary` la prenotazione `CANCELLED` + `chargeable` (cancellata in ritardo dall'admin) conta nell'atteso: è giusto così, va pagata.

Run: `npm test -- src/lib/stats/admin` → PASS.

- [ ] **Step 3: Caricamento dati**

`src/server/dashboard.ts`:
```ts
import { isBlocked } from "@/lib/booking-rules";
import { occupancyByField, rangeBounds, revenueSummary, hourHistogram, type Range } from "@/lib/stats/admin";
import { bookingsByMonth, lastMonths } from "@/lib/stats/member";
import { addDays, romeDay, romeInstant } from "@/lib/time/rome";
import type { Db } from "./db";
import { getSettings } from "./settings";

export async function loadAdminDashboard(db: Db, range: Range, now = new Date()) {
  const today = romeDay(now);
  const { from, to } = rangeBounds(range, today);
  const months = lastMonths(today, 12);
  const [settings, fields, periodBookings, yearBookings, strikes, unpaid, expiring] = await Promise.all([
    getSettings(db),
    db.field.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.booking.findMany({ where: { start: { gte: romeInstant(from, 0), lt: romeInstant(to, 0) } }, include: { field: true } }),
    db.booking.findMany({ where: { start: { gte: romeInstant(`${months[0]}-01`, 0) } }, include: { field: true } }),
    db.strike.groupBy({ by: ["memberId"], _count: { _all: true } }),
    db.booking.groupBy({ by: ["memberId"], where: { paymentStatus: "UNPAID" }, _count: { _all: true } }),
    db.membership.findMany({
      where: { expiryDate: { gte: today, lte: addDays(today, 30) } },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { expiryDate: "asc" },
    }),
  ]);
  const toStat = (b: (typeof periodBookings)[number]) => ({ ...b, sport: b.field.sport });
  const period = periodBookings.map(toStat);
  const year = yearBookings.map(toStat);
  const unpaidBy = new Map(unpaid.map((u) => [u.memberId, u._count._all]));
  const blockedMembers = strikes.filter((s) => isBlocked(s._count._all, unpaidBy.get(s.memberId) ?? 0)).length;
  return {
    range, from, to,
    occupancy: occupancyByField(period, fields, from, to, settings.openMinutes, settings.closeMinutes),
    revenue: revenueSummary(year, now),
    noShows: period.filter((b) => b.noShow).length,
    blockedMembers,
    heatmap: hourHistogram(year),
    trend: bookingsByMonth(year, months),
    expiring: expiring.map((m) => ({ userId: m.user.id, name: `${m.user.lastName} ${m.user.firstName}`, expiryDate: m.expiryDate })),
    openHours: { from: Math.floor(settings.openMinutes / 60), to: Math.ceil(settings.closeMinutes / 60) },
  };
}
```

- [ ] **Step 4: Grafico a linee e heatmap**

`src/components/charts/line-chart-card.tsx`:
```tsx
"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LineChartCard({ title, data, empty }: { title: string; data: { label: string; count: number }[]; empty: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">
        {data.every((d) => d.count === 0) ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -16 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

`src/components/charts/hour-heatmap.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HourHeatmap({ title, cells, fromHour, toHour, weekdayLabels }: { title: string; cells: { weekday: number; hour: number; count: number }[]; fromHour: number; toHour: number; weekdayLabels: string[] }) {
  const t = useTranslations("adminDashboard");
  const max = Math.max(1, ...cells.map((c) => c.count));
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const get = (w: number, h: number) => cells.find((c) => c.weekday === w && c.hour === h)?.count ?? 0;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="border-separate border-spacing-0.5 text-[10px]">
          <thead>
            <tr><th />{hours.map((h) => <th key={h} className="w-6 font-normal text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody>
            {weekdayLabels.map((label, w) => (
              <tr key={label}>
                <th className="pr-1 text-left font-normal text-muted-foreground">{label}</th>
                {hours.map((h) => {
                  const c = get(w, h);
                  return (
                    <td key={h} title={t("heatCell", { day: label, hour: h, count: c })} className="size-6 rounded-sm" style={{ background: c ? `color-mix(in oklab, var(--chart-1) ${Math.round((c / max) * 90) + 10}%, transparent)` : "var(--muted)" }} />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Messaggi**

IT, namespace `adminDashboard`:
```json
"adminDashboard": {
  "title": "Statistiche", "day": "Oggi", "week": "Settimana", "month": "Mese", "occupancy": "Occupazione per campo",
  "expected": "Incasso atteso", "collected": "Incassato", "unpaid": "Insoluto", "last12": "ultimi 12 mesi",
  "noShows": "No-show nel periodo", "blocked": "Soci bloccati", "heatmap": "Fasce orarie più richieste (12 mesi)", "trend": "Andamento prenotazioni",
  "expiring": "Tessere in scadenza (30 giorni)", "noExpiring": "Nessuna tessera in scadenza.", "noData": "Ancora nessun dato.",
  "heatCell": "{day} ore {hour}: {count}", "weekdays": "Lun,Mar,Mer,Gio,Ven,Sab,Dom"
}
```
EN:
```json
"adminDashboard": {
  "title": "Statistics", "day": "Today", "week": "Week", "month": "Month", "occupancy": "Occupancy by court",
  "expected": "Expected revenue", "collected": "Collected", "unpaid": "Unpaid", "last12": "last 12 months",
  "noShows": "No-shows in period", "blocked": "Blocked members", "heatmap": "Busiest time slots (12 months)", "trend": "Bookings over time",
  "expiring": "Cards expiring (30 days)", "noExpiring": "No cards expiring.", "noData": "No data yet.",
  "heatCell": "{day} at {hour}: {count}", "weekdays": "Mon,Tue,Wed,Thu,Fri,Sat,Sun"
}
```

- [ ] **Step 6: Pagina**

`src/app/(app)/admin/dashboard/page.tsx`:
```tsx
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { Range } from "@/lib/stats/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { HourHeatmap } from "@/components/charts/hour-heatmap";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { KpiCard } from "@/components/kpi-card";
import { Money } from "@/components/money";
import { loadAdminDashboard } from "@/server/dashboard";
import { prisma } from "@/server/db";

const RANGES: Range[] = ["day", "week", "month"];

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const t = await getTranslations("adminDashboard");
  const format = await getFormatter();
  const sp = await searchParams;
  const range: Range = RANGES.includes(sp.range as Range) ? (sp.range as Range) : "week";
  const d = await loadAdminDashboard(prisma, range);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div className="flex gap-1 rounded-lg border p-1">
          {RANGES.map((r) => (
            <Button key={r} size="sm" variant={r === range ? "default" : "ghost"} asChild><Link href={`?range=${r}`}>{t(r)}</Link></Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label={t("expected")} value={<Money cents={d.revenue.expectedCents} />} hint={t("last12")} />
        <KpiCard label={t("collected")} value={<Money cents={d.revenue.collectedCents} />} hint={t("last12")} />
        <KpiCard label={t("unpaid")} value={<Money cents={d.revenue.unpaidCents} />} tone={d.revenue.unpaidCents > 0 ? "warning" : "default"} />
        <KpiCard label={t("noShows")} value={d.noShows} />
        <KpiCard label={t("blocked")} value={d.blockedMembers} tone={d.blockedMembers > 0 ? "danger" : "default"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard title={t("occupancy")} empty={t("noData")} data={d.occupancy.map((o) => ({ name: o.name, pct: Math.round(o.rate * 100) }))} xKey="name" yKey="pct" />
        <LineChartCard
          title={t("trend")}
          empty={t("noData")}
          data={d.trend.map((m) => ({ label: format.dateTime(new Date(`${m.month}-15T12:00:00Z`), { month: "short", year: "2-digit" }), count: m.count }))}
        />
      </div>
      <HourHeatmap title={t("heatmap")} cells={d.heatmap} fromHour={d.openHours.from} toHour={d.openHours.to} weekdayLabels={t("weekdays").split(",")} />
      <Card>
        <CardHeader><CardTitle className="text-base">{t("expiring")}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {d.expiring.length === 0 && <p className="text-muted-foreground">{t("noExpiring")}</p>}
          {d.expiring.map((m) => (
            <div key={m.userId} className="flex justify-between">
              <Link className="hover:underline" href={`/admin/members/${m.userId}`}>{m.name}</Link>
              <span className="tabular-nums">{format.dateTime(new Date(`${m.expiryDate}T12:00:00Z`), { dateStyle: "medium" })}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Verifica e commit**

Run: `npm test` → PASS; `npm run lint` → OK.
Verifica manuale: dopo aver creato qualche prenotazione e registrato dei pagamenti, i KPI cambiano. Il selettore Oggi/Settimana/Mese cambia occupazione e no-show. Con il tema scuro (Task 19) i grafici restano leggibili.

```bash
git add -A
git commit -m "feat(dashboard): admin dashboard with occupancy, revenue, no-shows, heatmap, trend and expiring cards"
```

---

### Task 18: Lingua (selettore IT/EN) e revisione delle traduzioni

**Files:**
- Create: `src/components/locale-switcher.tsx`, `src/app/(app)/locale-actions.ts`
- Modify: `src/app/(app)/layout.tsx`, `src/app/(auth)/layout.tsx`, `messages/*.json`

**Interfaces:**
- Consumes: `LOCALES`, `LOCALE_COOKIE`, `toLocale` da `@/i18n/locales` (Task 2); `currentUser` (Task 7).
- Produces: `setLocaleAction(locale: string): Promise<void>`: salva la lingua sul profilo (se loggato) e nel cookie.

- [ ] **Step 1: Action e selettore**

`src/app/(app)/locale-actions.ts`:
```ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, toLocale } from "@/i18n/locales";
import { prisma } from "@/server/db";
import { currentUser } from "@/server/guards";

export async function setLocaleAction(value: string) {
  const locale = toLocale(value);
  const user = await currentUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { locale } });
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
```

`src/components/locale-switcher.tsx`:
```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { LOCALES } from "@/i18n/locales";
import { setLocaleAction } from "@/app/(app)/locale-actions";

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={t("language")}
      disabled={pending}
      value={locale}
      onChange={(e) => start(() => setLocaleAction(e.target.value))}
      className="h-9 rounded-md border bg-background px-2 text-sm uppercase"
    >
      {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
    </select>
  );
}
```

Il componente client importa da `@/i18n/locales` (Task 2) e non da `@/i18n/request`, che usa `next/headers` e funziona solo sul server.

Aggiungi `"language": "Lingua"` / `"language": "Language"` a `common`.

- [ ] **Step 2: Inseriscilo nelle intestazioni**

In `src/app/(app)/layout.tsx`, nell'`<header>`, prima della campanella: `<LocaleSwitcher />`.
In `src/app/(auth)/layout.tsx`:
```tsx
import { LocaleSwitcher } from "@/components/locale-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8 flex justify-end"><LocaleSwitcher /></div>
      {children}
    </main>
  );
}
```

- [ ] **Step 3: Revisione delle traduzioni**

Rileggi `messages/en.json` per intero accanto a `it.json`: tono coerente ("court" per "campo", "membership card" per "tessera"), nessuna frase lasciata in italiano. Poi:

Run: `npm test -- tests/i18n.test.ts` → PASS.
Run: `npm run lint` → 0 violazioni di `react/jsx-no-literals`. Se ce n'è qualcuna, sposta il testo nei messaggi.

Controllo manuale: passa a EN dall'intestazione e visita ogni pagina (login, attivazione, dashboard, calendario, prenota, le mie prenotazioni, profilo, notifiche, e tutte le pagine admin). Date in formato inglese a 24 ore, importi in euro. Esci e rientra: la lingua resta quella scelta.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(i18n): language switcher saved on profile and cookie, English review"
```

---

### Task 19: PWA, tema chiaro/scuro e rifinitura responsive

**Files:**
- Create: `src/app/manifest.ts`, `public/icons/icon.svg`, `scripts/make-icons.ts`, `public/sw.js`, `src/components/sw-register.tsx`, `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`, `src/components/mobile-menu.tsx`
- Modify: `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `messages/*.json`

**Interfaces:**
- Consumes: link di navigazione di `AppNav` (Task 7).
- Produces: app installabile ("Aggiungi a schermata Home"), tema chiaro/scuro/sistema, menu laterale su telefono con tutte le voci (admin comprese).

- [ ] **Step 1: Icona e generazione PNG**

`public/icons/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0f766e"/>
  <circle cx="256" cy="256" r="150" fill="#facc15"/>
  <path d="M136 200c80 30 160 30 240 0M136 312c80-30 160-30 240 0" stroke="#0f766e" stroke-width="22" fill="none" stroke-linecap="round"/>
</svg>
```

`scripts/make-icons.ts`:
```ts
import sharp from "sharp";

const sizes = [192, 512];
for (const s of sizes) {
  await sharp("public/icons/icon.svg").resize(s, s).png().toFile(`public/icons/icon-${s}.png`);
}
// Versione "maskable": margine di sicurezza del 10% su sfondo pieno.
await sharp("public/icons/icon.svg").resize(410, 410).extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#0f766e" }).png().toFile("public/icons/maskable-512.png");
await sharp("public/icons/icon.svg").resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
console.log("Icone generate.");
```

Run: `npm run icons` → "Icone generate." Committa i PNG.

- [ ] **Step 2: Manifest, service worker e registrazione**

`src/app/manifest.ts`:
```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Palle Girate",
    short_name: "Palle Girate",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

`public/sw.js`:
```js
// Service worker minimo: serve solo a rendere l'app installabile. Niente cache offline (non richiesta).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
```

`src/components/sw-register.tsx`:
```tsx
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
```

- [ ] **Step 3: Tema**

`src/components/theme-provider.tsx`:
```tsx
"use client";

import { ThemeProvider as NextThemes } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</NextThemes>;
}
```

`src/components/theme-toggle.tsx`:
```tsx
"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const t = useTranslations("common");
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" aria-label={t("theme")} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      <Sun className="size-5 dark:hidden" />
      <Moon className="hidden size-5 dark:block" />
    </Button>
  );
}
```

Aggiungi `"theme": "Tema chiaro/scuro"` / `"theme": "Light/dark theme"` a `common`, e `"menu": "Menu"` / `"menu": "Menu"`.

`src/app/layout.tsx` (versione finale):
```tsx
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: t("name"),
    description: t("tagline"),
    appleWebApp: { capable: true, title: t("name"), statusBarStyle: "default" },
    icons: { apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = { themeColor: "#0f766e", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeProvider>
          <NextIntlClientProvider>
            {children}
            <Toaster richColors />
          </NextIntlClientProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Menu su telefono**

Il menu laterale riceve dal layout (server) le voci già tradotte, così non deve importare le icone né le traduzioni della navigazione.

`src/components/mobile-menu.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileMenu({ links }: { links: { href: string; label: string; section?: string }[] }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("menu")}><Menu className="size-5" /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader><SheetTitle>{t("menu")}</SheetTitle></SheetHeader>
        <nav className="mt-4 flex flex-col gap-1">
          {links.map((l) => (
            <div key={l.href}>
              {l.section && <p className="mt-4 px-3 text-xs uppercase text-muted-foreground">{l.section}</p>}
              <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-accent">{l.label}</Link>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

In `src/app/(app)/layout.tsx`, costruisci le voci con `getTranslations("nav")`:
```tsx
const tn = await getTranslations("nav");
const links = [
  { href: "/dashboard", label: tn("dashboard") }, { href: "/calendar", label: tn("calendar") }, { href: "/book", label: tn("book") },
  { href: "/bookings", label: tn("bookings") }, { href: "/notifications", label: tn("notifications") }, { href: "/profile", label: tn("profile") },
  ...(user.isAdmin
    ? [
        { href: "/admin/dashboard", label: tn("adminDashboard"), section: tn("admin") }, { href: "/admin/members", label: tn("adminMembers") },
        { href: "/admin/bookings", label: tn("adminBookings") }, { href: "/admin/payments", label: tn("adminPayments") }, { href: "/admin/settings", label: tn("adminSettings") },
      ]
    : []),
];
```
e l'header diventa:
```tsx
<header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
  <MobileMenu links={links} />
  <div className="ml-auto flex items-center gap-1">
    <LocaleSwitcher />
    <ThemeToggle />
    <NotificationBell unread={unread} items={bellItems} />
  </div>
</header>
```

- [ ] **Step 5: Controllo responsive**

Con gli strumenti per sviluppatori del browser, a 375 px di larghezza, controlla ogni pagina: niente scroll orizzontale della pagina (le tabelle scorrono dentro il loro contenitore), la barra in basso non copre il contenuto (`pb-24` su `main`), i pulsanti sono toccabili (almeno 36 px), i dialog stanno nello schermo. Correggi le classi Tailwind dove serve.

- [ ] **Step 6: Verifica PWA e commit**

Run: `npm run build && npm start`, poi apri `http://localhost:3000`. In Chrome DevTools → Application → Manifest non ci sono errori e "Installable" è sì; il service worker risulta attivo.

```bash
git add -A
git commit -m "feat(pwa): manifest, icons, minimal service worker, theme toggle and mobile menu"
```

---

### Task 20: Chiusura della Sessione 2

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Verifica completa**

Run: `npm test` → tutti PASS. `npm run lint` → 0 errori. `npm run build` → OK.

Giro manuale finale (in italiano e poi in inglese):
1. Attivazione di `paolo@example.it`, login, prenotazione dal calendario, modifica, cancellazione.
2. Admin: crea un socio, una prenotazione per lui, la cancella in ritardo e registra il pagamento; segna 2 insoluti → blocco e prenotazioni future cancellate → paga → sblocco.
3. Notifiche: la campanella mostra le non lette e "segna tutte" le azzera.
4. Telefono (375 px): calendario con un campo alla volta, menu laterale, installazione PWA.

- [ ] **Step 2: README finale**

Aggiungi a `README.md`:
````markdown
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
````

- [ ] **Step 3: Commit e push**

```bash
git add -A
git commit -m "docs: final README with features, PostgreSQL migration and production notes"
git push origin main
```
Se il push viene rifiutato perché il remoto è avanti: `git pull --rebase origin main`, poi di nuovo `git push`. Mai `--force`.
