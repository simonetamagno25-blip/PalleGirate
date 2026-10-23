# Palle Girate – Sessione 2: pagamenti, notifiche, dashboard, PWA – Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completare l'app: l'admin registra i pagamenti con strike, blocco automatico e sblocco; notifiche con campanella; impostazioni e campi modificabili; dashboard socio e admin con grafici; EN completo; PWA installabile; chiusura dei rilievi rinviati dalla Sessione 1.

**Architecture:** Si estende il codice della Sessione 1 senza cambiarne l'impianto: logica di dominio in servizi `src/lib/*.ts` testati con Vitest (transazioni Prisma, errori come `BookingError` con codici tradotti da `errors.booking.*`), pagine e Server Actions sottili sopra i servizi. Le notifiche sono righe `Notification` scritte nella stessa transazione dell'evento; quelle temporali sono pigre e idempotenti (chiave `dedupeKey` univoca per utente).

**Tech Stack:** Next.js 16.4 (App Router), Prisma 6 + SQLite, Auth.js (JWT), next-intl, Tailwind + shadcn (Base UI), Recharts (nuovo), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-palle-girate-design.md` (§5, §6, §8, §9, §10, §11, §12, §14); requisiti: `docs/requirements.md`. Piano precedente: `docs/superpowers/plans/2026-10-13-sessione-1-fondamenta-prenotazioni.md`.

**Base di partenza:** il codice della Sessione 1 sta nel branch `worktree-sessione-1` (commit finale e6ec46b), **non ancora unito a `main`**. Prima del Task 1 chiedere all'utente se fare merge locale su `main`, PR o proseguire sul branch; poi lavorare in una worktree/branch nuovo (`sessione-2`) da quella base. Setup e trucchi (Next 16, shadcn Base UI, playwright con Edge, hook Bash della worktree) sono nella memoria `reference-palle-girate-setup`.

## Global Constraints

- Fuso `Europe/Rome`; date in UTC nel DB; tutte le regole temporali calcolate sul server.
- Strike **non si azzerano mai**: 1° insoluto → avviso; 2° e successivi → blocco immediato + cancellazione automatica delle prenotazioni future del socio (con notifica e motivo). Bloccato = `strike ≥ 2` **e** almeno un `UNPAID` (già in `isBlocked`). Sblocco quando non restano insoluti.
- `UNPAID → EXEMPT` rimuove lo strike di quella prenotazione; `UNPAID → PAID` lo lascia.
- Cancellazione dell'admin a meno di `changeWindowHours` dall'inizio: `chargeable = true` (già fatto in S1; non cambiare).
- L'admin salta le regole del socio tranne sovrapposizione e orari; le azioni "come socio" di un admin-socio restano soggette alle regole del socio.
- Il socio non vede mai dati personali di altri; ogni query/azione admin parte da `requireAdmin()`; ogni azione del socio da `requireMember()`.
- Nessuna stringa cablata: ogni chiave nuova va in **entrambi** `messages/it.json` e `messages/en.json` (il test `tests/i18n.test.ts` verifica parità e che ogni codice di `BOOKING_ERROR_CODES` abbia `errors.booking.<codice>`).
- Prezzi in centesimi; valuta EUR, orari 24h.
- Schema Prisma compatibile con PostgreSQL; sessioni JWT; nessun cron obbligatorio.
- Commit frequenti in italiano, ognuno terminato da `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. **Nessun push né merge senza chiedere all'utente.**
- Un comando semplice per chiamata Bash nella worktree (vedi memoria `feedback-palle-girate-ambiente`).

## Review Focus

1. Registrare due volte lo stesso esito, o due admin che lo registrano insieme, crea **un solo** strike e una sola notifica (Task 3).
2. Un socio non può leggere né segnare come lette le notifiche di un altro, nemmeno conoscendone l'id (Task 2).
3. Il blocco cancella solo le prenotazioni `CONFIRMED` con inizio futuro: non quelle in corso, né già concluse, né già cancellate; le cancellate dal sistema non diventano `chargeable` (Task 3).
4. Notifiche temporali (promemoria, tessera) generate due volte o da richieste concorrenti restano una sola; dopo un rinnovo la nuova scadenza genera un nuovo avviso (Task 6).
5. Impostazioni incoerenti (apertura ≥ chiusura, passo non multiplo di 15, valori ≤ 0) e disattivazione/cambio durata di un campo con prenotazioni future sono rifiutati o richiedono conferma esplicita, senza lasciare occupazioni orfane (Task 5).

---

## Mappa dei file

