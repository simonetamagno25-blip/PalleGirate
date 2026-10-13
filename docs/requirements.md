# Requirements – Web-app Prenotazione Campi Sportivi

## 1. Contesto

Il centro sportivo del paese gestisce oggi le prenotazioni dei campi in modo manuale: le iscrizioni passano dal bar del paese (convenzionato, ma non sempre aperto) e capitano spesso prenotazioni in conflitto. L'obiettivo è sostituire questo processo con una **web-app** che permetta ai soci di vedere la disponibilità dei campi e prenotare in autonomia, e all'amministratore di gestire prenotazioni, pagamenti e soci.

## 2. Obiettivi

- Eliminare le prenotazioni in conflitto (doppie prenotazioni dello stesso campo nello stesso orario).
- Permettere ai soci di vedere in tempo reale se un campo è libero o occupato.
- Permettere ai soci di prenotare, modificare e cancellare in autonomia.
- Dare all'admin pieno controllo su prenotazioni, pagamenti e soci.
- Funzionare su smartphone iOS e Android (oltre che da desktop) senza passare dagli store.

## 3. Campi disponibili

| Campo | Quantità | Durata slot | Prezzo a slot |
|---|---|---|---|
| Calcio | 1 | 90 min | 60 € |
| Tennis | 2 | 60 min | 18 € |
| Canestro (basket) | 1 | 60 min | 25 € |
| Bocce | 1 | 60 min | 10 € |

- Orari di apertura: **08:00 – 23:00, tutti i giorni**.
- Non c'è limite al numero di persone per campo (non va gestito).
- Campi, durate, prezzi e orari devono essere **configurabili dall'admin** (o almeno da un file di seed/config), non cablati nel codice.

## 4. Ruoli

### 4.1 Socio (utente)
Può prenotare solo se possiede una **tessera valida**.

### 4.2 Admin
- **Non ha vincoli**: le regole di prenotazione (limite di anticipo, max prenotazioni attive, scadenza tessera, blocco per mancato pagamento, finestra di 2 ore) non si applicano a lui.
- Può creare, modificare e cancellare qualsiasi prenotazione.
- Gestisce soci, tessere e pagamenti.

## 5. Tessera e soci

- La tessera è **cartacea** e contiene i dati anagrafici del socio.
- La tessera **dura un anno** dalla data di emissione.
- L'admin registra nel sistema il socio con: nome, cognome, data di nascita, contatti (email, telefono), numero tessera, data di emissione, data di scadenza.
- **Confermato dal cliente**: l'account viene creato dall'admin; il socio attiva il proprio accesso con numero tessera + email e imposta la password.
- L'admin può rinnovare la tessera (aggiornando la data di scadenza).
- Un socio **non può prenotare una giornata successiva alla data di scadenza** della tessera.
- Nice to have: **avviso di scadenza tessera X giorni prima** (X configurabile, default 15), tramite notifica interna. **Deciso**: X = 15 giorni, modificabile dall'admin.

## 6. Regole di prenotazione

### 6.1 Calendario e slot
- Gli orari di inizio prenotabili sono **ogni 15 minuti** (08:00, 08:15, 08:30, …).
- La durata della prenotazione dipende dal campo (90 min calcio, 60 min gli altri).
- Una prenotazione deve terminare entro le 23:00.
- **"Prenotazioni solo a slot di 2"** – **confermato dal cliente**: una singola prenotazione può coprire **al massimo 2 slot consecutivi** dello stesso campo (es. tennis 1h o 2h; calcio 90 o 180 min). Implementare come parametro configurabile `MAX_SLOTS_PER_BOOKING = 2`.
- Il sistema deve **impedire sovrapposizioni** sullo stesso campo (vincolo a livello di database + controllo lato server, non solo lato client), anche in caso di richieste concorrenti.

### 6.2 Limiti per il socio
- Si può prenotare **al massimo 2 settimane prima** del giorno della prenotazione.
- Massimo **3 prenotazioni attive contemporaneamente** (attiva = futura e non cancellata).
- **Nessun abbonamento / prenotazione ricorrente**: ogni prenotazione è singola.
- Non si può prenotare oltre la scadenza della tessera.
- Non si può prenotare se l'utente è bloccato per mancati pagamenti (vedi §7).

