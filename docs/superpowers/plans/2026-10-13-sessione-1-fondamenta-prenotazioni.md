# Palle Girate – Sessione 1: fondamenta e prenotazioni – Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web-app Next.js in cui i soci vedono la disponibilità dei campi e prenotano/modificano/cancellano nel rispetto delle regole §7, senza mai sovrapposizioni, e l'admin gestisce soci e tessere.

**Architecture:** Next.js App Router full-stack. Le regole di prenotazione sono un modulo puro (`src/lib/booking-rules`) senza dipendenze da Next/Prisma. Un servizio (`src/lib/booking-service.ts`) applica le regole e scrive in transazione la prenotazione e le righe di occupazione (una per quarto d'ora, indice univoco) che rendono impossibili le sovrapposizioni.

**Tech Stack:** Next.js (App Router, TypeScript), Prisma + SQLite, Auth.js (Credentials, JWT), bcryptjs, luxon, zod, next-intl, Tailwind + shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-palle-girate-design.md` (requisiti: `docs/requirements.md`). Questo piano copre la **Sessione 1** (§11 della spec). Pagamenti/strike, notifiche, dashboard, PWA, traduzioni EN complete e nice to have sono nel piano della Sessione 2 (da scrivere dopo).

## Global Constraints

- Fuso orario `Europe/Rome` per tutte le regole; date salvate in UTC; regole calcolate solo lato server.
- Orari di inizio a multipli di 15 min; apertura 08:00, chiusura 23:00; fine ≤ chiusura.
- Durata = 1 o 2 × durata slot del campo (`MAX_SLOTS_PER_BOOKING = 2`, in Settings).
- Anticipo max 14 giorni di calendario; max 3 prenotazioni attive (`CONFIRMED` future); modifica/cancellazione socio fino a 2 ore prima dell'inizio **originale**; giorno prenotazione ≤ scadenza tessera.
- L'admin salta tutte le regole **tranne** non-sovrapposizione e orari di apertura.
- Nessuna stringa cablata nei componenti: tutto via next-intl (`messages/it.json`, `messages/en.json`).
- Il socio non vede mai nome/dati di chi ha prenotato un campo.
- Seed: 5 campi (Calcio 90 min 60 €, Tennis 1 e Tennis 2 60 min 18 €, Basket 60 min 25 €, Bocce 60 min 10 €), admin da `.env`, soci di esempio.
- Git: remoto `https://github.com/simonetamagno25-blip/PalleGirate`, branch `main`, commit frequenti, `.env.example`, nessun segreto committato.
- Gira con `npm install` + `npm run dev`.

## Review Focus

1. Cambio ora legale (domenica 25/10/2026 e 28/03/2027): una prenotazione alle 08:00 o 22:00 ha l'orario locale giusto e durata corretta (test in Task 2).
2. Modificare una prenotazione verso uno slot che si sovrappone **alla prenotazione stessa** (es. allungarla di un quarto d'ora) deve riuscire; non è un conflitto con sé stessa (Task 3).
3. Cancellare due volte la stessa prenotazione, o modificare una già cancellata: errore pulito, nessuna riga di occupazione orfana (Task 3).
4. Attivazione con numero tessera giusto ma email con maiuscole/spazi diversi funziona; tessera inesistente, email sbagliata o account già attivo danno lo **stesso** errore generico (niente enumerazione di soci) (Task 5).
5. Il calendario pubblico al socio non contiene mai nome, cognome o id utente degli altri nella risposta, nemmeno nei dati serializzati (Task 8).

---

## Mappa dei file

```
prisma/schema.prisma, prisma/seed.ts
src/lib/db.ts                      client Prisma singleton
src/lib/time.ts                    helper Europe/Rome (luxon)
src/lib/booking-rules/index.ts     regole pure §7 (nessun import da next/prisma)
src/lib/booking-service.ts         create/update/cancel + occupazione, in transazione
src/lib/auth.ts                    config Auth.js + getSessionUser/requireAdmin/requireMember
src/lib/members.ts                 servizio soci/tessere (admin) + attivazione
src/lib/availability.ts            lettura disponibilità (con/senza dati admin)
src/i18n/*, messages/{it,en}.json  next-intl
src/app/[locale]/(auth)/...        login, attiva account
src/app/[locale]/(app)/...         calendario, prenota, le mie prenotazioni, profilo
src/app/[locale]/admin/...         soci e tessere, prenotazioni
tests/*.test.ts                    Vitest
```

---

### Task 1: Scaffold, strumenti e repository

**Files:**
- Create: progetto Next.js nella radice, `.env.example`, `.gitignore`, `README.md`, `vitest.config.ts`, `tests/smoke.test.ts`
- Modify: `package.json` (script `test`, `db:push`, `db:seed`)

**Interfaces:**
- Produces: script npm `dev`, `build`, `test` (`vitest run`), `db:seed`; alias `@/*` → `src/*`.

- [ ] **Step 1:** Crea l'app con `npx create-next-app@latest . --ts --tailwind --app --src-dir --eslint --use-npm --import-alias "@/*"` (la cartella contiene già `docs/` e l'`.odt`: conferma la creazione nella cartella non vuota). Installa: `prisma @prisma/client next-auth@beta bcryptjs luxon zod next-intl`, dev: `vitest tsx @types/bcryptjs @types/luxon`; inizializza shadcn/ui (`npx shadcn@latest init`).
- [ ] **Step 2:** Scrivi `tests/smoke.test.ts` con `expect(1 + 1).toBe(2)`; configura `vitest.config.ts` (environment `node`, alias `@`); aggiungi lo script `test`. Esegui `npm test` → PASS.
- [ ] **Step 3:** `.env.example` con `DATABASE_URL="file:./dev.db"`, `AUTH_SECRET=`, `ADMIN_EMAIL=`, `ADMIN_PASSWORD=`. Verifica che `.gitignore` escluda `.env`, `*.db`, `.next`, `node_modules`. `README.md` iniziale: installazione, `cp .env.example .env`, `npm run dev`.
- [ ] **Step 4:** Esegui `npm run build` → build riuscita.
- [ ] **Step 5:** Imposta il remoto e commit:

```bash
git remote add origin https://github.com/simonetamagno25-blip/PalleGirate
git add -A && git commit -m "chore: scaffold Next.js, Vitest e tooling"
```

---

### Task 2: Helper di tempo e regole pure di prenotazione (TDD)

**Files:**
- Create: `src/lib/time.ts`, `src/lib/booking-rules/index.ts`
- Test: `tests/time.test.ts`, `tests/booking-rules.test.ts`

**Interfaces:**
- Produces (`time.ts`):
  - `ROME = 'Europe/Rome'`
  - `romeDay(d: Date): string` → `'YYYY-MM-DD'` del giorno di calendario a Roma
  - `romeMinutesOfDay(d: Date): number` → minuti dalla mezzanotte locale
  - `fromRome(day: string, hhmm: string): Date` → istante UTC di quell'ora locale
  - `daysBetween(fromDay: string, toDay: string): number`
- Produces (`booking-rules/index.ts`):
  ```ts
  export type Settings = { openMinutes: number; closeMinutes: number; stepMinutes: number;
    maxAdvanceDays: number; maxActiveBookings: number; changeWindowHours: number;
    maxSlotsPerBooking: number; membershipWarnDays: number }
  export type Violation = 'NOT_ON_STEP'|'BEFORE_OPENING'|'AFTER_CLOSING'|'BAD_DURATION'
    |'IN_PAST'|'TOO_FAR_AHEAD'|'MEMBERSHIP_EXPIRED'|'MAX_ACTIVE_REACHED'|'BLOCKED'|'OVERLAP'
  export type RuleContext = { start: Date; end: Date; fieldSlotMinutes: number; now: Date;
    settings: Settings; membershipExpiresAt: Date | null; activeCount: number; blocked: boolean }
  export function checkOpeningHours(c: Pick<RuleContext,'start'|'end'|'settings'>): Violation[]  // 1 (+ passo 15)
  export function checkMemberRules(c: RuleContext): Violation[]   // 1–7, tutte le violazioni
  export function checkAdminRules(c: Pick<RuleContext,'start'|'end'|'settings'|'fieldSlotMinutes'>): Violation[] // solo orari apertura + durata valida
  export function canChangeOrCancel(originalStart: Date, now: Date, s: Settings): boolean  // now ≤ start − 2h
  export function isBlocked(x: { strikes: number; unpaidCount: number }): boolean  // strikes ≥ 2 && unpaidCount ≥ 1
  export function quarterStarts(start: Date, end: Date): Date[]  // un Date per ogni quarto d'ora [start, end)
  export const DEFAULT_SETTINGS: Settings
  ```

- [ ] **Step 1: Test dei helper** in `tests/time.test.ts`: `romeDay(new Date('2026-10-24T22:30:00Z')) === '2026-10-25'` (00:30 a Roma); `fromRome('2026-10-25','08:00')` = `2026-10-25T07:00:00Z` (dopo il cambio ora legale); `fromRome('2026-10-24','08:00')` = `2026-10-24T06:00:00Z`; `daysBetween('2026-10-13','2026-10-27') === 14`.
- [ ] **Step 2:** Esegui → FAIL. Implementa `time.ts` con luxon (`DateTime.fromISO(..., { zone: ROME })`). Esegui → PASS. Commit `feat: helper di tempo Europe/Rome`.
- [ ] **Step 3: Test delle regole** in `tests/booking-rules.test.ts`, un test per riga, con `now = fromRome('2026-10-13','12:00')` e tennis (slot 60):
  - 08:00–09:00 ok; 08:10 → `NOT_ON_STEP`; 07:45 → `BEFORE_OPENING`; 22:00–23:00 ok; 22:15–23:15 → `AFTER_CLOSING`; calcio 90 min e 180 min ok, 120 → `BAD_DURATION`; tennis 180 → `BAD_DURATION`; `start < now` → `IN_PAST`.
  - Anticipo: prenotazione il 27/10 (oggi+14) ok anche alle 22:00; il 28/10 → `TOO_FAR_AHEAD`. Con `now = 2026-10-13T23:59 Roma` il limite è ancora 27/10. Attraversando il cambio ora legale (`now` 2026-10-20, prenotazione 2026-11-03 ok, 2026-11-04 → `TOO_FAR_AHEAD`).
  - Tessera: scadenza 2026-12-31 → prenotazione il 31/12 alle 22:00 ok; l'1/1 → `MEMBERSHIP_EXPIRED`; `membershipExpiresAt: null` → `MEMBERSHIP_EXPIRED`.
  - `activeCount: 2` ok, `3` → `MAX_ACTIVE_REACHED`; `blocked: true` → `BLOCKED`.
  - `canChangeOrCancel`: esattamente 2h prima → true; 1h59m59s → false.
  - `isBlocked`: (0,0) (1,1) false; (2,1) true; (2,0) false; (3,2) true.
  - `checkAdminRules` ignora anticipo, tessera, limite attive, blocco ma segnala `AFTER_CLOSING`.
  - `quarterStarts` di 08:00–09:30 → 6 elementi.
- [ ] **Step 4:** Esegui → FAIL. Implementa le funzioni in `booking-rules/index.ts` (il modulo importa solo `luxon` e `@/lib/time`; niente Next/Prisma). `checkMemberRules` restituisce **tutte** le violazioni, nell'ordine dell'unione `Violation`. Esegui → PASS.
- [ ] **Step 5:** Commit `feat: regole pure di prenotazione con test`.

---

### Task 3: Schema dati, seed e servizio di prenotazione (TDD)

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/db.ts`, `src/lib/booking-service.ts`
- Test: `tests/booking-service.test.ts` (DB SQLite di test: `DATABASE_URL=file:./test.db`, `prisma db push` in `globalSetup`)

**Interfaces:**
- Consumes: tutto da `booking-rules`.
- Produces (schema): modelli `User` (`isAdmin`, `firstName`, `lastName`, `birthDate`, `email` unique, `phone`, `locale`, `passwordHash?`, `activatedAt?`), `Membership` (`userId` unique, `number` unique, `issuedAt`, `expiresAt`), `MembershipRenewal` (storico), `Field` (`name`, `sport`, `slotMinutes`, `pricePerSlot` in centesimi, `active`), `Settings` (riga singola, campi come `Settings` del Task 2), `Booking` (`userId`, `fieldId`, `start`, `end`, `slots`, `priceCents`, `status` CONFIRMED|CANCELLED, `cancelReason?`, `cancelledById?`, `paymentStatus` PENDING|PAID|UNPAID|EXEMPT default PENDING, `chargeable` default false, `noShow` default false, `createdAt`), `Strike` (`userId`, `bookingId`, `createdAt`), `Notification` (`userId`, `type`, `params` JSON string, `read`, `createdAt`), **`Occupancy`** (`fieldId`, `quarterStart`, `bookingId` con `@@unique([fieldId, quarterStart])`, cancellazione a cascata dal booking). Gli ultimi tre servono alla Sessione 2 ma si creano ora per non rifare la migrazione.
- Produces (servizio):
  ```ts
  export type Actor = { id: string; isAdmin: boolean }
  export class BookingError extends Error { violations: Violation[] | ('NOT_FOUND'|'FORBIDDEN'|'ALREADY_CANCELLED'|'WINDOW_CLOSED'|'FIELD_INACTIVE')[] }
  export function createBooking(actor: Actor, input: { memberId: string; fieldId: string; start: Date; slots: number }): Promise<Booking>
  export function updateBooking(actor: Actor, bookingId: string, input: { fieldId: string; start: Date; slots: number }): Promise<Booking>
  export function cancelBooking(actor: Actor, bookingId: string, reason?: string): Promise<Booking>
  ```
  Regole di accesso: un socio agisce solo sulle proprie prenotazioni (`FORBIDDEN` altrimenti) e per sé (`memberId === actor.id`); l'admin su qualsiasi (nessuna regola socio, vedi Global Constraints).

- [ ] **Step 1:** Scrivi lo schema Prisma come sopra, `prisma db push`, client in `db.ts`. Scrivi `seed.ts` (idempotente, usa `upsert`): Settings default, 5 campi, admin da `ADMIN_EMAIL`/`ADMIN_PASSWORD` (bcrypt, senza tessera), 3 soci di esempio con tessera, uno già attivato (password `socio1234`). Script `db:seed` via `tsx`. Esegui il seed → nessun errore, seconda esecuzione idem.
- [ ] **Step 2: Test** in `tests/booking-service.test.ts` (fixture: socio con tessera valida, tennis, `now` iniettabile con `vi.useFakeTimers`):
  - creazione ok: scrive `Booking` + 4 righe `Occupancy` per 1 ora, `priceCents` = slots × prezzo (2 slot tennis → 3600);
  - seconda prenotazione sovrapposta (anche solo di 15 min, anche con altro socio) → `BookingError` con `OVERLAP`; prenotazione adiacente (09:00 dopo 08:00–09:00) ok;
  - **concorrenza**: `Promise.all` di due `createBooking` identici di soci diversi → esattamente uno riesce, l'altro `OVERLAP`, 4 righe di occupazione in tutto;
  - 4ª prenotazione attiva → `MAX_ACTIVE_REACHED`; socio bloccato → `BLOCKED`; l'admin crea per socio bloccato con tessera scaduta oltre i 14 giorni → ok, ma fuori orario → `AFTER_CLOSING`; campo non attivo → `FIELD_INACTIVE`;
  - `updateBooking`: cambio campo (tennis → basket) ricalcola prezzo e sposta l'occupazione (vecchie righe libere); **allungare di 15 min la prenotazione stessa riesce**; nuovo slot occupato → `OVERLAP` e la prenotazione originale resta intatta; modifica a meno di 2h dall'inizio originale → `WINDOW_CLOSED`; la modifica non incrementa il conteggio attive (3 attive, modifica ok); cambio verso calcio con `slots: 1` ⇒ durata 90 min;
  - `cancelBooking`: socio entro finestra ok → `CANCELLED`, righe di occupazione eliminate, slot di nuovo prenotabile; a meno di 2h → `WINDOW_CLOSED`; seconda cancellazione → `ALREADY_CANCELLED`; modifica di una cancellata → `ALREADY_CANCELLED`; socio su prenotazione altrui → `FORBIDDEN`; admin cancella sempre (e salva `cancelledById`, `cancelReason`).
- [ ] **Step 3:** Esegui → FAIL. Implementa il servizio: ogni funzione fa il caricamento dei dati e dei Settings **dentro** `prisma.$transaction`; conta le attive con `status=CONFIRMED AND start > now` escludendo la prenotazione in modifica; calcola `end = start + slots × slotMinutes`; traduce l'errore di unicità Prisma `P2002` su `Occupancy` in `BookingError(['OVERLAP'])`. Nota SQLite: per le scritture concorrenti usa `DATABASE_URL` con `?connection_limit=1` nei test così le transazioni si serializzano.
- [ ] **Step 4:** Esegui tutti i test → PASS. Commit `feat: schema dati, seed e servizio prenotazioni con vincolo anti-sovrapposizione`.

---

### Task 4: Autenticazione, ruoli e attivazione account (TDD sul servizio)

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/members.ts` (parte attivazione), `src/app/[locale]/(auth)/login/page.tsx`, `src/app/[locale]/(auth)/attiva/page.tsx`, `src/middleware.ts`
- Test: `tests/activation.test.ts`

**Interfaces:**
- Produces:
  - `activateAccount(input: { membershipNumber: string; email: string; password: string }): Promise<void>` — lancia `Error('ACTIVATION_FAILED')` con lo **stesso** messaggio per tessera inesistente, email non corrispondente, account già attivo; confronto email case-insensitive e trim; password minimo 8 caratteri (`zod`), altrimenti `Error('WEAK_PASSWORD')`.
  - `getSessionUser(): Promise<{ id: string; isAdmin: boolean; locale: 'it'|'en' } | null>`
  - `requireMember()` / `requireAdmin()` — redirect al login / 403 lato server; ogni Server Action e route handler delle task successive li chiama come prima istruzione.
- Auth.js Credentials (email + password, bcrypt), sessione JWT con `id` e `isAdmin`. Il middleware protegge solo l'accesso alle pagine autenticate; l'autorizzazione vera è nei `require*`.

- [ ] **Step 1: Test** `activation.test.ts`: attivazione riuscita imposta `passwordHash` e `activatedAt`; `'  MARIO@Example.com '` funziona; tessera inesistente / email sbagliata / già attivato → stesso errore `ACTIVATION_FAILED`; password di 7 caratteri → `WEAK_PASSWORD`; l'hash non è la password in chiaro.
- [ ] **Step 2:** Esegui → FAIL; implementa `activateAccount`. Esegui → PASS.
- [ ] **Step 3:** Configura Auth.js (`authorize` rifiuta utenti con `passwordHash` nullo), `getSessionUser`, `requireMember`, `requireAdmin`, pagine login e attivazione (testi dalle chiavi i18n del Task 6; fino ad allora segnaposto di chiave).
- [ ] **Step 4:** Verifica manuale con `npm run dev`: login admin del seed, login socio del seed, `/admin` da socio → negato. Commit `feat: autenticazione, ruoli e attivazione account`.

---

### Task 5: Soci e tessere (area admin)

**Files:**
- Modify: `src/lib/members.ts`
- Create: `src/app/[locale]/admin/members/page.tsx` (+ form crea/modifica, azioni rinnova/reimposta/promuovi)
- Test: `tests/members.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function createMember(admin: Actor, d: { firstName; lastName; birthDate: Date; email; phone; membershipNumber; issuedAt: Date; expiresAt?: Date }): Promise<User>  // expiresAt default = issuedAt + 1 anno
  export function updateMember(admin: Actor, id: string, d: Partial<...>): Promise<User>
  export function renewMembership(admin: Actor, userId: string, d?: { expiresAt?: Date }, now?: Date): Promise<Membership>
  export function resetAccess(admin: Actor, userId: string): Promise<void>   // passwordHash=null, activatedAt=null
  export function setAdmin(admin: Actor, userId: string, isAdmin: boolean): Promise<void>
  ```
  Tutte rifiutano chi non è admin (`FORBIDDEN`). Il numero tessera e l'email sono univoci (`DUPLICATE_MEMBERSHIP_NUMBER` / `DUPLICATE_EMAIL`).

- [ ] **Step 1: Test:** creazione con scadenza di default +1 anno; numero tessera duplicato → errore; `renewMembership` con scadenza 2026-12-01 e `now` 2026-10-13 → nuova emissione = oggi, scadenza 2027-12-01 (max(oggi, scadenza) + 1 anno); con scadenza già passata (2026-01-01) → scadenza `oggi + 1 anno`; il numero tessera non cambia e nello storico (`MembershipRenewal`) resta una riga; `resetAccess` poi `activateAccount` funziona di nuovo; un non-admin riceve `FORBIDDEN` da ogni funzione; `setAdmin` impedisce di togliere i diritti all'**ultimo** admin (`LAST_ADMIN`).
- [ ] **Step 2:** Esegui → FAIL; implementa. Esegui → PASS.
- [ ] **Step 3:** UI admin: tabella soci (ricerca per nome/tessera, badge scadenza), form creazione/modifica con validazione `zod`, pulsanti Rinnova, Reimposta accesso, Rendi admin. Verifica a mano. Commit `feat: gestione soci e tessere lato admin`.

---

### Task 6: Infrastruttura i18n

**Files:**
- Create: `src/i18n/routing.ts`, `src/i18n/request.ts`, `messages/it.json`, `messages/en.json`, `src/components/LocaleSwitcher.tsx`
- Modify: `src/middleware.ts` (compone next-intl con la protezione del Task 4), `src/app/[locale]/layout.tsx`
- Test: `tests/i18n.test.ts`

**Interfaces:**
- Produces: locale `it` (default) e `en`; `LocaleSwitcher` che salva `User.locale` con una Server Action `setLocale(locale: 'it'|'en')`; messaggi con namespace `auth`, `calendar`, `booking`, `admin`, `errors` (le chiavi di `Violation` stanno in `errors.violation.<CODICE>`).

- [ ] **Step 1: Test:** `it.json` ed `en.json` hanno **lo stesso insieme di chiavi** (appiattite); ogni `Violation` ha una chiave `errors.violation.*` in entrambi; nessun valore vuoto in `it.json`.
- [ ] **Step 2:** Esegui → FAIL. Crea la configurazione next-intl, i file di messaggi (IT completo per le schermate della Sessione 1, EN con le stesse chiavi), il selettore lingua e sposta i testi segnaposto dei Task 4–5 nelle chiavi. Esegui → PASS.
- [ ] **Step 3:** Verifica a mano il cambio lingua. Commit `feat: infrastruttura i18n IT/EN`.

---

### Task 7: Disponibilità e calendario

**Files:**
- Create: `src/lib/availability.ts`, `src/app/[locale]/(app)/calendar/page.tsx`, `src/components/DayCalendar.tsx`
- Test: `tests/availability.test.ts`

**Interfaces:**
- Consumes: `Occupancy`, `Field`, `Settings`, `quarterStarts`, `fromRome`.
- Produces:
  ```ts
  export type PublicSlot = { fieldId: string; start: string /*ISO UTC*/; end: string; }   // solo intervalli occupati, nessun dato persona
  export type AdminSlot = PublicSlot & { bookingId: string; memberName: string }
  export function getDayAvailability(day: string /*YYYY-MM-DD*/, opts: { admin: false }): Promise<{ fields: FieldInfo[]; busy: PublicSlot[] }>
  export function getDayAvailability(day: string, opts: { admin: true }): Promise<{ fields: FieldInfo[]; busy: AdminSlot[] }>
  ```
  Gli intervalli occupati sono costruiti raggruppando le righe `Occupancy` contigue per prenotazione; il tipo pubblico non contiene alcun campo persona.

- [ ] **Step 1: Test:** con due prenotazioni di soci diversi in un giorno, la risposta `admin:false` contiene gli intervalli giusti e `JSON.stringify(result)` **non** contiene nome, cognome, email né `userId` dei soci; con `admin:true` contiene `memberName`; una prenotazione `CANCELLED` non compare; campi non attivi esclusi.
- [ ] **Step 2:** Esegui → FAIL; implementa. Esegui → PASS.
- [ ] **Step 3:** UI: `DayCalendar` — vista giorno, colonne per campo, righe a quarti d'ora dalle 08:00 alle 23:00, libero/occupato con colori distinguibili; navigazione giorno precedente/successivo; su mobile un solo campo con selettore; click su slot libero → `/booking/new?fieldId=…&start=…`. L'admin vede il nome nello slot. Verifica a mano. Commit `feat: calendario disponibilità`.

---

### Task 8: Prenotazione guidata e "le mie prenotazioni"

**Files:**
- Create: `src/app/[locale]/(app)/booking/new/page.tsx`, `src/app/[locale]/(app)/bookings/page.tsx`, `src/app/[locale]/(app)/bookings/[id]/edit/page.tsx`, `src/app/[locale]/(app)/actions.ts`, `src/app/[locale]/(app)/profile/page.tsx`, `src/app/[locale]/admin/bookings/page.tsx`
- Test: `tests/booking-actions.test.ts`

**Interfaces:**
- Produces (Server Actions in `actions.ts`, ognuna inizia con `requireMember()` o `requireAdmin()`, valida con zod):
  - `createBookingAction(form: { fieldId: string; day: string; time: string; slots: 1|2 })` → `{ ok: true; id: string } | { ok: false; violations: string[] }` (i codici sono le chiavi `errors.violation.*`)
  - `updateBookingAction(id: string, form: { fieldId; day; time; slots })`, `cancelBookingAction(id: string, reason?: string)`
  - `adminCreateBookingAction(form: { memberId; fieldId; day; time; slots })`, `adminCancelBookingAction(id: string, reason: string)`
  - `previewPriceAction(fieldId: string, slots: 1|2): Promise<number /*centesimi*/>`

- [ ] **Step 1: Test** delle action (chiamate con `getSessionUser` mockato): un socio non può passare un `memberId` diverso; un utente non autenticato è respinto; `day`/`time` malformati → errore di validazione, non eccezione; violazioni restituite come codici; `adminCreateBookingAction` da un socio → `FORBIDDEN`.
- [ ] **Step 2:** Esegui → FAIL; implementa le action sopra `booking-service` (conversione `day`+`time` → UTC con `fromRome`). Esegui → PASS.
- [ ] **Step 3:** UI: prenotazione guidata a passi (campo → giorno → orario a passi di 15 min → durata 1/2 slot → riepilogo con prezzo → conferma), precompilata dal click sul calendario; errori tradotti. "Le mie prenotazioni": future (con Modifica/Cancella; i pulsanti spariscono quando `canChangeOrCancel` è falso, calcolato dal server) e storico; la cancellazione chiede il motivo facoltativo. Profilo: dati e tessera (numero, scadenza), selettore lingua. Admin: elenco di tutte le prenotazioni con filtri (campo, giorno, socio), crea per socio, cancella con motivo consigliato.
- [ ] **Step 3b:** Verifica a mano l'intero flusso nel browser (socio e admin), incluso un conflitto reale tra due schede.
- [ ] **Step 4:** Commit `feat: prenotazione guidata, le mie prenotazioni e prenotazioni admin`.

---

### Task 9: Verifica finale e push

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Aggiorna il README: requisiti, setup (`npm install`, `.env`, `npx prisma db push`, `npm run db:seed`, `npm run dev`), credenziali del seed, come lanciare i test, scelta dello stack e nota su come passare a PostgreSQL (da completare in Sessione 2).
- [ ] **Step 2:** Esegui `npm test` → tutto PASS; `npm run build` → OK; `npm run lint` → senza errori.
- [ ] **Step 3:** Da un clone pulito (cartella temporanea) verifica che `npm install` + `cp .env.example .env` + `db push` + seed + `npm run dev` partano.
- [ ] **Step 4:** Commit `docs: README sessione 1` e `git push -u origin main` (conferma con l'utente prima del push, il remoto è esterno).

---

## Self-review

- **Copertura spec (Sessione 1):** setup/Git → T1, T9; modello dati → T3; auth e ruoli, attivazione → T4; soci e tessere → T5; i18n infrastruttura → T6; calendario → T7; flusso di prenotazione, modifica, cancellazione, profilo → T8; regole §7.1–8 → T2/T3; test §12 relativi (15 min, 23:00, 1/2 slot, anticipo con mezzanotte e ora legale, tessera, max 3, finestra 2h, sovrapposizione concorrente) → T2/T3. Strike/blocco: solo la funzione `isBlocked` e la regola `BLOCKED`; flusso pagamenti, cancellazione automatica e sblocco → Sessione 2.
- **Punto aperto della spec §13** (prenotazioni admin nel limite di 3): le prenotazioni create dall'admin contano tra le attive del socio, ma l'admin non è soggetto al limite (come da consiglio).
- **Coerenza dei tipi:** `Violation`, `Settings`, `Actor`, `BookingError` definiti in T2/T3 e usati con gli stessi nomi in T7–T8.