```
prisma/schema.prisma                         + Notification.dedupeKey, User.sessionVersion
src/lib/notifications.ts                     notify, list, unreadCount, markRead, markAllRead
src/lib/payments.ts                          registerPayment, setNoShow, listPendingPayments, getMemberLedger
src/lib/admin-config.ts                      updateSettings, createField, updateField, setFieldActive
src/lib/lazy-notifications.ts                runLazyNotifications
src/lib/rate-limit.ts                        checkRateLimit
src/lib/stats-member.ts, stats-admin.ts      dati dei dashboard
src/lib/reasons.ts                           codici motivo di sistema + displayReason
src/components/NotificationBell.tsx          campanella con badge (server)
src/components/charts/*                      grafici Recharts (client)
src/app/[locale]/(app)/notifications/        lista notifiche + azioni
src/app/[locale]/(app)/dashboard/            dashboard socio
src/app/[locale]/admin/{payments,settings,fields,dashboard}/, admin/members/[id]/
src/app/manifest.ts, src/app/pwa-icon/[size]/route.tsx, public/sw.js
src/app/[locale]/{error,not-found}.tsx
tests/{notifications,payments,admin-config,lazy-notifications,rate-limit,hardening,stats,pwa}.test.ts
```

---

### Task 1: Servizio notifiche e collegamento alle prenotazioni

**Files:**
- Modify: `prisma/schema.prisma` (Notification: `dedupeKey String?`, `@@unique([userId, dedupeKey])`)
- Create: `src/lib/notifications.ts`, `src/lib/reasons.ts`, `tests/notifications.test.ts`
- Modify: `src/lib/booking-service.ts`, `tests/booking-service.test.ts`, `messages/{it,en}.json`

**Interfaces:**
- Produces (`notifications.ts`):
  - `NOTIFICATION_TYPES = ['BOOKING_CREATED','BOOKING_UPDATED','BOOKING_CANCELLED','STRIKE_WARNING','ACCOUNT_BLOCKED','ACCOUNT_UNBLOCKED','BOOKING_REMINDER','MEMBERSHIP_EXPIRING','MEMBERSHIP_EXPIRED'] as const`; `type NotificationType`
  - `type NotifyParams = Record<string, string | number | boolean | null>`
  - `notify(db: PrismaClient | Prisma.TransactionClient, userId: string, type: NotificationType, params: NotifyParams, dedupeKey?: string): Promise<boolean>` — `false` se `dedupeKey` esiste già (cattura `P2002`). Con `dedupeKey` va chiamata **fuori** da una transazione (in PostgreSQL un errore interrompe la transazione).
  - `listNotifications(userId: string, limit = 50): Promise<Notification[]>` (più recenti prima), `unreadCount(userId: string): Promise<number>`, `markRead(userId: string, id: string): Promise<void>`, `markAllRead(userId: string): Promise<void>`
- Produces (`reasons.ts`): `SYSTEM_REASONS = ['AUTO_BLOCK','FIELD_DEACTIVATED'] as const`; `displayReason(reason: string | null, t: (key: string) => string): string | null` — se `reason` è un codice di sistema ritorna `t('reasons.<codice>')`, altrimenti il testo libero.
- Params standard per le notifiche di prenotazione: `{ bookingId, fieldName, start: ISO UTC, by: 'admin' | 'member' | 'system', reason: string | null }`.

