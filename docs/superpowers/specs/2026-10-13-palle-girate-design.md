# Palle Girate – Documento di design (specifiche)

Data: 2026-10-13
Requisiti di riferimento: [`docs/requirements.md`](../../requirements.md) (cosa vuole il cliente).
Questo documento (le specifiche) dice **come** lo costruiamo. In caso di conflitto vale questo documento, che incorpora le decisioni prese dopo i requisiti.

Le voci marcate **[scelta di Claude]** sono decisioni prese da Claude, non dal cliente: possono essere riviste.

---

## 1. Intento

Il centro sportivo del paese gestisce le prenotazioni a mano, passando dal bar convenzionato (non sempre aperto), e le prenotazioni in conflitto sono frequenti. Vogliamo una web-app (PWA, iOS/Android/desktop, senza store) in cui:

- il **socio** vede subito se un campo è libero e prenota/modifica/cancella da solo, entro regole chiare;
- l'**admin** ha il pieno controllo su prenotazioni, soci, tessere e pagamenti (in contanti), con un sistema di strike per chi non paga.

Successo = nessuna doppia prenotazione, il bar non serve più come intermediario, l'admin vede a colpo d'occhio occupazione e insoluti.

## 2. Obiettivi, non-obiettivi, anti-obiettivi

**Obiettivi**: tutti quelli di `requirements.md` §2, §6–§12.

**Non-obiettivi** (da `requirements.md` §16 + decisione cliente): pagamenti online, abbonamenti/ricorrenze, app negli store, email/SMS/push, numero di giocatori, **stima dei costi** (rimandata).

**Anti-obiettivi** (sarebbe un fallimento anche se "funziona"):
- Due prenotazioni sovrapposte sullo stesso campo, anche con richieste simultanee.
- Regole temporali calcolate dal browser (manipolabili) invece che dal server.
- Un socio che vede nome/dati di chi ha prenotato un campo.
- Testi cablati nei componenti (rompe IT/EN).
- Una UI "gestionale anni 2000": deve sembrare una dashboard dati moderna.

## 3. Vincoli

- Gira in locale con `npm install` + `npm run dev`; seed con campi, admin di default, soci di esempio.
- Hosting futuro a basso costo, carico quasi nullo d'inverno e picchi d'estate.
- Fuso orario **Europe/Rome** per tutte le regole; date salvate in UTC.
- Git: repository remoto `https://github.com/simonetamagno25-blip/PalleGirate`, branch `main`, commit frequenti e descrittivi, `.env.example`, nessun segreto committato.
- Sviluppo in **2 sessioni di Claude Code** (vedi §11).
- Documentazione in `docs/`: requisiti (`docs/requirements.md`) separati da specifiche (`docs/superpowers/specs/`).

## 4. Stack **[scelta di Claude, conferma la proposta §13 dei requisiti]**

- Next.js (App Router, TypeScript), full-stack: Server Actions / Route Handlers per la logica.
- Prisma + SQLite in locale (schema compatibile con PostgreSQL per la produzione).
- Tailwind CSS + shadcn/ui; Recharts per i grafici; lucide per le icone.
- next-intl per IT/EN.
- Auth.js (Credentials) con sessioni; password con bcrypt/argon2.
- Vitest per le regole di business.
- Le regole di prenotazione stanno in un modulo puro (`lib/booking-rules` o simile) senza dipendenze da Next/Prisma, così sono testabili in isolamento.

Riferimenti di stile (dagli appunti del cliente): Dribbble "web data platform", Open WebUI, Pinterest. Dashboard pulita, card KPI, grafici leggibili, tema chiaro/scuro.

## 5. Decisioni del cliente (13/10/2026)

1. **Slot**: una prenotazione copre **1 o al massimo 2 slot consecutivi** dello stesso campo. Calcio: 90 o 180 min; tennis/basket/bocce: 60 o 120 min. Parametro configurabile `MAX_SLOTS_PER_BOOKING = 2`.
2. **Account**: l'admin registra il socio. Il socio attiva l'accesso con **numero tessera + email** (che devono corrispondere a quelli registrati) e sceglie la password.
3. **Strike**: **non si azzerano mai**.
   - 1° mancato pagamento → avviso (notifica).
   - 2° mancato pagamento e ogni successivo (3°, 4°, …) → **blocco immediato** + cancellazione automatica di tutte le prenotazioni future del socio (con notifica e motivo).
   - Lo sblocco avviene quando l'admin registra il pagamento di **tutti** gli insoluti; il socio torna a prenotare. Nessuna esclusione definitiva.
4. **Avviso scadenza tessera**: 15 giorni prima, configurabile dall'admin.
5. **Costi**: fuori ambito per ora.

## 6. Modello di dominio

Entità (nomi indicativi):

