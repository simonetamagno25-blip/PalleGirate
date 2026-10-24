---
version: 1
slug: "src-app-app-layout-tsx"
primary_target: "src/app/(app)/layout.tsx"
related_targets: ["src/app/(auth)/layout.tsx"]
---

# Surface brief: Palle Girate app (member + admin, whole authenticated app)

Scope: every authenticated screen (member home, calendar, booking wizard, my bookings, notifications, profile; admin dashboard, bookings, payments, members, settings) plus login/activation. Mode: Operate. Build path: code-led.

Audience and job: club members of every age book a court in under a minute on their phone; office staff record cash payments and manage members at a desk.

Constraints: standard web controls only (buttons, tabs, inputs, selects, tables); all text from messages/it.json + en.json; WCAG 2.2 AA, 44px targets, 16px body, state never by color alone; light and dark themes both first-class; no startup look (no gradients, glass, glow).

## Direction contract

THESIS: The club's courts read like a station departures board: every court is a row, every free time is the next departure, and your game lights up in amber. Refuses the category default of white cards with pastel time chips.

OWN-WORLD: Board black (#0e0f0f flap faces, #1a1b1b frame, #2a2c2b seams) carrying off-white flap type (#f3f3ee); one amber lamp (#f5a524) reserved for "yours", the primary action and live state; dim red (#ef5b52 on black, #b42318 on light) for cancelled/blocked; paid green lamp (#3fb26b / #15803d). Light theme: true neutral ground (#f3f3f1, chroma 0) with the board panels staying black; dark theme: everything on board black. Type: Barlow Condensed 600–800 uppercase for numerals, times, court names, headings and nav; Barlow 400–600 for body and controls. Radius 6px (flaps 4px), hairline seams instead of shadows inside the board.

STORY: A member opens the app, sees their next game as a big flap-digit time with court and "modificabile fino alle 16:00", hits the amber "Prenota un campo", picks a day, reads the board of courts and free times, taps a time, confirms. The office reads the same board grammar as dense tables with status lamps.

FIRST VIEWPORT: Phone 390px. Black top bar: "PALLE GIRATE" in condensed caps left; language, theme and bell (unread count on an amber badge) right. Board panel: label "LA TUA PROSSIMA PARTITA", the time in split-flap digit tiles (~56px tall), day and court underneath, edit/cancel window line; empty state offers booking. Full-width amber "PRENOTA UN CAMPO" (60px). Day strip (7 days, today selected). "PARTENZE DI OGGI" board: one row per court, next free times as tappable flap cells, your booking amber, full court reads "COMPLETO". Black bottom tab bar, amber active item.

FORM: Split-flap departures board, challenger form from the catalog (signals-instruments-split-flap-concourse), chosen by the user on the second hand; seed:0544a0f96dc721a0. Signature interaction: times are split-flap tiles that flip (staggered per character, 60ms, ease-out) when the value changes (day change, booking confirmed, edit); reduced-motion swaps to an instant crossfade. The board is a semantic table underneath.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

- Court identification beyond names (pictograms per sport) is optional; if added, one consistent authored SVG set, monochrome on the board.