- [ ] **Step 1: Test** in `tests/notifications.test.ts`: `notify` crea una riga non letta con `params` JSON; `notify(..., dedupeKey)` due volte → `true` poi `false`, una sola riga; `markRead(userA, idDiB)` non modifica la notifica di B (resta `read=false`); `markAllRead(A)` non tocca B; `unreadCount` conta solo le non lette dell'utente. In `tests/booking-service.test.ts`: `createBooking` crea `BOOKING_CREATED` al proprietario; `updateBooking` fatto dall'admin crea `BOOKING_UPDATED` con `by: 'admin'`; `cancelBooking` dell'admin con motivo crea `BOOKING_CANCELLED` con `reason`; un `createBooking` fallito per `OVERLAP` non lascia notifiche.
- [ ] **Step 2:** `npx prisma db push` (aggiorna `dev.db`; per il test db lo ricrea `global-setup`), poi `npx vitest run tests/notifications.test.ts tests/booking-service.test.ts` → FAIL.
- [ ] **Step 3:** Implementa `notifications.ts` e `reasons.ts`; in `booking-service.ts` chiama `notify(tx, booking.userId, ...)` **dentro** le transazioni esistenti di create/update/cancel (destinatario sempre il proprietario della prenotazione, qualunque sia l'attore). Aggiungi chiavi `reasons.AUTO_BLOCK` ("Blocco per mancato pagamento") e `reasons.FIELD_DEACTIVATED` ("Campo non più disponibile") in IT/EN.
- [ ] **Step 4:** Stessi test → PASS; `npm test` completo → PASS.
- [ ] **Step 5: Commit** `feat: servizio notifiche e notifiche degli eventi di prenotazione`

---

### Task 2: Campanella e pagina notifiche

**Files:**
- Create: `src/components/NotificationBell.tsx`, `src/components/NotificationItem.tsx`, `src/app/[locale]/(app)/notifications/page.tsx`, `src/app/[locale]/(app)/notifications/actions.ts`
- Modify: `src/components/AppShell.tsx`, `src/app/[locale]/(app)/bookings/page.tsx:72` e `src/app/[locale]/admin/bookings/page.tsx` (mostrare il motivo con `displayReason`), `messages/{it,en}.json` (sezione `notifications.*` con un testo per ogni `NotificationType` + `markAll`, `empty`, `title`)

**Interfaces:**
- Consumes: Task 1 (`listNotifications`, `unreadCount`, `markRead`, `markAllRead`, `displayReason`).
- Produces: `markReadAction(id: string): Promise<void>` e `markAllReadAction(): Promise<void>` (entrambe con `requireMember()`, `id` validato con zod `string().min(1).max(64)`, poi `revalidatePath`).

- [ ] **Step 1:** `NotificationBell` (server component): icona lucide `Bell` con badge del conteggio non lette (nascosto se 0, "9+" oltre 9), link a `/notifications`; inseriscila in `AppShell` accanto al `LocaleSwitcher`, con `aria-label` tradotto.
- [ ] **Step 2:** Pagina `/notifications`: lista con testo tradotto nella lingua corrente (data/ora formattate con `getFormatter`, `params` parsato da JSON con fallback sicuro se il JSON è rotto), non lette in evidenza, bottone "segna come letta" per riga e "segna tutte".
- [ ] **Step 3:** Verifica: `npx tsc --noEmit`, `npm run lint`, `npm run build` senza errori; prova nel browser: crea una prenotazione, il badge sale a 1, aprire la pagina e "segna tutte" lo azzera; cambio lingua EN mostra i testi inglesi.
- [ ] **Step 4: Commit** `feat: campanella e pagina notifiche`

---

### Task 3: Pagamenti, strike, blocco e sblocco (TDD)

**Files:**
- Create: `src/lib/payments.ts`, `tests/payments.test.ts`
- Modify: `src/lib/booking-service.ts` (aggiungere a `BOOKING_ERROR_CODES`: `'NOT_PAYABLE'`, `'NOT_ENDED'`, `'INVALID_TRANSITION'`), `tests/helpers.ts`, `messages/{it,en}.json` (`errors.booking.*` per i tre codici nuovi)

**Interfaces:**
- Consumes: `Actor`, `BookingError` (`booking-service.ts`), `isBlocked` (`booking-rules`), `notify` (Task 1).
- Produces (`payments.ts`):
  - `type PaymentOutcome = 'PAID' | 'UNPAID' | 'EXEMPT'`
  - `registerPayment(admin: Actor, bookingId: string, outcome: PaymentOutcome, now: Date = new Date()): Promise<Booking>` — richiede `admin.isAdmin` (altrimenti `FORBIDDEN`); prenotazione `CONFIRMED` oppure `CANCELLED` con `chargeable`, altrimenti `NOT_PAYABLE`; `end <= now`, altrimenti `NOT_ENDED`; transizioni ammesse solo `PENDING→PAID|UNPAID|EXEMPT` e `UNPAID→PAID|EXEMPT`, altrimenti `INVALID_TRANSITION`. Tutto in transazione.
  - `setNoShow(admin: Actor, bookingId: string, noShow: boolean): Promise<void>` (solo dato statistico).
  - `listPendingPayments(admin: Actor, now?: Date)`: prenotazioni `PENDING` con `end <= now`, `CONFIRMED` o `CANCELLED && chargeable`, con `user` e `field`, per `end` crescente.
  - `getMemberLedger(admin: Actor, userId: string): Promise<{ strikes: number; unpaidCount: number; debtCents: number; blocked: boolean; history: Booking[] }>`
- Produces (`tests/helpers.ts`): `makeBooking(over: { userId: string; fieldId: string; start: Date; slots?: number; status?: 'CONFIRMED'|'CANCELLED'; paymentStatus?: PaymentStatus; chargeable?: boolean }): Promise<Booking>` — crea anche le righe `Occupancy` se `CONFIRMED`.

- [ ] **Step 1: Test** (`tests/payments.test.ts`, istanti fissi con `NOW` di `helpers.ts`):
  - `UNPAID` sul 1° insoluto → 1 strike, notifica `STRIKE_WARNING`, socio non bloccato.
  - `UNPAID` sul 2° → 2 strike, `isBlocked` vero, tutte le future `CONFIRMED` diventano `CANCELLED` con `cancelReason = 'AUTO_BLOCK'`, `cancelledById = null`, `chargeable = false`, `Occupancy` rimossa, notifiche `BOOKING_CANCELLED` (by `system`) per ognuna e `ACCOUNT_BLOCKED`; una prenotazione in corso (`start < NOW < end`), una già conclusa e una già cancellata restano invariate.
  - 3° e 4° insoluto: blocco di nuovo immediato, anche dopo uno sblocco.
  - `UNPAID→PAID` dell'ultimo insoluto → sblocco (`ACCOUNT_UNBLOCKED`) e gli strike restano 2; con un altro insoluto ancora aperto resta bloccato e nessuna notifica di sblocco.
  - `UNPAID→EXEMPT` elimina lo strike di quella prenotazione; `PENDING→EXEMPT` non crea strike.
  - Cancellata `chargeable` con `UNPAID` conta come insoluto; cancellata non `chargeable` → `NOT_PAYABLE`; `end > now` → `NOT_ENDED`; `PAID→UNPAID` → `INVALID_TRANSITION`; non admin → `FORBIDDEN`.
  - Concorrenza: `Promise.allSettled` di due `registerPayment(..., 'UNPAID')` sulla stessa prenotazione → una riuscita, l'altra `INVALID_TRANSITION`, 1 solo strike, 1 sola notifica.
  - `getMemberLedger`: debito = somma dei `priceCents` degli `UNPAID`; la prenotazione futura di un socio bloccato non si può creare (`BLOCKED`) finché non sblocca (usa `createBooking` reale).
  - Un admin-socio con 2 strike e un insoluto: `createBooking` come socio → `BLOCKED`; come admin → riesce.
- [ ] **Step 2:** `npx vitest run tests/payments.test.ts` → FAIL (modulo mancante).
- [ ] **Step 3:** Implementa `payments.ts`. Cambio di stato con `updateMany({ where: { id, paymentStatus: <stato letto> }, data })` e `count === 0` → `INVALID_TRANSITION` (così la concorrenza è sicura anche su PostgreSQL). Stato di blocco calcolato con `isBlocked` prima e dopo la modifica: sblocco = era bloccato e ora no. Messaggi `errors.booking.*` in IT/EN.
- [ ] **Step 4:** `npx vitest run tests/payments.test.ts` → PASS; `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: pagamenti, strike, blocco automatico e sblocco`

---

### Task 4: Area admin pagamenti e scheda socio

**Files:**
- Create: `src/app/[locale]/admin/payments/page.tsx`, `src/app/[locale]/admin/payments/actions.ts`, `src/app/[locale]/admin/members/[id]/page.tsx`, `src/components/PaymentButtons.tsx`
- Modify: `src/app/[locale]/admin/layout.tsx` (voce "Pagamenti"), `src/app/[locale]/admin/members/page.tsx` (colonne strike/insoluti + link alla scheda), `src/app/[locale]/admin/bookings/page.tsx` (mostrare il flag no-show), `messages/{it,en}.json`

**Interfaces:**
- Consumes: Task 3 (`listPendingPayments`, `registerPayment`, `setNoShow`, `getMemberLedger`).
- Produces: `registerPaymentAction(id: string, outcome: PaymentOutcome): Promise<ActionResult>`, `setNoShowAction(id: string, noShow: boolean): Promise<ActionResult>` (`requireAdmin()`, zod su id e outcome, errori `BookingError` → `{ ok: false, violations }` come in `(app)/actions.ts`).

- [ ] **Step 1:** `/admin/payments`: tabella "da registrare" (socio, campo, quando, importo, badge "cancellata a ridosso" se `chargeable`) con tre bottoni **Pagata / Non pagata / Esente** (Non pagata con conferma: crea uno strike) e interruttore no-show; dopo l'azione la riga sparisce e un toast/riga mostra eventuale errore tradotto. Lista vuota con messaggio.
- [ ] **Step 2:** Scheda `/admin/members/[id]`: dati e tessera, strike totali, insoluti, debito, stato "Bloccato", storico prenotazioni con stato pagamento, e per ogni `UNPAID` il bottone "Segna pagata" (stesso `registerPaymentAction`). La lista soci mostra strike/insoluti e il badge "Bloccato".
- [ ] **Step 3:** Verifica `tsc`, lint, build; prova nel browser con il seed: prenotazione conclusa (crearla via `prisma` nello script di prova o con orario passato dal seed di prova) → segnare Non pagata due volte e osservare blocco e cancellazione delle future dalla vista del socio; poi Pagata e sblocco.
- [ ] **Step 4: Commit** `feat: pagamenti da registrare e scheda socio per l'admin`

---

### Task 5: Impostazioni e campi modificabili dall'admin (TDD)

**Files:**
- Create: `src/lib/admin-config.ts`, `tests/admin-config.test.ts`, `src/app/[locale]/admin/settings/{page.tsx,actions.ts,settings-form.tsx}`, `src/app/[locale]/admin/fields/{page.tsx,actions.ts,field-form.tsx}`
- Modify: `src/lib/booking-rules/index.ts` (aggiungere `reminderHours` al tipo `Settings` e a `DEFAULT_SETTINGS`), `src/lib/booking-service.ts` (nuovi codici `'INVALID_SETTINGS'`, `'HAS_FUTURE_BOOKINGS'`), `src/app/[locale]/(app)/actions.ts` (+ `params` negli esiti negativi), `src/components/BookingForm.tsx`, `src/components/CancelBookingButton.tsx`, `src/app/[locale]/(app)/bookings/page.tsx`, `src/app/[locale]/admin/layout.tsx`, `messages/{it,en}.json`

**Interfaces:**
- Produces (`admin-config.ts`):
  - `type SettingsInput = Settings` (campi di `booking-rules`, inclusi `reminderHours`)
  - `updateSettings(admin: Actor, input: SettingsInput): Promise<Settings>` — vincoli: `openMinutes < closeMinutes`, entrambi multipli di `stepMinutes`; `stepMinutes` ∈ {15, 30, 60}; `maxAdvanceDays` 1–365; `maxActiveBookings` 1–20; `changeWindowHours` 0–72; `maxSlotsPerBooking` 1–4; `membershipWarnDays` 1–90; `reminderHours` 1–72; altrimenti `BookingError(['INVALID_SETTINGS'])`.
  - `type FieldInput = { name: string; sport: string; slotMinutes: number; pricePerSlot: number }`
  - `createField(admin, input: FieldInput): Promise<Field>`; `updateField(admin, id: string, input: FieldInput): Promise<Field>` (cambiare `slotMinutes` con prenotazioni future `CONFIRMED` → `HAS_FUTURE_BOOKINGS`; il prezzo nuovo non tocca le prenotazioni esistenti, che hanno `priceCents` salvato).
  - `setFieldActive(admin, id: string, active: boolean, opts?: { cancelFuture?: boolean }): Promise<{ cancelled: number }>` — disattivare con future `CONFIRMED` senza `cancelFuture` → `HAS_FUTURE_BOOKINGS`; con `cancelFuture` le cancella (motivo `FIELD_DEACTIVATED`, `cancelledById = admin.id`, occupazione rimossa, notifica `BOOKING_CANCELLED` con `by: 'admin'`, non `chargeable`).
- Produces: `type RuleParams = { open: string; close: string; days: number; hours: number; maxActive: number; step: number }` e `ruleParams(s: Settings): RuleParams` (in `booking-rules`); gli esiti negativi delle azioni di prenotazione includono `params: RuleParams`.

- [ ] **Step 1: Test** (`tests/admin-config.test.ts`): `updateSettings` salva e `getSettings` lo restituisce; rifiuta `open = close`, `open > close`, `stepMinutes = 10`, `maxActiveBookings = 0`, orari non multipli del passo; non admin → `FORBIDDEN`. Con `maxActiveBookings = 1` salvato, il secondo `createBooking` del socio → `MAX_ACTIVE_REACHED`. `createField` rifiuta nome duplicato e prezzo/durata ≤ 0. `setFieldActive(false)` con una futura → `HAS_FUTURE_BOOKINGS` e nulla cambia; con `cancelFuture` → `cancelled: 1`, prenotazione `CANCELLED`, `Occupancy` vuota, notifica creata, nuovo `createBooking` sul campo → `FIELD_INACTIVE`; riattivando si può prenotare di nuovo.
- [ ] **Step 2:** `npx vitest run tests/admin-config.test.ts` → FAIL.
- [ ] **Step 3:** Implementa `admin-config.ts` (validazione con zod, scritture in transazione). Aggiungi test in `booking-rules.test.ts` per `ruleParams` (es. `open: '08:00'`).
- [ ] **Step 4:** Parametrizza i messaggi con numeri fissi: `errors.booking.{NOT_ON_STEP,BEFORE_OPENING,AFTER_CLOSING,TOO_FAR_AHEAD,MAX_ACTIVE_REACHED,WINDOW_CLOSED}`, `bookings.windowClosed` e simili usano `{step}`, `{open}`, `{close}`, `{days}`, `{maxActive}`, `{hours}`; i componenti passano `params` (dall'esito dell'azione, o da `getSettings` sul server per le pagine). Aggiungi in `tests/i18n.test.ts` un controllo che i segnaposto `{...}` di ogni chiave siano gli stessi in IT e EN.
- [ ] **Step 5:** Pagine admin `/admin/settings` (form con tutti i campi, errori tradotti) e `/admin/fields` (elenco, crea, modifica, attiva/disattiva con dialog di conferma che mostra quante prenotazioni future verrebbero cancellate); voci nel menu admin; `admin/page.tsx` continua a reindirizzare (cambierà nel Task 9).
- [ ] **Step 6:** `npm test`, `tsc`, lint, build → verdi. **Commit** `feat: impostazioni e campi modificabili dall'admin, messaggi parametrici`

---

### Task 6: Notifiche temporali pigre (TDD)

**Files:**
- Create: `src/lib/lazy-notifications.ts`, `tests/lazy-notifications.test.ts`
- Modify: `src/app/[locale]/(app)/layout.tsx`, `messages/{it,en}.json` (testi per `BOOKING_REMINDER`, `MEMBERSHIP_EXPIRING`, `MEMBERSHIP_EXPIRED` se mancanti)

**Interfaces:**
- Consumes: `notify` (Task 1), `getSettings`, `romeDay`/`daysBetween` (`time.ts`).
- Produces: `runLazyNotifications(userId: string, now: Date = new Date()): Promise<void>` — non lancia mai; chiavi `dedupeKey`:
  - `reminder:<bookingId>:<start ISO>` per ogni prenotazione `CONFIRMED` con `now < start <= now + reminderHours`;
  - `membership-expiring:<giorno scadenza>` se la tessera scade tra 0 e `membershipWarnDays` giorni (giorni di calendario Europe/Rome);
  - `membership-expired:<giorno scadenza>` se la scadenza è passata.
  Params: reminder come le notifiche di prenotazione; tessera `{ expiresOn: 'YYYY-MM-DD', daysLeft: number }`.

- [ ] **Step 1: Test:** reminder creato una volta anche chiamando la funzione due volte e con `Promise.all` di tre chiamate; nessun reminder per prenotazioni cancellate, già iniziate o oltre la finestra; spostando la prenotazione (`start` diverso) nasce un nuovo reminder; tessera a 15 giorni → `MEMBERSHIP_EXPIRING`, a 16 giorni → niente, scaduta ieri → `MEMBERSHIP_EXPIRED`, scade oggi → `EXPIRING` (con `daysLeft: 0`); dopo `renewMembership` la nuova scadenza lontana non genera nulla e, quando si avvicina, genera un nuovo avviso; utente senza tessera (admin del seed) → nessuna notifica di tessera; il confine del cambio ora legale (scadenza 2026-10-26, `now` = 2026-10-25 23:30 Rome) dà `daysLeft: 1`.
- [ ] **Step 2:** `npx vitest run tests/lazy-notifications.test.ts` → FAIL.
- [ ] **Step 3:** Implementa; in `(app)/layout.tsx` chiama `await runLazyNotifications(user.id)` dentro `try/catch` che ignora l'errore (le notifiche non devono mai rompere una pagina).
- [ ] **Step 4:** Test → PASS; `npm test` → PASS; **Commit** `feat: notifiche pigre di promemoria e scadenza tessera`

---

### Task 7: Rilievi rinviati dalla Sessione 1 (TDD)

**Files:**
- Create: `src/lib/rate-limit.ts`, `tests/rate-limit.test.ts`, `tests/hardening.test.ts`, `src/app/[locale]/error.tsx`, `src/app/[locale]/not-found.tsx`
- Modify: `prisma/schema.prisma` (`User.sessionVersion Int @default(0)`), `src/lib/auth.ts`, `src/lib/members.ts` (`resetAccess` incrementa `sessionVersion`; `verifyCredentials` restituisce anche `sessionVersion`), `src/app/[locale]/(auth)/actions.ts`, `src/lib/time.ts`, `src/lib/booking-service.ts`, `src/app/[locale]/(app)/actions.ts`, `src/app/[locale]/(app)/calendar/page.tsx`, `src/app/[locale]/admin/bookings/page.tsx`, `messages/{it,en}.json`

**Interfaces:**
- Produces:
  - `checkRateLimit(key: string, opts?: { max: number; windowMs: number }, now: number = Date.now()): { allowed: boolean; retryAfterMs: number }` — finestra scorrevole in memoria; default 5 tentativi / 15 minuti. Documentare nel README che è per-istanza.
  - `isValidDay(s: string): boolean` in `time.ts` (formato `YYYY-MM-DD` **e** data esistente).
  - `isSessionCurrent(tokenVersion: unknown, userVersion: number): boolean` in `auth.ts`.

- [ ] **Step 1: Test:** `checkRateLimit`: 5 tentativi consentiti, il 6° negato con `retryAfterMs > 0`, dopo la finestra di nuovo consentito, chiavi indipendenti. `isValidDay('2026-02-30')`, `'2026-13-01'`, `'2026-1-5'` → false; `'2028-02-29'` → true. `isSessionCurrent(0, 1)` false, `(1, 1)` true, `(undefined, 0)` false. Dopo `resetAccess` + `activateAccount` il `sessionVersion` dell'utente è aumentato. `cancelBooking` due volte in parallelo → una riuscita e una `ALREADY_CANCELLED`, nessuna `Occupancy` residua. `createBooking` e `updateBooking` con id lunghi 10 000 caratteri o `reason` oltre 500 caratteri → `INVALID_INPUT` dalle azioni (testare via `parse` esportato dallo schema zod delle azioni, non serve Next).
- [ ] **Step 2:** `npx vitest run tests/rate-limit.test.ts tests/hardening.test.ts` → FAIL.
- [ ] **Step 3:** Implementa. Rate limit: login per chiave `login:<email normalizzata>`, attivazione per `activate:<ip>` e `activate:<numero tessera normalizzato>` (IP da `headers()`), superato il limite stesso errore generico `auth.errors.tooMany` (nessuna enumerazione). `sessionVersion`: scritto nel token alla firma (`jwt` callback via `authorize`), confrontato in `getSessionUser`. Date inesistenti: usare `isValidDay` nei page `calendar` e `admin/bookings` (valore non valido → ignorato/oggi) e nello schema zod delle azioni. `createBooking` esegue la transazione con `isolationLevel: Serializable` e ritenta fino a 3 volte su `P2034`; `updateBooking`/`cancelBooking` scrivono con `updateMany({ where: { id, status: 'CONFIRMED' } })` e `count === 0` → `ALREADY_CANCELLED`. `error.tsx` (client, con pulsante "Riprova") e `not-found.tsx` localizzati.
- [ ] **Step 4:** `npm test` → PASS; `npm run build`; prova nel browser `/it/calendar?day=2026-02-30` (nessun 500) e una URL inesistente (pagina 404 tradotta). **Commit** `fix: rate limit, sessioni invalidate al reset, date non valide, concorrenza e pagine di errore`

---

### Task 8: Dashboard socio

**Files:**
- Create: `src/lib/stats-member.ts`, `tests/stats.test.ts` (sezione socio), `src/app/[locale]/(app)/dashboard/page.tsx`, `src/components/charts/{HoursBySportChart,MonthlyBookingsChart}.tsx`, `src/components/KpiCard.tsx`
- Modify: `package.json` (`recharts`), `src/lib/home-target.ts` + `tests/home-target.test.ts` (home → `/dashboard`), `src/components/AppShell.tsx` (voce "Dashboard"), `messages/{it,en}.json`

**Interfaces:**
- Produces: `getMemberDashboard(userId: string, now: Date = new Date()): Promise<MemberDashboard>` con
  `{ upcoming: (Booking & { field: Field })[] /* prossime 5 CONFIRMED */; activeCount: number; maxActive: number; membership: { number: string; expiresAt: Date; daysLeft: number } | null; debtCents: number; strikes: number; blocked: boolean; hoursBySport: { sport: string; hours: number }[] /* CONFIRMED, concluse, noShow=false */; bookingsByMonth: { month: string /* YYYY-MM */; count: number }[] /* ultimi 12 mesi Rome, anche i mesi a 0, CONFIRMED */ }`.

- [ ] **Step 1: Test:** `getMemberDashboard` con dati noti: `activeCount` ignora cancellate e passate; `hoursBySport` esclude no-show e future (90 min → 1.5 h); `bookingsByMonth` ha sempre 12 voci in ordine, con `0` nei mesi vuoti e il mese corrente come ultimo (anche a cavallo dell'anno); `debtCents` = somma degli `UNPAID`; `blocked` coerente con `isBlocked`; `membership` null senza tessera; un socio non vede mai dati di altri.
- [ ] **Step 2:** `npx vitest run tests/stats.test.ts` → FAIL. Implementa `stats-member.ts` → PASS.
- [ ] **Step 3:** `npm i recharts`; pagina `/dashboard` con KPI (prenotazioni attive "2/3", tessera e giorni, da saldare, strike), elenco prossime prenotazioni con azioni modifica/cancella (riuso di `CancelBookingButton` e dei criteri di finestra calcolati sul server come in `bookings/page.tsx`), grafici Recharts (componenti client) con colori dalle variabili del tema, leggibili in chiaro e scuro, con stato vuoto. Banner se bloccato.
- [ ] **Step 4:** `tsc`, lint, build; controllo nel browser (IT/EN, tema scuro, 375 px). **Commit** `feat: dashboard del socio con KPI e grafici`

---

### Task 9: Dashboard admin

**Files:**
- Create: `src/lib/stats-admin.ts`, `tests/stats.test.ts` (sezione admin), `src/app/[locale]/admin/dashboard/page.tsx`, `src/components/charts/{OccupancyChart,RevenueChart,HeatmapChart,TrendChart}.tsx`
- Modify: `src/app/[locale]/admin/page.tsx` (redirect → `/admin/dashboard`), `src/app/[locale]/admin/layout.tsx`, `messages/{it,en}.json`

**Interfaces:**
- Produces: `type Range = 'day' | 'week' | 'month'` e `getAdminDashboard(admin: Actor, range: Range, now: Date = new Date()): Promise<AdminDashboard>` (`requireAdmin`-equivalente: `FORBIDDEN` se non admin) con:
  - `occupancy: { fieldId: string; name: string; occupiedQuarters: number; openQuarters: number; ratio: number }[]` — periodo = oggi / settimana corrente lun–dom / mese corrente (Rome); `openQuarters` = quarti d'ora tra apertura e chiusura × giorni del periodo; `occupiedQuarters` = righe `Occupancy` nel periodo.
  - `revenue: { expectedCents: number; collectedCents: number; unpaidCents: number }` — atteso = somma di `priceCents` delle prenotazioni pagabili (`CONFIRMED` o `chargeable`) concluse nel periodo escluse `EXEMPT`; incassato = quelle `PAID`; insoluto = tutti gli `UNPAID` (qualunque data).
  - `noShows: number` (nel periodo), `blockedMembers: number` (con `isBlocked`), 
  - `popularSlots: { weekday: number /* 0=lunedì */; hour: number /* 8–22 */; count: number }[]` (CONFIRMED degli ultimi 90 giorni, per ora di inizio Rome),
  - `trend: { month: string; count: number }[]` (ultimi 12 mesi, CONFIRMED, mesi vuoti a 0),
  - `expiringMemberships: { userId: string; name: string; number: string; expiresAt: Date }[]` (scadenza entro `membershipWarnDays`, per scadenza crescente).

- [ ] **Step 1: Test:** occupazione di un campo con 2 prenotazioni da 1 h su un giorno aperto 08–23 = 8/60 quarti; un campo disattivato non compare; insoluto non dipende dal periodo; EXEMPT escluso dall'atteso; cancellata non `chargeable` esclusa, `chargeable` inclusa; `blockedMembers` conta solo con ≥2 strike **e** insoluto; `trend` ha 12 voci; `popularSlots` raggruppa per ora Rome (una prenotazione alle 22:00 di domenica 25/10/2026 con cambio d'ora cade in `weekday 6, hour 22`); `getAdminDashboard` con socio → `FORBIDDEN`.
- [ ] **Step 2:** `npx vitest run tests/stats.test.ts` → FAIL; implementa `stats-admin.ts` (aggregazioni con query raggruppate, nessun ciclo per prenotazione sul DB) → PASS.
- [ ] **Step 3:** Pagina `/admin/dashboard` con selettore periodo (`?range=`, valore non valido → `week`), KPI card (occupazione media, incassato/atteso, insoluto, no-show, bloccati), grafici: barre occupazione per campo, barre atteso/incassato, heatmap giorno×ora (griglia CSS o Recharts), linea andamento 12 mesi, tabella tessere in scadenza con link alla scheda socio.
- [ ] **Step 4:** `tsc`, lint, build; controllo browser con dati di prova. **Commit** `feat: dashboard admin con occupazione, incassi e fasce orarie`

---

### Task 10: PWA e rifinitura responsive

**Files:**
- Create: `src/app/manifest.ts`, `src/app/pwa-icon/[size]/route.tsx`, `public/sw.js`, `src/components/ServiceWorkerRegister.tsx`, `tests/pwa.test.ts`
- Modify: `src/app/[locale]/layout.tsx` (metadata `appleWebApp`, `themeColor`, registrazione SW), `src/proxy.ts` (il `matcher` deve escludere `sw.js`, `manifest.webmanifest`, `pwa-icon`), `messages/{it,en}.json` se servono testi

**Interfaces:**
- Produces: `manifest()` default export (`MetadataRoute.Manifest`): `name: 'Palle Girate'`, `short_name: 'Palle Girate'`, `start_url: '/'`, `display: 'standalone'`, `background_color`/`theme_color`, icone `192x192` e `512x512` (`purpose: 'any'`) più `512x512` con `purpose: 'maskable'`; route `GET /pwa-icon/<192|512>` (PNG via `ImageResponse`, `?maskable=1` con margine di sicurezza del 20%), 404 per altre dimensioni.

- [ ] **Step 1: Test** (`tests/pwa.test.ts`): il manifest ha `display: 'standalone'`, `start_url`, almeno un'icona 192 e una 512 e una maskable; il `matcher` esportato da `proxy.ts` non corrisponde a `/sw.js`, `/manifest.webmanifest`, `/pwa-icon/192` ma corrisponde a `/it/calendar`; `public/sw.js` contiene i listener `install`, `activate` e `fetch`.
- [ ] **Step 2:** `npx vitest run tests/pwa.test.ts` → FAIL.
- [ ] **Step 3:** Implementa manifest, route icone, SW minimo (`skipWaiting` + `clients.claim`, `fetch` che lascia passare alla rete: nessuna cache, uso offline non richiesto) e `ServiceWorkerRegister` (solo in produzione, in `try/catch`). Aggiorna `proxy.ts`.
- [ ] **Step 4:** `npm test` → PASS; `npm run build && npm start`: da Edge/Chrome controllare in DevTools › Application che manifest e service worker siano validi e l'app installabile; verificare a 375 px (playwright con Edge) calendario, prenotazione guidata, dashboard socio e admin, pagamenti, impostazioni, campanella: nessuno scroll orizzontale della pagina, tabelle larghe con scroll interno. Correggere ciò che sfora.
- [ ] **Step 5: Commit** `feat: PWA installabile e rifinitura responsive`

---

### Task 11: Inglese completo, README e verifica finale

**Files:**
- Modify: `messages/en.json` (solo se emergono lacune), `README.md`, `.env.example`
- Create: `tests/messages-usage.test.ts`

- [ ] **Step 1: Test** (`tests/messages-usage.test.ts`): ogni chiave letta con `t('...')`/`getTranslations('ns')` staticamente nei file di `src/` esiste in `it.json` (scansione con regex delle chiamate a stringa letterale; le chiavi dinamiche con template `${...}` sono escluse e coperte dai test di parità di `i18n.test.ts`). Eseguirlo: se segnala chiavi mancanti, aggiungerle in entrambe le lingue.
- [ ] **Step 2:** Giro completo nel browser in **EN**: login, calendario, prenota, modifica, cancella, notifiche, dashboard socio, admin (soci, prenotazioni, pagamenti, impostazioni, campi, dashboard): nessun testo italiano né chiave grezza visibile; date 24h e valuta EUR coerenti con la lingua.
- [ ] **Step 3:** README: funzionalità, variabili `.env`, comandi (`setup`, `dev`, `test`, `build`), regole di business riassunte, limiti noti (rate limit in memoria per-istanza, notifiche pigre invece del cron, sessioni JWT) e sezione **PostgreSQL**: cambiare `provider = "postgresql"` e `DATABASE_URL`, `npx prisma db push` (o `migrate`), `npm run db:seed`, nota sul livello `Serializable` e sui ritentativi di `createBooking`.
- [ ] **Step 4:** Verifica finale (skill `superpowers:verification-before-completion`): `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` tutti verdi, con l'output riportato. Seed pulito + percorso completo socio→blocco→sblocco provato nel browser.
- [ ] **Step 5: Commit** `docs: README sessione 2, PostgreSQL e verifica messaggi`; poi **chiedere all'utente** se fare push/PR o merge (nessuna azione sul remoto senza il suo ok) e usare `superpowers:finishing-a-development-branch`.
