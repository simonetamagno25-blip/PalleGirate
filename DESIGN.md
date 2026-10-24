---
name: Palle Girate
description: A sports center's booking app that reads like a station departures board, with one amber lamp for what is yours.
colors:
  board-frame: "#1a1b1b"
  flap-face: "#0e0f0f"
  flap-seam: "#2a2c2b"
  flap-hover: "#262828"
  flap-ink: "#f3f3ee"
  flap-ink-muted: "#b9b9b0"
  lamp-amber: "#f5a524"
  amber-ink: "#a35c00"
  lamp-green: "#3fb26b"
  lamp-green-deep: "#15803d"
  lamp-red: "#ef5b52"
  lamp-red-deep: "#b42318"
  page-ground: "#f3f3f1"
  card: "#ffffff"
  ink: "#141414"
  muted-ink: "#55554f"
  muted-fill: "#e9e9e5"
  hairline: "#d9d9d4"
  input-edge: "#8a8a83"
  graphite: "#66665f"
  dark-card: "#151616"
  dark-input-edge: "#6b6b65"
  dark-muted-ink: "#b0b0a8"
typography:
  flap-numeral:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  page-title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "normal"
  board-title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.04em"
  court-name:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.03em"
  column-header:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.3rem"
    letterSpacing: "0.06em"
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
    letterSpacing: "normal"
  label:
    fontFamily: "Barlow, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.3rem"
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "6px"
  lamp: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  tap: "44px"
components:
  button-primary:
    backgroundColor: "{colors.lamp-amber}"
    textColor: "#111111"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "#dd9420"
  button-primary-cta:
    backgroundColor: "{colors.lamp-amber}"
    textColor: "#111111"
    typography: "{typography.board-title}"
    rounded: "{rounded.md}"
    height: "60px"
    padding: "0 24px"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-board:
    backgroundColor: "{colors.flap-face}"
    textColor: "{colors.flap-ink}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-board-hover:
    backgroundColor: "{colors.flap-seam}"
  board:
    backgroundColor: "{colors.board-frame}"
    textColor: "{colors.flap-ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  flap-cell:
    backgroundColor: "{colors.flap-face}"
    textColor: "{colors.flap-ink}"
    typography: "{typography.board-title}"
    rounded: "{rounded.sm}"
    height: "44px"
    width: "64px"
    padding: "0 10px"
  flap-cell-hover:
    backgroundColor: "{colors.flap-hover}"
    textColor: "{colors.lamp-amber}"
  flap-cell-mine:
    backgroundColor: "{colors.lamp-amber}"
    textColor: "#111111"
  flap-cell-full:
    backgroundColor: "{colors.flap-face}"
    textColor: "{colors.lamp-red}"
  day-tile:
    backgroundColor: "{colors.flap-face}"
    textColor: "{colors.flap-ink}"
    rounded: "{rounded.sm}"
    height: "64px"
    width: "56px"
  day-tile-selected:
    textColor: "{colors.lamp-amber}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 12px"
  nav-item-active:
    backgroundColor: "{colors.board-frame}"
    textColor: "{colors.flap-ink}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 12px"
---

# Design System: Palle Girate

## Overview

**Creative North Star: "The Departures Board"**

Every court is a row, every free time is the next departure, and your own game is the only thing lit amber. The app is a quiet neutral shell (office-grey in light, board-black in dark) around black board panels that stay black in both themes. Inside a panel, type is condensed and tabular, rows are separated by 1px seams rather than shadows, and times are split-flap tiles that flip when the value changes. Outside a panel, it is ordinary web UI: Barlow, sentence case, standard controls at 44px.

The mood is sporty and energetic in the details (the flap, the lamp, condensed numerals) and calm in the task: booking never competes with decoration. Members see only free, taken and yours, readable without a legend. The office reads the same grammar as dense tables with status lamps. The system refuses the startup look: no gradients, glass, glow or soft halos, and no white cards with pastel time chips.

