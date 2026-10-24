# Palle Girate — Riferimenti UI/UX (ricerca web)

Data ricerca: 2026-10-24. Metodo: solo web pubblico (pagine marketing, help center, App Store, articoli, blog di design). Nessuna app e' stata installata o provata con login.

**Regola di onesta'**: ogni dettaglio sotto e' marcato con il livello di prova.
- `[V]` = letto su una pagina che ho effettivamente aperto/ottenuto via ricerca (URL in "Fonti").
- `[N]` = NON verificato (pagina bloccata, 403, o nessuna fonte pubblica). Non e' stato inventato nulla: dove manca, e' scritto.
- `[I]` = mia inferenza/raccomandazione di design, non un fatto sul prodotto.

Limiti noti: Playtomic help (403 / dominio non risolto), MATCHi (marketing povero), CourtReserve (nessuna descrizione della griglia member), Vercel/Skedda grid (nessuna descrizione dei colori). Gli screenshot reali non sono leggibili da questo strumento: **le descrizioni di palette/tipografia dei prodotti commerciali NON sono verificate**, tranne Linear e Stripe che pubblicano il loro ragionamento. Prima di decisioni finali, aprire a mano 3-4 app (Playtomic, ClubSpark, Skedda, Cal.com) e verificare.

Contesto prodotto: PWA solo soci per un piccolo centro sportivo italiano, 5 campi (calcio, 2 tennis, basket, bocce), slot 60/90 min, max 14 giorni avanti, max 3 prenotazioni attive, modifica/annulla fino a 2h prima, notifiche, dashboard personale (ore per sport, prossime prenotazioni, scadenza tessera, debito); admin con soci/tessere, prenotazioni, pagamenti in contanti (pagato/non pagato/esente -> strike e blocco automatico), impostazioni/campi, analytics; IT/EN, chiaro/scuro, mobile-first.

---

## 1. Schede prodotto (20)

### 1.1 Playtomic (app giocatori) — categoria: booking sport racchetta
- **Fonti**: playtomic.com home; playtomic.com/it/clubs/playsport-lesmo; playerhelp.playtomic.com (via risultati ricerca: prenotazione, cancellazione, FAQ); aranzulla.it (guida app padel); App Store MATCHi (confronto).
- **Selettore slot** `[V]` La pagina club (versione IT) mostra: selettore data, **tab per sport** ("Calcio a 5", "Padel", "Tennis"), una **riga di etichette orarie** dalle 9 alle 19, elenco campi con tag ("PADEL SCOPERTO — outdoor, double, crystal"), e una **legenda a tre stati**: "disponibile" / "non disponibile" / "la tua prenotazione". Stato vuoto: "Nessun slot disponibile". Il layout e' quindi timeline per campo, con legenda esplicita (non vedo i colori esatti `[N]`).
- **Flusso** `[V]` (help + aranzulla): sport -> luogo -> data/ora -> campo e durata -> scelta se pagare solo la propria quota (divisione per 4) o tutto -> metodo di pagamento. Si puo' simulare fino a "Continue payment" per vedere il totale senza addebito. Il pulsante finale riporta prezzo e durata. Filtri: distanza, durata, indoor/outdoor, tipo parete.
- **Conferme/cancellazioni** `[V]` La policy di cancellazione e' mostrata nella schermata di prenotazione e nel dettaglio prenotazione; ogni club imposta la propria finestra; fuori finestra l'utente deve contattare il club (l'app non cancella). Aranzulla riporta "cancellazione gratuita fino a 30 ore prima" per una configurazione. Rimborsi su wallet del club istantanei, su carta 2-15 giorni lavorativi.
- **Navigazione mobile** `[V parziale]` Home con "Prenota un campo" e "Trova una partita"; scheda "Community" come feed. Tab bar esatta `[N]`. Il changelog MATCHi (confronto) dice "prossima prenotazione sulla Home" (v26.5.0): stesso schema desiderato per Palle Girate.
- **Stile visivo** `[N]` Il sito usa hero fotografici grandi e sfondo blu ("energy-blue") `[V]`; il resto non verificato.
- **Da rubare**: legenda a 3 stati esplicita + stato "la tua prenotazione" distinto da "non disponibile"; policy di cancellazione mostrata PRIMA di confermare; "Prenotazione in 3 passi" come obiettivo (testimonianza sul sito `[V]`).
- **Da evitare**: finestre di cancellazione diverse e poco prevedibili per club, e rinvio al club fuori finestra (frustrazione); commissioni di servizio opache (4% non rimborsabile `[V]`).

### 1.2 MATCHi
- **Fonti**: matchi.se; App Store MATCHi (id720782039); padelspeed (429, non letto).
- **Selettore slot** `[N]` Il sito mostra uno screenshot "venue schedule" ma nessun testo. Non so come siano rappresentati libero/occupato.
- **Flusso** `[V]` 4 passi dichiarati: login -> scegli sede -> data, ora, campo -> metodo di pagamento e prenota. Filtri per sport, data, ora, tipo campo. Pagamento diviso con amici.
- **Notifiche/conferme** `[N]`.
- **Novita'** `[V]` v27.4.0 aggiunge basket, futsal, pallavolo (utile: stessi sport del nostro centro); "prossima prenotazione in Home"; recensione cita pagamento incassato ma non mostrato come pagato (segnala l'importanza di stato pagamento chiaro).
- **Stile visivo** `[N]`.
- **Da rubare**: "Overview dei campi preferiti" (scorciatoia ai propri campi).
- **Da evitare**: stato di pagamento non allineato fra provider e app (una review lo segnala).