- **User**: flag `isAdmin` + tessera opzionale **[scelta di Claude]**: un admin può anche essere socio (con tessera, strike e dashboard socio) e prenotare per sé; l'admin del seed non ha tessera. Le regole del socio si applicano solo alle prenotazioni che fa come socio; ciò che fa con i poteri admin non ha vincoli. Campi: nome, cognome, data di nascita, email, telefono, lingua preferita (`it`/`en`), hash password (nullo finché non attivato), stato attivazione.
- **Membership (tessera)**: numero tessera (univoco per socio, **resta lo stesso al rinnovo**), data emissione, data scadenza (default emissione + 1 anno, modificabile dall'admin). **[scelta di Claude]** Rinnovo: nuova data di emissione = data del rinnovo, nuova scadenza proposta = max(oggi, scadenza attuale) + 1 anno, così un rinnovo anticipato non fa perdere giorni; l'admin può sempre correggere la data. Lo storico dei rinnovi è conservato (tabella di storico), ma il numero tessera usato per attivazione e reset è unico.
- **Field (campo)**: nome, tipo sport, durata slot (min), prezzo a slot (€), attivo sì/no. Seed: Calcio, Tennis 1, Tennis 2, Basket, Bocce (**5 campi**: i 2 campi da tennis sono prenotabili separatamente).
- **Settings**: orario apertura/chiusura (08:00–23:00), passo orari di inizio (15 min), anticipo massimo (14 giorni), max prenotazioni attive (3), finestra modifica/cancellazione (2 ore), max slot per prenotazione (2), giorni avviso tessera (15), promemoria prenotazione (ore prima, nice to have). Tutto modificabile dall'admin.
- **Booking**: socio, campo, inizio, fine, numero slot (1–2), prezzo (calcolato e salvato al momento della creazione/modifica), stato (`CONFIRMED` | `CANCELLED`), motivo cancellazione, chi ha cancellato, stato pagamento (`PENDING` | `PAID` | `UNPAID` | `EXEMPT`), flag no-show, timestamp.
- **Strike**: socio, prenotazione collegata, data. Uno strike nasce quando l'admin segna una prenotazione come `UNPAID`. Se l'admin corregge `UNPAID` → `EXEMPT` (errore di registrazione), lo strike viene rimosso **[scelta di Claude]**; se la segna `PAID` lo strike resta (è stato un mancato pagamento, poi saldato).
- **Notification**: destinatario, tipo, parametri (per tradurre il testo nella lingua dell'utente al momento della visualizzazione), letta sì/no, data.

**Stato "bloccato"** (derivato, non un flag manuale) **[scelta di Claude]**: `numero strike ≥ 2` **e** almeno una prenotazione `UNPAID`. Così lo sblocco è automatico quando l'admin registra l'ultimo pagamento.

**Debito del socio** = somma dei prezzi delle prenotazioni `UNPAID`.

## 7. Regole di prenotazione (lato server, sempre)

Valgono per il **socio**. L'admin le salta tutte **tranne** la non-sovrapposizione e gli orari di apertura (un campo non può essere occupato due volte né usato a centro chiuso) **[scelta di Claude]**.

1. Orario di inizio su multipli di 15 minuti; inizio ≥ apertura; fine ≤ chiusura (23:00).
2. Durata = 1 o 2 × durata slot del campo.
3. Inizio nel futuro.
4. **Anticipo**: il giorno della prenotazione ≤ oggi + 14 giorni (giorni di calendario, Europe/Rome).
5. **Tessera**: il giorno della prenotazione ≤ data di scadenza della tessera.
6. **Max 3 attive**: prenotazioni `CONFIRMED` con inizio nel futuro. Una modifica non conta come nuova prenotazione.
7. **Non bloccato** (§6).
8. **Nessuna sovrapposizione** sullo stesso campo. Implementazione **[scelta di Claude]**: tabella di occupazione con una riga per ogni quarto d'ora occupato `(campo, inizio_quarto)` con **indice univoco**. La creazione/modifica inserisce le righe nella stessa transazione della prenotazione; la cancellazione le rimuove. Il vincolo univoco del database rende impossibili le sovrapposizioni anche con richieste concorrenti, e funziona identico su SQLite e PostgreSQL.

**Modifica** (socio): consentita fino a 2 ore prima dell'inizio **originale**. Può cambiare campo, giorno, orario e durata; il nuovo slot deve rispettare tutte le regole 1–8. Il prezzo viene ricalcolato.

**Cancellazione** (socio): gratuita fino a 2 ore prima dell'inizio. Dopo, il pulsante non c'è più (e il server rifiuta): la prenotazione resta e va pagata. Motivo facoltativo per il socio, consigliato (campo precompilato ma non obbligatorio) per l'admin.

**Admin**: crea prenotazioni per qualsiasi socio (anche bloccato o con tessera scaduta), modifica e cancella in qualsiasi momento.

**Cancellazione tardiva da parte dell'admin** (decisione del cliente): se l'admin cancella **almeno 2 ore prima** dell'inizio, la prenotazione non è dovuta. Se cancella **a meno di 2 ore** dall'inizio (o a prenotazione iniziata), la prenotazione **va pagata comunque**: resta `CANCELLED` (il campo torna libero) ma con `chargeable = true`, ed entra nella lista dei pagamenti da registrare come le altre (Pagata / Non pagata → strike / Esente). L'admin può comunque segnarla Esente se la cancellazione non è colpa del socio. Ogni azione dell'admin su una prenotazione genera una notifica al socio, con il motivo se presente.

## 8. Pagamenti e strike – flusso

1. A prenotazione conclusa, l'admin vede la lista "da registrare" (`PENDING` con fine nel passato, sia `CONFIRMED` sia `CANCELLED` con `chargeable = true`) e segna **Pagata**, **Non pagata** o **Esente**; può anche segnare **no-show** (solo dato statistico, non cambia le regole).
2. `UNPAID` → crea uno strike.
   - Se è il 1° strike → notifica di avviso.
   - Se è il 2° o successivo → il socio è bloccato: tutte le prenotazioni future vengono cancellate (motivo: "blocco per mancato pagamento"), notifica di blocco.
3. Quando l'admin registra il pagamento di un insoluto (`UNPAID` → `PAID`) e non restano altri insoluti → il socio è sbloccato, notifica di sblocco.
4. L'admin vede per ogni socio: strike totali, insoluti, debito, storico.

## 9. Notifiche

Campanella con badge non lette, lista, "segna come letta" e "segna tutte". Eventi: vedi `requirements.md` §8.

Le notifiche temporali (promemoria prenotazione, tessera in scadenza, tessera scaduta) non hanno un cron in locale. **[scelta di Claude]** Vengono generate in modo pigro e idempotente quando l'utente carica una pagina autenticata (al massimo una per evento). Può essere sostituito da un job programmato in produzione.

## 10. Schermate

Vedi `requirements.md` §9–§10. Precisazioni:

- **Calendario disponibilità**: vista giorno con colonne per campo e righe a quarti d'ora; il socio vede solo libero/occupato, l'admin vede chi ha prenotato. Cliccando su uno slot libero parte la prenotazione guidata precompilata.
- **Prenotazione guidata**: campo → giorno → orario → durata (1 o 2 slot) → riepilogo con prezzo → conferma. Mostra le regole violate in modo comprensibile (traducibile).
- **Recupero password** **[scelta di Claude]**: senza email, il reset è fatto dall'admin ("reimposta accesso"). L'account torna "da attivare" e il socio rifà l'attivazione con numero tessera + email.
- **Area admin**: soci e tessere (crea, modifica, rinnova, reimposta accesso), prenotazioni (tutte, filtri, crea/modifica/cancella), pagamenti da registrare, impostazioni e campi, dashboard.
- Responsive mobile-first: sul telefono il calendario mostra un campo alla volta (selettore campo) invece della griglia completa.
- **PWA**: manifest, icone, service worker minimo per l'installazione ("Aggiungi a schermata Home"). L'uso offline non è richiesto.
- **Lingua**: selettore IT/EN salvato sul profilo utente; date in formato 24h, valuta EUR.
- **Admin**: il seed crea un admin con credenziali da `.env`. Un admin può promuovere altri utenti ad admin **[scelta di Claude]**.

## 11. Piano in due sessioni

Come `requirements.md` §15:
- **Sessione 1**: setup, Git, modello dati, auth e ruoli, soci e tessere lato admin, calendario e flusso di prenotazione, tutte le regole §7, test, push.
- **Sessione 2**: area admin completa, pagamenti e strike, notifiche, dashboard, i18n, PWA e responsive, nice to have, test, README, push.

**[scelta di Claude]** L'infrastruttura i18n (next-intl, file di traduzione) si imposta già in sessione 1, così nessuna stringa viene cablata; in sessione 2 si completano le traduzioni inglesi.

## 12. Test

Test Vitest obbligatori sulle regole di §7 e §8: confini dei 15 minuti, fine entro le 23:00, 1/2 slot, anticipo di 14 giorni (inclusi i confini a mezzanotte e il cambio dell'ora legale), scadenza tessera, max 3 attive, finestra di 2 ore, sovrapposizione (anche concorrente, sul vincolo del DB), strike 1/2/3 con blocco, cancellazione automatica e sblocco.

## 13. Lasciato al builder

- Struttura delle cartelle, nomi esatti di tabelle e campi, librerie minori.
- Design visivo nel dettaglio (palette, layout), restando nello stile di riferimento §4.
- Scelta dei grafici specifici per ogni KPI.
- Gestione della sessione (JWT o database) nell'ambito di Auth.js.
- Dati di esempio del seed.
- Se le prenotazioni create dall'admin per un socio contano nel limite di 3 (consiglio: sì, sono prenotazioni attive del socio, ma l'admin può superare il limite).
- Disattivazione di un campo con prenotazioni future (consiglio: chiedere conferma e cancellarle con notifica).

## 14. Hosting di produzione **[scelta di Claude]**

Nessun hosting scelto (i costi sono fuori ambito per ora). L'app deve restare **portabile**: SQLite in locale, schema Prisma compatibile con PostgreSQL, sessioni Auth.js in JWT, notifiche temporali pigre (nessun cron obbligatorio). Funziona così sia su un piccolo VPS con SQLite sia su una piattaforma serverless con Postgres gestito. Il README documenta come passare a PostgreSQL.