**Key Characteristics:**
- Black board panels (`{colors.board-frame}`) in both themes; neutral true-grey ground around them (chroma 0).
- One lamp: amber means yours, the primary action, or live. It is never decoration and never a data series for counts.
- State is a word plus a mark (check, dash, dashed outline, lamp dot), never color alone.
- Hairline seams (`{colors.flap-seam}`) and 1px rings instead of shadows; floating layers alone carry a soft shadow.
- Two faces: Barlow Condensed for the board voice, Barlow for everything readable.

## Colors

A true-neutral grey ground, a black board family, and three lamps (amber, green, red) that each mean exactly one thing.

### Primary
- **Departure Lamp Amber** (`lamp-amber`, #f5a524): the primary button fill (ink #111111 on it), your bookings and selected cells on a board, the active nav icon, selected day outline, selection highlight, native accent. Reserved for "yours", the primary action and live state.
- **Lamp Ink Amber** (`amber-ink`, #a35c00 in light; #f5a524 in dark): amber as text, link, focus ring, caret and chart mark on light grounds, where plain amber is only 1.8:1. 4.62:1 on the page ground.

### Secondary
- **Paid Green** (`lamp-green` #3fb26b on black and in dark; `lamp-green-deep` #15803d on light): paid state lamp only.
- **Blocked Red** (`lamp-red` #ef5b52 on black and in dark; `lamp-red-deep` #b42318 on light): cancelled, unpaid, full ("COMPLETO"), destructive actions, errors.
- There is no blue lamp. Neutral state (confirmed, exempt, locked) uses `muted-ink` / `flap-ink-muted`.

### Neutral
- **Board Frame** (`board-frame`, #1a1b1b): the board panel, top bar, bottom tab bar, active nav row; also the dark-theme popover.
- **Flap Face** (`flap-face`, #0e0f0f): a single tile, cell or date tile, darker than its frame; also the dark-theme page ground.
- **Flap Seam** (`flap-seam`, #2a2c2b): hairlines inside a board, board button hover, dark-theme borders. On dark ground the panel ring steps up to #3a3c3b.
- **Flap Ink / Muted** (`flap-ink` #f3f3ee, `flap-ink-muted` #b9b9b0): text on board black.
- **Page Ground** (`page-ground`, #f3f3f1) with **Card** (`card`, #ffffff) and **Muted Fill** (`muted-fill`, #e9e9e5); dark theme steps ground #0e0f0f, card `dark-card` #151616, panel #1a1b1b.
- **Ink** (`ink`, #141414) and **Muted Ink** (`muted-ink`, #55554f; dark `dark-muted-ink` #b0b0a8): text.
- **Hairline** (`hairline`, #d9d9d4): borders and dividers on light. **Input Edge** (`input-edge`, #8a8a83; dark `dark-input-edge` #6b6b65): input outlines, 3:1 against the card.
- **Graphite** (`graphite`, #66665f; #c9c9c0 in dark): neutral chart series for counts that are nobody's state. A second series is #8c8c85.
- **Heatmap steps**: the flap-ink mixed into the flap face at 0 / 20 / 40 / 66 / 90 percent, with the count written in each cell; amber stays out of it.

### Named Rules
**The One Lamp Rule.** Amber marks yours, the primary action, or live state and nothing else. Disabled primary is a neutral fill with muted ink, never dim amber.
**The Lamp Ink Rule.** On light grounds amber text, links, rings and chart marks use `amber-ink`; the bright amber is for fills with #111111 ink and for black surfaces.
**The Board Stays Black Rule.** Board panels are #1a1b1b with #0e0f0f faces in both themes; only the shell around them changes.

## Typography

**Display Font:** Barlow Condensed (600, 700, 800; sans-serif fallback), the board voice.
**Body Font:** Barlow (400, 500, 600; sans-serif fallback) for body, controls and labels.

**Character:** Condensed railway-signage numerals against a plain, friendly grotesque. Numbers are tabular everywhere (`font-variant-numeric: tabular-nums` on the root) so times line up.

### Hierarchy
- **Flap numeral** (700, 44px in a 56px tile; 36px/40px tile; 22px/28px tile, line-height 1): times in split-flap tiles.
- **Page title** (700, 28px, md 36px, sentence case): the one h1 per page, in Barlow Condensed.
- **Board title** (700, 22px, +0.04em, uppercase): board headers, the app name in the top bar (800), the primary CTA (24px, 20px on lists).
- **Court name** (700, 18px, +0.03em, uppercase; 24px for the next game): row headers on boards and booking cards.
- **Column header** (600, 14px, +0.06em, uppercase, muted): table headers on boards and office tables.
- **Body** (400, 16px/24px): all running text; never below 16px for content, 13-14px only for secondary labels.
- **Label** (500, 14px/1.3rem; buttons 16px at 500, primary 600): controls, captions, "Tua"/"Yours" tag.
- Product scale steps: 13 / 14 / 16 / 18 / 22 / 28 / 36 / 44 / 56.

### Named Rules
**The Board Voice Rule.** Uppercase condensed lives on the board: board titles, court names, column headers, flap text and the primary booking button. Page titles, nav, card headings, buttons and body stay sentence case. No eyebrows or kickers.

## Layout

Phone first at 390px, one column, 16px gutters, content max 72rem (6xl) centered. From md the shell becomes a 15rem sidebar plus content, with 32px gutters. A black 56px top bar (logo, language, theme, bell) is sticky at every width; on phone a 72px black bottom tab bar carries the four member destinations (amber when active, labels at 13px on one line, short form for "Le mie prenotazioni").

Home is two columns from lg (5fr next-game board and CTA, 7fr day strip and departures), stacked on phone with the 60px amber CTA directly under the next-game board. Rhythm is a 4px base: 8px between cells in a strip, 6px between flap cells, 16px board and card padding (20px from md), 24px column gap, 32px between sections. Touch targets are 44px minimum (cells 44px, nav rows 44px, buttons 44px, CTA 56-60px). Times that overflow a phone row scroll sideways inside their row, snapping, with the cut-off cell showing there is more. Wide boards keep the court column sticky. Login and activation use one narrow (max 24rem) centered column under the black logo bar.

## Elevation & Depth

Flat and tonal. Depth is a lighter step (page, card, board frame, flap face) plus a 1px ring or seam. Cards use `ring-1` in hairline; boards use `ring-1` in the board edge; rows inside boards use 1px seams. Only floating layers (dialog, dropdown, select popover) lift, with one soft ambient shadow. Tiles and boards have no shadow, glow or inner highlight; the focus indicator is never a halo.

### Shadow Vocabulary
- **Floating layer** (`box-shadow: 0 12px 32px -12px rgb(0 0 0 / 0.35)`, plus a 1px hairline ring): dialog and dropdown menu.

### Named Rules
**The Seam Rule.** Inside a board, separation is a 1px seam. Shadows belong to things that float above the page.
**The One Focus Rule.** Focus is a 2px outline in the ring color (amber-ink on light, amber on dark and on boards) with a 2px offset (1px on text fields), everywhere.

## Shapes

Small and engineered: 6px for controls, cards and board panels; 4px for flap tiles, cells and date tiles (they should look like parts, not cards); full circles only for the 10px status lamp dot. Borders are 1px; the one dashed border is the "not available" cell. Flap tiles carry a 1px hinge seam across the middle only at 36px and 44px sizes; smaller cells never do, since the line would read as a strikethrough.

## Components

### Buttons
- **Shape:** 6px radius, 44px tall (lg 56px, dashboard CTA 60px; xs 28, sm 36).
- **Primary:** amber fill, #111111 ink, weight 600; hover mixes 10% black. Disabled is muted fill with muted ink at full opacity (flap seam fill on a board).
- **Outline:** card fill, input-edge border; hover muted fill. **Secondary / ghost:** muted fill / transparent with muted hover. **Destructive:** card fill, red border and ink, solid red on hover. **Link:** amber-ink, underlined.
- **On a board:** flap-face fill with seam border and flap ink, hover seam fill; the separated destructive action is a transparent outline that turns red on hover.
- **Active:** opacity 85%, no scale or shadow. Transitions 150ms on color only.

### Flap cells and tiles (signature)
- **Free time:** flap-face cell, 44px tall, min 64px wide, condensed 22px bold, 4px radius; a link or button; hover lifts the face to #262828 and the ink to amber.
- **Yours:** amber cell with a check icon, the time and the word "Tua"/"Yours"; selected in the wizard is amber with a check, never color alone.
- **Occupied:** a dimmed empty flap (60%) with a dash "—" (or a short label for admins); reason is spoken.
- **Not available** (past, too late, outside the window): an empty cell with a dashed 1px outline in muted ink at 50%, no glyph, no fill. It must stay distinct from "occupied".
- **Full:** "COMPLETO" in small red flap tiles.
- **Split-flap motion:** each changed character folds the old top half down then drops the new bottom half, 110ms per half, staggered 50ms per character, on first change only (the first paint never animates). Reduced motion swaps to a 120ms crossfade. The board stays a semantic table underneath.
- **Day tile:** 56 x 64px flap face, short weekday above a condensed 24px date; today reads "Oggi"; selected is amber ink with a 2px amber inset outline.

### Board panels
- Black frame, 6px radius, 16px padding (20px from md), 1px ring. Header strip: board title left, meta or link right, seam underneath. Tables use court name as row header, hairline seam between rows, 56px row height. Links on a board are amber, underlined.

### Cards / Containers
- **Corner:** 6px. **Background:** card. **Border:** 1px hairline ring, no shadow. **Padding:** 16px, 20px from md. Card headings are Barlow 600 at 18px, sentence case. Used for account summaries, forms and office content, never for the booking hero.

### Inputs / Fields
- 44px tall, 6px radius, transparent fill, input-edge border (3:1), 16px text. Focus: border shifts to the ring color plus the 2px outline at 1px offset. Invalid: red border. Disabled: reduced opacity.

### Navigation
- **Side nav (md+):** 44px rows, 6px radius, 16px Barlow 500; active is a board-frame fill (seam fill in dark) with flap ink and an amber icon, never a side stripe; inactive hover is the accent fill. Admin group sits under a 14px muted heading.
- **Bottom tab bar (phone):** black board surface, amber icon and label when active (heavier stroke), muted ink otherwise.

### Status lamps
- A 10px dot plus the state in words: to register amber, paid green, unpaid or cancelled red, confirmed and exempt neutral. The text carries the meaning; the dot reinforces it.

### Office tables
- The board's grammar in daylight: card panel with hairline ring, 44px header row in condensed uppercase muted type, hairline row dividers, tabular numbers, state as lamps. On phone the same rows become a stacked list.

### Charts
- Counts that are nobody's state use graphite; green and red only where they mean paid and unpaid. The busiest-hours heatmap is a board with off-white steps and the count written in each cell.

## Do's and Don'ts

### Do:
- **Do** keep board panels #1a1b1b with #0e0f0f faces and #2a2c2b seams in both themes.
- **Do** use amber only for yours, the primary action and live state, and `amber-ink` (#a35c00) for amber text, links and focus on light grounds.
- **Do** pair every state with a word or mark: check for yours, dash for occupied, dashed empty cell for not available, dot plus text for payment.
- **Do** keep 44px targets, 16px body and 2px amber focus outlines with a 2px offset.
- **Do** flip times as split-flap characters when the value changes, and honor reduced motion with the 120ms crossfade.
- **Do** keep condensed uppercase to the board (titles, court names, column headers, flap text, the booking CTA) and sentence case elsewhere.

### Don't:
- **Don't** use gradients, glass, glow, soft focus halos or startup-style decoration.
- **Don't** add a blue lamp or color a neutral count series amber, green or red.
- **Don't** show "not available" as a dash; the dash means occupied.
- **Don't** put a hinge seam on 28px cells or legend samples (it reads as cancelled).
- **Don't** replace the board with white cards and pastel time chips, and don't reveal who booked a court to a member.
- **Don't** add shadows to boards, cards or tiles; shadows are for floating layers only.
- **Don't** use dim amber for disabled primary buttons.