### 1.3 CourtReserve
- **Fonti**: courtreserve.com; Vimeo (color coding CourtReserve, via ricerca).
- **Selettore slot** `[N]` Nessuna descrizione della griglia member.
- **Admin** `[V]` Prenotazioni campi, calendari pro, eventi con prezzo socio/non socio e posti rimasti, abbonamenti con rinnovo, fatturazione batch (esempio fattura 75$ aprile 2025), POS, dashboard "Pulse", app brandizzata, schermata pagamento con totale e pulsante "paga".
- **Colori** `[V]` Il webinar dice che l'admin assegna colori per tipo prenotazione, categoria evento, tipo lezione, istruttore, tag; il colore aiuta i soci a navigare calendario eventi/lista.
- **Stile** `[N]`.
- **Da rubare**: color coding configurabile per TIPO (non per stato) + mostrare "posti rimasti".
- **Da evitare**: sistema enorme (POS, payroll, leghe) per un centro da 5 campi: complessita' non necessaria.

### 1.4 ClubSpark (LTA, Regno Unito)
- **Fonti**: clubspark.lta.org.uk — pagine HowtoBook (Wheathampstead), Booking (Kirby), Playing/BookingCourts (Cocks and Hens), Booking help (Colden Common) via ricerca.
- **Selettore slot** `[V]` **Vista giorno** (4 campi in colonna per un giorno) e **vista settimana** (7 giorni, campo per campo). Data da icona calendario; clic sull'ora di inizio -> popup per l'ora di fine (max 90 min; in altri club 30 min fino a 2h). Ordinamento per campo o per data (Cocks and Hens). Legenda colori: **non descritta** nelle pagine lette `[N]`.
- **Flusso** `[V]` Login -> data -> campo -> ora inizio -> ora fine -> aggiungi giocatori -> conferma. Max 28 giorni avanti (Kirby). Limiti: 90 min a prenotazione, 2 sessioni/settimana (adulti), 6 per famiglia (Wheathampstead).
- **Conferme/cancellazioni** `[V]` Email di conferma; cancellazione in qualsiasi momento prima dell'inizio dal link "manage bookings" o da "Your Bookings"; l'app "Booker" non permette di aggiungere partecipanti. Codice d'accesso a 4 cifre via email valido per la fascia + 10 minuti (Colden Common).
- **Particolarita'** `[V]` Alcuni campi appaiono con lucchetto se non sei nel gruppo familiare.
- **Da rubare**: scelta dell'ora di fine in un popup (utile per slot 60 vs 90); limiti per settimana spiegati nel contesto; link "gestisci prenotazione" nelle email.
- **Da evitare**: flusso a due clic con popup su desktop e app separata con meno funzioni (partecipanti mancanti) = incoerenza; legenda non visibile nella pagina help.