### 6.3 Modifica
- Il socio può **cambiare il campo prenotato** (es. calcio → tennis) e/o l'orario **fino a 2 ore prima** dell'inizio, se il nuovo slot è libero.
- Il prezzo si aggiorna in base al nuovo campo.

### 6.4 Cancellazione
- Il socio può cancellare **gratuitamente fino a 2 ore prima** dell'inizio.
- Dopo questa soglia non può più cancellare dall'app: la prenotazione **va pagata comunque**.
- Nice to have: **motivo della cancellazione** (campo testo opzionale per il socio, consigliato/obbligatorio per l'admin), visibile nello storico e comunicato tramite notifica quando cancella l'admin.

### 6.5 Admin
- Può creare prenotazioni per qualsiasi socio, modificarle e cancellarle in qualunque momento, senza vincoli.

## 7. Pagamenti e strike

- I pagamenti sono **solo in contanti e di persona**: l'app **non** integra pagamenti online.
- L'admin segna ogni prenotazione conclusa come: **Pagata**, **Non pagata**, o (eventualmente) **Annullata/Esente**.
- Se il socio non si presenta, la prenotazione **va comunque pagata** e resta come debito finché l'admin non registra il pagamento.
- Sistema di strike per mancato pagamento:
  - **1° mancato pagamento** → avviso al socio (notifica interna).
  - **2° mancato pagamento** → il socio è **bloccato**: non può più prenotare finché non salda. Tutte le sue **prenotazioni future vengono cancellate automaticamente** (con notifica e motivo).
- Lo sblocco avviene quando l'admin registra il pagamento di tutte le prenotazioni insolute.
- **Confermato dal cliente**: gli strike **non si azzerano mai**. Dopo il saldo il socio viene sbloccato, ma ogni ulteriore mancato pagamento (3°, 4°, …) lo blocca di nuovo subito (con cancellazione delle prenotazioni future) finché non salda. Non esiste esclusione definitiva.

## 8. Notifiche

Gestione **interna** con icona a **campanella** (badge con contatore non lette, lista, segna come letta / segna tutte come lette). Nessuna email/SMS/push richiesta.

Eventi che generano una notifica:
- Prenotazione creata, modificata o cancellata (anche se fatta dall'admin, con motivo).
- Promemoria prenotazione imminente (nice to have).
- 1° mancato pagamento (avviso).
- 2° mancato pagamento (blocco + cancellazione prenotazioni future).
- Sblocco account dopo il pagamento.
- Tessera in scadenza tra X giorni (nice to have) e tessera scaduta.

## 9. Dashboard

Interfaccia **moderna**, con indicatori (KPI) e grafici.

### 9.1 Dashboard socio
- Prossime prenotazioni (con azioni rapide modifica/cancella).
- Prenotazioni attive usate / disponibili (es. 2/3).
- Stato tessera e giorni alla scadenza.
- Stato pagamenti: importo da saldare, numero di strike.
- Grafici: ore giocate per sport, prenotazioni per mese.

### 9.2 Dashboard admin
- Tasso di occupazione per campo (giorno / settimana / mese).
- Incasso atteso vs incassato, importo insoluto.
- Numero di no-show e soci bloccati.
- Fasce orarie più richieste (heatmap o grafico a barre).
- Andamento prenotazioni nel tempo (utile per vedere la stagionalità inverno/estate).
- Tessere in scadenza.

## 10. Funzionalità principali (riepilogo schermate)

- Login / attivazione account / recupero password.
- **Calendario disponibilità**: vista per giorno e per campo, slot liberi/occupati ben distinguibili, visibile anche ai soci (senza mostrare i dati personali di chi ha prenotato).
- Prenotazione guidata: campo → giorno → orario → durata → conferma con riepilogo prezzo.
- Le mie prenotazioni (future e storico).
- Profilo socio (dati, tessera).
- Notifiche (campanella).
- Area admin: gestione soci e tessere, gestione prenotazioni, registrazione pagamenti, configurazione campi/prezzi/orari, dashboard.

## 11. Lingua

- Selettore lingua **Italiano / Inglese** nell'interfaccia, preferenza salvata per utente.
- Tutti i testi in file di traduzione (nessuna stringa cablata nei componenti).
- Date, orari e valute formattati secondo la lingua (formato 24h, euro).

## 12. Requisiti non funzionali

- **Web-app responsive / PWA** installabile su iOS e Android (manifest, icone, "aggiungi a schermata Home").
- Carico molto variabile: quasi nessun utente d'inverno, picchi in estate. Soluzione leggera, a basso costo di hosting.
- Fuso orario: Europe/Rome; tutte le regole temporali (2 ore, 2 settimane, 15 minuti) calcolate lato server.
- Sicurezza: password hashate, sessioni sicure, controlli di autorizzazione lato server per ogni azione, validazione input.
- GDPR di base: dati anagrafici minimi, visibili solo all'admin e al socio stesso.
- Codice pulito, commentato dove serve, con README per installazione e avvio.

## 13. Stack tecnico (proposta)

Stack suggerito, modificabile se Claude Code ritiene ci sia un'opzione più adatta (motivandola nel README):

- **Next.js (TypeScript)** full-stack con App Router.
- **SQLite + Prisma** (semplice in locale, migrabile a PostgreSQL in produzione).
- **Tailwind CSS** + libreria componenti (es. shadcn/ui) per una UI moderna.
- **Recharts** per i grafici.
- **next-intl** (o equivalente) per italiano/inglese.
- Autenticazione con sessioni (es. Auth.js con credenziali).
- Test delle regole di business con **Vitest**.

## 14. Ambiente e versionamento

- Il sito deve girare **in locale** (`npm install` + `npm run dev`), con script di seed che crea: i 5 campi, un admin di default e alcuni soci di esempio.
- Repository **Git**, commit frequenti e descrittivi, push sul branch **`main`**.
- File `.env.example` con le variabili necessarie; nessun segreto committato.

## 15. Piano di sviluppo (2 sessioni di Claude Code)

### Sessione 1 – Fondamenta e prenotazioni
1. Setup progetto, Git, struttura cartelle, README.
2. Modello dati: utenti/soci, tessere, campi, prenotazioni, pagamenti, notifiche.
3. Autenticazione e ruoli (socio / admin).
4. Gestione soci e tessere lato admin.
5. Calendario disponibilità e flusso di prenotazione.
6. Tutte le regole di §6 (slot ogni 15 min, durata, max 2 slot, 2 settimane, max 3 attive, scadenza tessera, finestra 2 ore per modifica/cancellazione, nessuna sovrapposizione).
7. Test automatici sulle regole di prenotazione.
8. Commit e push su `main`.

### Sessione 2 – Gestione, notifiche e rifinitura
1. Area admin completa (prenotazioni senza vincoli, pagamenti).
2. Sistema pagamenti e strike (§7), con blocco e cancellazione automatica.
3. Notifiche con campanella (§8).
4. Dashboard socio e admin con KPI e grafici (§9).
5. Internazionalizzazione IT/EN (§11).
6. PWA e rifinitura responsive.
7. Nice to have: avviso scadenza tessera, motivo cancellazione, promemoria.
8. Test, aggiornamento README, commit e push su `main`.

## 16. Fuori ambito

- Pagamenti online.
- Abbonamenti o prenotazioni ricorrenti.
- App native pubblicate sugli store.
- Notifiche email/SMS/push.
- Gestione del numero di giocatori per campo.

## 17. Punti chiariti con il cliente (13/10/2026)

1. "Prenotazioni solo a slot di 2" → una prenotazione copre al massimo 2 slot consecutivi dello stesso campo (§6.1).
2. Account → creato dall'admin, attivato dal socio con numero tessera + email (§5).
3. Strike → non si azzerano mai; dal 2° in poi ogni mancato pagamento blocca il socio finché non salda (§7).
4. Avviso scadenza tessera → 15 giorni, configurabile (§5).
5. Costi → fuori ambito per ora: ci si concentra solo sullo sviluppo.