### 1.5 Skedda
- **Fonti**: support.skedda.com (scheduler come utente; booking coloring); skedda.com/home/booking-calendar (403, non letta); ricerca.
- **Selettore slot** `[V]` Viste: Giorno, Mese, **Griglia** (piu' giorni), Lista (intervallo), Mappa (piantina interattiva). Filtri in alto a destra (tag spazio, tipo, capacita'). **Aree verdi = prenotabili; orari grigi = non disponibili** (fuori orario o bloccati da regole; clic per vedere il perche'). Come appaiono le prenotazioni altrui/proprie: **non descritto** nell'articolo `[N]`; altra fonte parla di cerchio verde (libero) e icona persona blu (occupato) sulla vista mappa `[V]`.
- **Flusso** `[V]` Seleziona area verde (o "+" verde in basso a destra) -> finestra Nuova prenotazione (precompilata; titolo, ripetizione, note; pagamento se attivo) -> conferma -> email.
- **Modifica/annulla** `[V]` Chevron sul blocco -> "Edit booking"; doppio clic; **drag/resize del blocco**. Se disabilitato, un "?" spiega **perche'** (es. politica di lock-in, prenotazione segnata come pagata). "End early" per liberare il tempo non usato. "Duplicate".
- **Colori admin** `[V]` Regole di colore per tipo, **stato di pagamento**, utente, tag, parole chiave; prima regola che corrisponde vince; 11 colori; le prenotazioni non pagate si evidenziano in rosso. I colori non sono visibili agli utenti normali.
- **Da rubare**: "Perche' non posso?" con "?" accanto all'azione disabilitata (perfetto per la regola delle 2h e per i max 3 attivi); colore admin per stato di pagamento (non pagato = rosso).
- **Da evitare**: troppi viste (5) per un centro piccolo; colori visibili solo ad alcuni ruoli (esperienza incoerente).

### 1.6 WeSmash (Italia)
- **Fonti**: aranzulla.it/app-per-prenotare-campi-padel-1389205.html.
- **Flusso** `[V]` "Prenota un campo" -> luogo (con "Vicino a me") -> giorno -> sport -> durata (60/90/120) -> giocatori -> fascia -> "Visualizza i risultati" -> "Prenota campo" -> scegli campo se possibile -> riepilogo -> "Conferma". Cancellazione gratuita fino a 24h. "MySmash" dal profilo: storico prenotazioni/partite e pagamento.
- **Stile** `[N]`.
- **Da rubare**: schermata di riepilogo finale prima di "Conferma".
- **Da evitare**: 8 passi per prenotare, molti irrilevanti per un centro con un solo sito (luogo, giocatori).

### 1.7 Sportclubby / Prenotauncampo (gruppo Playtomic)
- **Fonti**: aranzulla.it; solutelabs.com/blog/sportclubby-app; eu-startups.com e i3p.it (storia acquisizioni, via ricerca).
- **Flusso** `[V]` Cerca club -> "Prenota" -> "Ricerca disponibilita'" apre un **calendario** -> scegli giorno e ora -> se libero, "Prenota" sulla destra. Verifica SMS PIN alla prima prenotazione. Non tutti i club permettono la disdetta in app. Inviti amici ai campi prenotati, notifiche di disponibilita'.
- **Stile** `[N]`. Approccio dichiarato dal blog: scoperta in pochi tocchi, "sostituire sistemi online confusi e telefonate".
- **Dati** `[V]` Circa 1 milione di utenti, oltre 950 strutture (fonte terza); acquisita da Playtomic.
- **Da rubare**: verifica telefono una tantum.
- **Da evitare**: disdetta non sempre disponibile in app = ritorno alle telefonate (esattamente cio' che il prodotto deve eliminare).

### 1.8 "Prenota il tuo Campo" (app Italia)
- **Fonti**: apps.apple.com/it/app/prenota-il-tuo-campo/id1619533130.
- **Funzioni** `[V]` Tennis, padel, calcetto, beach volley; calendario aggiornato; ricerca per posizione; corsi; **notifiche push native** ("aggiornamenti immediati su prenotazioni e comunicazioni dal tuo centro"). Rating 4.0 su 4 voti. Una recensione loda semplicita' e intuitivita'; un'altra lamenta che l'app apre un sito web e non e' nativa (aspettativa PWA/nativa).
- **Da rubare**: push per prenotazioni E comunicazioni del centro (chiusure per pioggia).
- **Da evitare**: app che e' un sito incapsulato percepito come "finto"; per una PWA serve curare installazione e comportamento standalone.

### 1.9 Anolla (software impianti, IT)
- **Fonti**: anolla.com/it/software-di-gestione-impianti-sportivi.
- **Utente** `[V]` Orari liberi in tempo reale; calendario con **codici colore** per giorno/settimana/mese; durata variabile scelta dal cliente; lista d'attesa automatica; QR/link di prenotazione; conferme e **promemoria SMS/email**; pagamenti Stripe.
- **Gestore** `[V]` CRM soci con segmenti e note; livelli di iscrizione; **carnet e ingressi prepagati con conteggio automatico**; abbonamenti con rinnovo; dashboard con fatturato/nuovi clienti; esportazione.
- **Da rubare**: lista d'attesa "avvisami se si libera"; QR del campo.
- **Da evitare**: promesse generiche di marketing (Pixel, CRM campagne) fuori scopo.

### 1.10 Padel Mates
- **Fonti**: apps.apple.com/app/id1531797995 (via ricerca).
- **Funzioni** `[V]` Prenota e paga campi e attivita'; mappa dei centri; partite, tornei, allenamenti. Flusso: registrati, imposta livello e sedi preferite, cerca e prenota.
- **Vista disponibilita'** `[N]`.
- **Da rubare**: nulla di verificato oltre "sedi preferite".
- **Da evitare**: non applicabile / non verificato.

### 1.11 Cal.com (booker + dashboard prenotazioni)
- **Fonti**: cal.com/blog (layout multipli); cal.com/blog (walkthrough dashboard); cal.com/docs/platform/atoms/booker; cal.com/help (Past bookings filtering) via ricerca.
- **Selettore** `[V]` Tre layout: **mese** (default), **settimana**, **colonna**; l'host puo' abilitarne uno o piu' e far scegliere all'ospite. I giorni disponibili sono segnati nel date picker; selezionando un giorno compaiono gli slot. Stati del booker: loading, selezione data, selezione ora, booking, success, error. Su schermi piccoli esiste un flag per passare alla vista slot (`useSlotsViewOnSmallScreen`, da config embed). Quando l'host ripianifica, puntini **verde/rosso** per libero/conflitto.
- **Dashboard** `[V]` Pagina Bookings con 5 tab: **Upcoming, Unconfirmed, Recurring, Past, Canceled** + pulsante **Filters** (persone, tipi evento, date) a destra. Past applica di default "Last 7 days" con pill rimovibile. Azioni: riprogramma, modifica.
- **Stile** `[N]` (non verificato; noto solo tema light/dark/auto e colore brand configurabili `[V]`).
- **Da rubare**: tab "Prossime / Passate / Annullate" per la lista personale e admin; filtro a pill rimovibile; giorno+slot su mobile come due passi.
- **Da evitare**: mese+sidebar su mobile se non si passa alla vista slot; il calendario mensile e' sbagliato per chi vuole vedere 5 campi nello stesso giorno.

### 1.12 Calendly
- **Fonti**: help.calendly.com (link cancel/reschedule), community.calendly.com, support.multiverse.io (via ricerca).
- **Flusso** `[V]` Reschedule riapre la pagina di prenotazione con disponibilita' correnti; cancel chiede conferma e nota opzionale; link nelle email di conferma e promemoria; policy di cancellazione mostrata ma **non applicata dalla piattaforma**; dopo cancellazione il link "riprogramma" sparisce. Community segnala link rotto (404) nell'email.
- **Da rubare**: "Riprogramma" = stesso picker con la prenotazione corrente evidenziata; conferma + motivo opzionale in cancellazione.
- **Da evitare**: link email che portano a 404 / policy mostrata ma non applicata (confonde).

### 1.13 Mindbody / ClassPass
- **Fonti**: mindbodyonline.com (blog riduzione no-show, via ricerca); getapp/capterra ClassPass (recensioni).
- **Politiche** `[V]` Finestra di cancellazione e fee per late cancel/no-show configurati dal business per categoria; appuntamenti passano automaticamente a no-show 10 minuti dopo l'inizio; in classi lo staff puo' segnare "Late Cancel" e il sistema scala una sessione dal pacchetto. Studio d'esempio: 120 minuti prima senza penale.
- **Recensioni ClassPass** `[V]` Booking mobile "effortless"; ma ricerca solo per studio, non per classe; richiesta: preferiti in dashboard prenotabili in un tap, promemoria all'apertura della finestra di prenotazione; forte frustrazione per late fee non derogabile e supporto che rimanda alla pagina regole.
- **Da rubare**: regola "2 ore" mostrata sempre come contatore ("annullabile ancora per 1h 20m"); promemoria quando si apre la finestra (per noi: ogni giorno entra un nuovo giorno a +14).
- **Da evitare**: penalita' senza possibilita' di appello/spiegazione (collegata a strike e blocco: serve schermata "perche' sono bloccato" e contatto).

### 1.14 Fresha
- **Fonti**: fresha.com/help-center (no-show, cancellazioni, notifiche, policy pagamento) via ricerca e fetch.
- **No-show** `[V]` Dall'appuntamento: stato -> No-show -> finestra di conferma (gestione policy, notifica cliente opzionale) -> "Set as no-show". Solo dopo l'ora di inizio. Registrato nel profilo cliente; report riassuntivo cancellazioni/no-show; **"Undo no-show"** con opzioni dipendenti dal pagamento.
- **Notifiche** `[V]` Conferma immediata con data/ora/indirizzo/servizio/prezzo + policy; promemoria fino a due (3/24/48/72h prima, secondo 1h prima); i clienti che hanno prenotato online sono sempre avvisati delle cancellazioni; se annulla lo staff, checkbox "notifica".
- **Da rubare**: "Undo" per ogni stato di pagamento/no-show (errore frequente in cassa); registrazione nel profilo del socio.
- **Da evitare**: nulla di verificato; le percentuali di riduzione no-show sono marketing dell'azienda, non prove indipendenti.

### 1.15 EZFacility
- **Fonti**: ezfacility.com.
- **Member** `[V]` Calendario struttura 24/7, acquisto pacchetti/abbonamenti, aggiornamento pagamento e pagamento saldi online; app con **tessera virtuale** per check-in; push per orari/promozioni.
- **Admin** `[V]` Scheduling drag-and-drop anti-conflitto, report finanziari/abbonamenti in unica dashboard, export CSV/PDF/XLSX.
- **Stile** `[V parziale]` Sito con menu a scomparsa su mobile, card con icone; schermate admin non descritte `[N]`.
- **Da rubare**: tessera virtuale con scadenza ben visibile.
- **Da evitare**: pagamento carta/ACH obbligato: nel nostro caso e' contanti in sede.

### 1.16 Teamup
- **Fonti**: teamup.com.
- **Funzioni** `[V]` 12 viste (Timeline, Scheduler, Tiles, Table, ecc.), colori, filtri "per ridurre il sovraccarico", **9 livelli di permesso**, nascondere dettagli sensibili a chi sola lettura, link condivisibili e calendari embeddabili, Daily Agenda.
- **Stile** `[N]`.
- **Da rubare**: "Agenda" lineare per giorno come alternativa alla griglia; nascondere nome altrui nella griglia dei soci (privacy: mostrare solo "occupato").
- **Da evitare**: 12 viste.

### 1.17 Bookteq
- **Fonti**: capterra.com/p/211620/Bookteq; getapp (via ricerca).
- **Funzioni** `[V]` Widget calendario embeddabile; **prenotazioni in attesa di approvazione**; portale cliente; pagamenti ricorrenti; blocchi prenotazioni; multi-sito.
- **Stile** `[N]`.
- **Da rubare**: blocchi (chiusura campo per pioggia/manutenzione/torneo) come tipo di evento distinto.
- **Da evitare**: modello "noleggio a terzi" con approvazioni: non serve ai soci.

### 1.18 Linear (riferimento admin/gusto)
- **Fonti**: linear.app/now/how-we-redesigned-the-linear-ui.
- **Principi** `[V]` Temi generati da 3 variabili (base, accent, contrast) invece di 98; spazio colore **LCH** percettivamente uniforme; uso **restrained** dell'accento per un look neutro e atemporale; elevazione tramite superfici; coppia **Inter Display** (titoli) + **Inter**; meno rumore in sidebar/header; **allineamento verticale e orizzontale** di label/icone/pulsanti ("lo senti dopo qualche minuto"); contrasto testo aumentato (piu' scuro in light, piu' chiaro in dark).
- **Da rubare**: un tema da 3 variabili (base+accent+contrast) -> dark/light coerenti e a basso costo; accento usato poco.
- **Da evitare**: stile "tool per ingegneri" troppo neutro: da solo non e' sportivo/italiano.

### 1.19 Stripe Dashboard
- **Fonti**: stripe.com/blog/accessible-color-systems.
- **Principi** `[V]` Sistema colore in **CIELAB**; target WCAG 4.5:1 testo piccolo e 3:1 testo grande; ogni tinta segue la stessa curva luminosita'-contrasto, quindi step uguali = contrasto uguale; testo/icone leggibili su bianco e sulla tinta piu' chiara di ogni hue; regola "5 step di distanza per testo piccolo, 4 per icone"; i **Badge** usano sfondi colorati e, dove i colori chiari si confondono, si spostano sfondo e testo di uno step.
- **Da rubare**: badge di stato con regola di contrasto fissa (pagato/non pagato/esente devono avere forma/etichetta oltre al colore).
- **Da evitare**: non verificato: nessuna scheda sul modello di stato dei pagamenti nell'articolo.

### 1.20 Vercel (Geist)
- **Fonti**: vercel.com/geist/introduction.
- **Dati** `[V]` Due font (Geist Sans, Geist Mono), "high contrast, accessible color system", **griglia come parte centrale dell'estetica**, materiali (raggi, fill, stroke, ombre) come preset. Nessun dato su densita' `[N]`. La pagina sul nuovo dashboard non era raggiungibile (era la pagina di login) `[N]`.
- **Da rubare**: font mono/tabulari per numeri e orari; materiali come token.
- **Da evitare**: estetica troppo monocromatica per un centro sportivo.

---

## 2. Cosa dicono le ricerche generiche (UX di date/slot)

- `[V]` Baymard: nei test, gli utenti **fraintendono spesso quali date/orari sono liberi** per colpa di come sono mostrati; vince la gerarchia visiva chiara di data e slot (il dettaglio e' dietro paywall `[N]`).
- `[V]` UXPin / Uxcel (consigli generici, non test): disabilitare le date non disponibili invece di farle scegliere e poi respingere; evidenziare "oggi" con un contorno e la selezione con riempimento (distinti); su mobile un calendario modale e' scomodo per date lontane.

---

## 3. Sintesi

### 3.1 Top 10 pattern da adottare (lato socio), in ordine di impatto su "semplice da usare"

1. **Prossima prenotazione in cima alla Home, con azione e contatore.** Card "Giovedi' 18:00 — Tennis 1 — annullabile ancora 3h 10m". Riferimenti: MATCHi v26.5.0 "next booking on Home" `[V]`; contatore e' `[I]` da Mindbody (finestra) `[V]`.
2. **Giorno prima, poi campi: striscia di 14 giorni (swipe) + griglia del giorno.** Un solo passo di data; non calendario mensile (Cal.com in mobile passa agli slot `[V]`; UX generica `[V]`). Mostra un puntino per giorno se ci sono slot liberi per ricordare l'orizzonte a 14 giorni `[I]`.
3. **Griglia del giorno: righe = campi (5), colonne = fasce orarie.** Su 360px 5 righe stanno senza scroll verticale; orari scorrono orizzontalmente con intestazione orari fissa (`sticky`). Riferimento: Playtomic (timeline con riga di orari e campo per riga) `[V]`; ClubSpark day view (campi per giorno) `[V]`.
4. **Legenda a tre stati sempre visibile, mai solo colore**: *libero* (contorno + testo), *occupato* (campitura tratteggiata/grigia, senza nome del socio), *tua* (riempita col colore primario + icona spunta). Riferimenti: legenda Playtomic "disponibile / non disponibile / la tua prenotazione" `[V]`; Skedda verde/grigio con motivo cliccabile `[V]`. Il motivo di "non disponibile" (fuori orario, oltre 14 giorni, limite 3 attive, chiuso) e' `[I]` da Skedda.
5. **Selezione slot -> pannello inferiore (bottom sheet) con durata 60/90 e riepilogo, un solo pulsante "Prenota".** Tre passi: giorno, slot, conferma (Playtomic "tre passi" `[V]`; WeSmash riepilogo finale `[V]`). Durata come scelta a due pulsanti, non popup di ora fine (ClubSpark popup `[V]` e' piu' lento).
6. **Regole mostrate nel contesto, non in un FAQ**: "Hai 2 prenotazioni attive su 3", e se disabilitato un "?" che spiega perche' (Skedda `[V]`). Il contatore max-3 appare nel header della pagina Prenota.
7. **Azioni sulla prenotazione con stato temporale**: "Modifica/Annulla" attive fino a 2h prima; dopo, pulsanti disabilitati con testo "Non piu' modificabile (meno di 2h)". Conferma d'annullamento con motivo opzionale (Calendly `[V]`); "Riprogramma" riapre la griglia con lo slot attuale evidenziato (Calendly `[V]`).
8. **Conferma immediata a schermo e in notifica con dettagli e policy**: data, ora, campo, durata, "annullabile fino a ...". Fresha elenca esattamente questi campi `[V]`. Promemoria (es. 24h e 2h; Fresha 3/24/48/72h `[V]`).
9. **Dashboard personale in 3 blocchi**: *Prossime* (lista), *Tessera* (scadenza con barra e stato), *Debito* (importo, evidenziato solo se > 0). Ore per sport come grafico semplice (barre orizzontali con icona sport), non torta. Tessera virtuale: EZFacility `[V]`. Debito/tessera: `[I]`.
10. **Preferiti / "stesso slot della settimana scorsa" in un tap + avviso quando si libera uno slot.** ClassPass: utenti chiedono preferiti prenotabili in un tap e promemoria all'apertura della finestra `[V]`; lista d'attesa: Anolla `[V]`. Per Palle Girate: notifica "si e' liberato Tennis 2, sabato 10:00" `[I]`.

Bonus: stati vuoti con azione ("Nessuna prenotazione — Prenota un campo"), come "Nessun slot disponibile" di Playtomic `[V]` ma con suggerimento del prossimo giorno libero `[I]`.

### 3.2 Top 6 pattern lato admin

1. **Registrazione pagamento in 1 tocco dalla riga della prenotazione.** Tre stati netti: *Pagato / Non pagato / Esente* (chip segmentato), con **"Annulla" (undo)** sempre disponibile e finestra di conferma che mostra l'effetto sugli strike. Riferimenti: Fresha mark no-show -> conferma -> "Undo no-show" con effetti `[V]`; Skedda "non pagato = rosso" `[V]`; Mindbody late-cancel/no-show `[V]`.
2. **Coda "Da incassare / Da registrare".** Vista lista filtrata per giorno con le prenotazioni passate senza stato pagamento (si puo' impostare solo dopo l'ora di inizio, come in Fresha `[V]`). Evita di cercare nel calendario.
3. **Scheda socio a una pagina**: intestazione con nome, tessera e scadenza, **strike (0/3) con barra**, stato blocco, saldo; sotto, timeline cronologica (prenotazioni, pagamenti, strike, note). Il no-show e' registrato nel profilo cliente (Fresha `[V]`); carnet/ingressi con conteggio automatico (Anolla `[V]`). Azioni: sblocca, azzera strike, esenta (con motivo e audit).
4. **Calendario admin con colore per stato di pagamento + icona per tipo**, non solo per sport. Skedda (colore da stato pagamento, prima regola vince) `[V]`; Playtomic colora per tipo di prenotazione, orari di chiusura in azzurro e strisce per l'apertura `[V]`; hover/tap con dettagli rapidi `[V]`. Evitare di dipendere solo dal colore (Stripe: badge con etichetta e contrasto) `[V]`.
5. **Prenotazioni in tab + filtri a pill**: Prossime / In corso oggi / Passate / Annullate (Cal.com 5 tab + Filters + pill rimovibile) `[V]`. Blocchi campo (pioggia, manutenzione, torneo) come tipo distinto (Bookteq "block bookings" `[V]`).
6. **Analytics sobri**: 4 KPI in alto (ore prenotate, occupazione %, incassato vs da incassare, no-show/strike) con delta, poi una heatmap giorno x ora per capire le fasce piene e un grafico a barre per campo/sport. Dashboard in tempo reale con fatturato/nuovi clienti come Anolla `[V]`; esportazione CSV (EZFacility `[V]`). Palette dati con regole di contrasto fisse (Stripe `[V]`). Livello di dettaglio `[I]`. Non copiare la dimensione dei sistemi ERP.

### 3.3 Direzione visiva

Premesse da rendere vere: (a) legenda stati non basata solo sul colore; (b) i colori dei 4 sport sono decorativi e NON si confondono con libero/occupato/tua; (c) tutti i testi 4.5:1 (Stripe `[V]`); (d) tema generato da base + accento + contrasto (Linear `[V]`); (e) numeri e orari in cifre tabulari.

Nota: palette e font sotto sono **proposte** `[I]`; i contrasti vanno verificati con un checker prima dell'uso. I font indicati sono su Google Fonts (famiglie ben note: Fraunces, Figtree, Barlow Condensed, Inter), da confermare le versioni variabili in fase d'implementazione.

#### Direzione A — "Terra Rossa" (circolo di quartiere, caldo)
- **Mood**: club storico italiano, il lato terra battuta del tennis, tabellone con gesso, ma pulito. Amichevole, per soci di ogni eta'. Contraddice l'aspetto SaaS grigio-blu.
- **Palette (chiaro)**: sfondo `#F6F0E6` (carta), superficie `#FFFFFF`, testo `#1E2A24`, testo secondario `#5B665F`, linee `#E2D9C8`, **primario verde pino `#1F5C45`**, **accento terra `#C8553D`** (solo per azioni forti, avvisi e "stai per superare"), successo `#2E7D4F`, attenzione `#B7791F`, errore `#B3261E`.
- **Palette (scuro)**: sfondo `#14181A`, superficie `#1D2326`, testo `#EFE9DC`, linee `#2C3438`, primario `#58B58D`, accento `#E4795F`.
- **Stati griglia**: libero = bianco con contorno `#CFC5B2` e orario in `#1E2A24`; occupato = tratteggio diagonale su `#E9E2D3`; tua = `#1F5C45` con spunta.
- **Tipografia**: titoli **Fraunces** (serif con carattere, usare con parsimonia: titoli di pagina e numeri grandi della dashboard); UI e testo **Figtree** (leggibile, rotonda); cifre tabulari attive.
- **Densita'**: media, target touch 48px, griglia con celle da 44-48px.
- **Raggio**: 14px card, 10px pulsanti e celle, 999px chip.
- **Iconografia**: tratto 1.75px arrotondato (set Lucide o Phosphor Regular), icone sport personalizzate semplici (pallone, racchetta, canestro, boccia) con contorno.
- **Movimento**: 180-220ms, easing morbido; transizione "slot -> pannello" con slide dal basso; spunta disegnata alla conferma; rispetta `prefers-reduced-motion`.
- **Giustificazione**: Linear (accento usato poco e temi da pochi parametri) `[V]`, Stripe (contrasto per step) `[V]`, la scelta di legenda a 3 stati di Playtomic `[V]`. Il caldo-terra serve per differenziare dal blu di Playtomic (sito "energy blue") `[V]`.
- **Per farlo sentire sportivo/italiano e non SaaS**: pattern di linee campo come texture molto sottile (riga di fondo, cerchio centrale) nell'header Home; numeri grandi tipo tabellone per "ore giocate"; copy in tono da circolo ("Il campo e' tuo", "Buon gioco"); foto o illustrazioni lineari dei 5 campi; stato "tessera" come tesserino fisico con scadenza.

#### Direzione B — "Tabellone" (sera sotto i riflettori, energica)
- **Mood**: scoreboard + fascio di luce notturno, atletico e frizzante, forte identita' per il tema scuro; rapido e leggibile in uscita dalla partita. Ricorda un tabellone di palestra, non una dashboard SaaS.
- **Palette (scuro, tema principale)**: sfondo `#0E1411`, superficie `#161E19`, superficie rilevata `#1E2822`, testo `#EEF3EC`, testo secondario `#9AA79E`, linee `#263029`, **accento volt `#C6F135`** (testo scuro `#0E1411` sopra), secondario arancio basket `#FF7A3D`, errore `#FF5C5C`, successo `#4ADE80`.
- **Palette (chiaro)**: sfondo `#F4F6F1`, superficie `#FFFFFF`, testo `#0E1411`, linee `#DDE3D8`, accento per testo/linee `#4D7A00` (il volt puro non regge su bianco, serve versione scura), riempimenti con volt `#C6F135` solo con testo scuro.
- **Stati griglia**: libero = contorno sottile + orario; occupato = riempimento `#1E2822` con barretta diagonale; tua = riempimento volt con testo scuro (massimo contrasto; e' lo slot piu' importante).
- **Tipografia**: titoli e numeri **Barlow Condensed** 600/700 maiuscolo (tabellone), UI **Inter** (come Linear `[V]`), cifre tabulari.
- **Densita'**: medio-compatta, celle 40-44px ma area tocco estesa a 48px; sezioni stile "riga di punteggio".
- **Raggio**: 8px card, 6px celle, 999px solo chip stato.
- **Iconografia**: tratto 2px, angoli netti, icone sport glifo pieno; numeri grandi come elemento grafico.
- **Movimento**: 120-160ms scatto rapido, "flip" delle cifre (tipo tabellone a palette) quando cambia il contatore o il tempo rimanente; niente rimbalzi lunghi; reduced-motion con dissolvenza.
- **Giustificazione**: Linear (tema da 3 variabili, contrasto regolabile, elevazione per superfici) `[V]`; Vercel (due font, sistema ad alto contrasto, griglia come estetica) `[V]`; i soci prenotano spesso la sera.
- **Per farlo sentire sportivo/italiano e non SaaS**: numeri tipo tabellone (ore giocate, "00:2h" contatore); strisce tricolore usate con parsimonia (barra sottile verde-bianco-rosso solo nel logo/splash, mai nei controlli); maiuscole condensate nei titoli di sezione; il volt richiama la pallina da tennis; foto notturne dei campi sotto i fari.

Raccomandazione `[I]`: se l'utenza e' mista e diurna (famiglie, over 50) partire da **A**; se prevalgono giocatori serali e giovani, da **B**. Entrambe usano lo stesso sistema di token (base, accento, contrasto) cosi' il cambio e' a basso costo (Linear `[V]`). Colori per sport: usare 4 tinte desaturate solo su icona/chip (non sulla griglia) per non confliggere con gli stati.

### 3.4 Anti-pattern visti nella categoria

1. **Legenda assente o implicita**: le pagine help di ClubSpark e di Skedda sulla vista non descrivono come si distinguono libero/occupato/tuo `[V]` (assenza di descrizione nelle pagine lette); Baymard: gli utenti fraintendono spesso le disponibilita' `[V]`.
2. **Troppe viste** (Skedda 5, Teamup 12, Cal.com 3) per un centro con 5 campi `[V]`.
3. **Calendario mensile come primo passo su mobile** per una finestra di 14 giorni: troppo spazio per poca informazione (UXPin/Uxcel: calendari modali scomodi) `[V]` `[I]`.
4. **Azioni disabilitate senza spiegazione** (Skedda ha il "?" proprio per questo `[V]`; senza, diventa un anti-pattern `[I]`).
5. **Penalita' senza trasparenza/appello** (ClassPass late fee non derogabile, supporto che rimanda alla pagina regole) `[V]`; con strike e blocco automatico il rischio e' alto.
6. **Policy diversa e poco prevedibile + cancellazione non disponibile in app** (Playtomic per club; Sportclubby non sempre) `[V]`.
7. **Link email rotti** (Calendly community, 404) `[V]`.
8. **App "sito incapsulato"** percepita come non nativa (recensione di Prenota il tuo Campo) `[V]`.
9. **Stato di pagamento non allineato** (recensione MATCHi) `[V]`.
10. **Colore come unico segnale di stato** (colori visibili solo per ruolo in Skedda, ripiego con emoji `[V]`); in generale i colori chiari di badge si confondono (Stripe ha dovuto spostare gli step) `[V]`.
11. **Flussi lunghi per un solo sito** (WeSmash 8 passi con luogo e giocatori) `[V]`.
12. **Tap target piccoli**: *non* verificato su prodotti reali; regola nostra `[I]`: minimo 44-48px, specie su celle di griglia, chip e pulsanti di scelta durata.

---

## 4. Lacune dichiarate

- Non ho visto direttamente le interfacce di Playtomic, MATCHi, CourtReserve, ClubSpark, Padel Mates, Sportclubby: solo testi di help/marketing. Palette e tipografia di questi prodotti non sono verificate.
- Playtomic help (domini playerhelp/help) e Skedda marketing: 403 o dominio non risolto; ho usato solo gli estratti dei risultati di ricerca.
- Nessuna fonte reperita su: legenda colori ClubSpark/MATCHi/CourtReserve; stile visivo di Mindbody/ClassPass/Fresha/Calendly; bottom-nav di Playtomic.
- Non ho trovato case study su Dribbble/Behance specifici per Playtomic (solo un profilo Proxify che cita la design system del lato manager `[V]`).
- Le percentuali di riduzione no-show di Fresha sono marketing (non indipendente).

---

## Fonti (URL effettivamente usati)

Prodotti e booking:
- https://playtomic.com/
- https://playtomic.com/it/clubs/playsport-lesmo
- https://playerhelp.playtomic.com/hc/en-gb/articles/19831881490449-How-to-make-a-reservation-in-Playtomic-app (solo estratto da risultato di ricerca; fetch 403)
- https://playerhelp.playtomic.com/hc/en-gb/articles/19831715222929-How-to-book-a-court-or-a-spot-in-a-match-in-your-favourite-Club (solo risultato di ricerca)
- https://playerhelp.playtomic.com/hc/en-gb/articles/19832121593873-How-to-cancel-a-reservation (risultato di ricerca; fetch 403)
- https://playerhelp.playtomic.com/hc/en-gb/articles/19832175736593-Refunds-and-when-you-will-receive-your-money (risultato di ricerca)
- https://playerhelp.playtomic.com/hc/en-gb/articles/19831791848721-Cancellation-fee (risultato di ricerca)
- https://help.playtomic.com/en/articles/5586032-opening-hours-colors-and-the-hover-in-the-calendar (solo estratto di ricerca; fetch non risolto)
- https://helpmanager.playtomic.com/hc/en-gb/articles/20535294627985-Schedule-Settings (solo risultato di ricerca)
- https://proxify.io/talents/juraj-ux-ui-design (risultato di ricerca)
- https://www.matchi.se/
- https://apps.apple.com/app/matchi/id720782039
- https://courtreserve.com/
- https://vimeo.com/1200747318 (risultato di ricerca: color coding CourtReserve)
- https://clubspark.lta.org.uk/WheathampsteadLawnTennisClub/Booking/HowtoBook
- https://clubspark.lta.org.uk/KirbyTennisClub/Booking
- https://clubspark.lta.org.uk/CocksandHensTennisCambridge/Playing/BookingCourts (risultato di ricerca)
- https://clubspark.lta.org.uk/ColdenCommonTennisClub/Booking/BookingHelp (risultato di ricerca)
- https://support.skedda.com/en/articles/105724-using-the-scheduler-as-a-regular-user
- https://support.skedda.com/en/articles/947342-booking-coloring
- https://www.skedda.com/home/booking-calendar (risultato di ricerca; fetch 403)
- https://www.aranzulla.it/app-per-prenotare-campi-padel-1389205.html
- https://www.solutelabs.com/blog/sportclubby-app
- https://www.eu-startups.com/2020/07/madrid-based-playtomic-acquires-milan-based-prenotauncampo-to-become-europes-leading-racket-sports-app/ (risultato di ricerca)
- https://www.i3p.it/en/news/playtomic-leader-sports-marketplace-europe-acquires-italian-startup-sportclubby (risultato di ricerca)
- https://apps.apple.com/it/app/prenota-il-tuo-campo/id1619533130
- https://anolla.com/it/software-di-gestione-impianti-sportivi
- https://apps.apple.com/app/id1531797995 (Padel Mates, risultato di ricerca)
- https://cal.com/blog/enhanced-flexibility-take-advantage-of-cal-com-s-multiple-booking-layouts
- https://cal.com/blog/a-complete-walkthrough-of-cal-com-s-booking-dashboard-its-key-features
- https://cal.com/docs/platform/atoms/booker
- https://cal.com/help/bookings/past-bookings-filtering (risultato di ricerca)
- https://help.calendly.com/hc/en-us/articles/28926585452951 (risultato di ricerca)
- https://community.calendly.com/how-do-i-40/my-invitees-cannot-cancel-or-reprogram-events-from-the-link-they-get-on-booking-confirmation-185 (risultato di ricerca)
- https://support.multiverse.io/en/articles/418490-how-to-reschedule-or-cancel-a-session-booked-via-calendly (risultato di ricerca)
- https://www.mindbodyonline.com/en-gb/business/education/blog/tips-reduce-no-shows-and-late-cancels-your-fitness-business-pt (risultato di ricerca)
- https://ykracquetclub.com/fitness-and-yoga/cancellation-policy-sign-policy (risultato di ricerca)
- https://www.capterra.com/p/249675/ClassPass//reviews/ e https://www.getapp.com.au/software/2055881/classpass (risultati di ricerca, recensioni)
- https://www.fresha.com/help-center/knowledge-base/calendar/30-mark-appointments-as-no-shows
- https://www.fresha.com/help-center/knowledge-base/calendar/286-cancel-appointments (risultato di ricerca)
- https://www.fresha.com/blog/how-to-protect-your-business-against-no-shows-and-late-cancellations (risultato di ricerca)
- https://www.ezfacility.com/
- https://www.teamup.com/
- https://www.capterra.com/p/211620/Bookteq/ (risultato di ricerca)

Design system e riferimenti admin:
- https://linear.app/now/how-we-redesigned-the-linear-ui
- https://stripe.com/blog/accessible-color-systems
- https://vercel.com/geist/introduction

UX generica:
- https://baymard.com/checkout-usability/benchmark/step-type/time-booking-interface/ (risultato di ricerca)
- https://baymard.com/guidelines/1955-fulfillment-time-slot-availability (risultato di ricerca)
- https://www.uxpin.com/studio/blog/date-picker-ui-design/ (risultato di ricerca)
- https://app.uxcel.com/courses/ui-components-n-patterns/common-ui-components-ii-795/pickers-6600 (risultato di ricerca)

URL tentati senza successo (nessun contenuto usato): playerhelp.playtomic.com FAQ e How-to-make-a-reservation (403), help.playtomic.com (dominio non risolto), helpmanager.playtomic.com How-to-reserve (403), padelspeed.com (429), vercel.com/try/new-dashboard (pagina di login).
