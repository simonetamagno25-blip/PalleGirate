# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the members of a small Italian sports center, of every age, from teenagers who play five-a-side football to retirees who play bocce. They open the app on their phone, often outdoors or on the way to the center, to see when a court is free and book it in a few taps, then check or change what they booked. Many are not habitual app users, so every screen must be obvious at first glance.

Secondary: the center's office staff (admins). They work at a desk or at the front counter, register cash payments after games, manage members and membership cards, fix bookings, change the rules, and read the center's statistics.

## Product Purpose

Palle Girate lets members book the center's courts by themselves within rules the server enforces, so the office no longer has to take bookings by phone. Success means a member finds a free slot and books it in under a minute without help, and the office spends minutes, not hours, on payments and members.

## Positioning

It is the center's own app, not a marketplace: members see only their club's five courts (calcio, two tennis courts, basket, bocce), with the club's own rules, cards, cash payments and strikes. Nothing else to browse, nothing to sell.

## Operating Context

- Members book 1 or 2 consecutive slots (60 min for most courts, 90 for football), from 08:00 to 23:00 on a 15-minute grid, up to 14 days ahead, at most 3 active bookings, editable or cancellable until 2 hours before.
- A member never sees who booked a court: only free, taken, or "yours".
- Payment is cash at the office after the game; the admin marks it paid, unpaid or exempt. Unpaid bookings give permanent strikes; from the second one the account is blocked and future bookings are cancelled until the debt is settled.
- Membership cards expire yearly and are renewed at the office.
- Notifications live inside the app (bell), no email, SMS or push.
- Italian first, English available; light and dark theme; installable as a PWA.

## Capabilities and Constraints

Built with Next.js App Router, Tailwind CSS 4, shadcn/ui components, next-intl, Recharts. All visible text lives in `messages/it.json` and `messages/en.json`. All time rules use Europe/Rome and 24-hour times. Out of scope: online payments, recurring bookings, a shop, email/SMS/push, player counts.

## Brand Commitments

- Name: Palle Girate. Existing PWA icon: a yellow ball on deep teal (`#0f766e`, `#facc15`).
- Personality confirmed by the owner: **sporty and energetic**.
- Anti-reference confirmed by the owner: it must not look like a startup app (gradients, glass effects, generic "tech" look).

## Evidence on Hand

Seed data only (demo members and five courts). No photos, logo files beyond the icon, testimonials or real statistics; nothing of this must be invented.

## Product Principles

- Booking first: from any screen a member is one obvious step away from booking a court.
- Show availability, not data: free, taken and yours must be readable at a glance, without a legend.
- Every age can use it: large targets, plain words, few steps, no hidden gestures.
- Energy in the details, calm in the task: the club's sporty character shows in color, type and small moments, never at the cost of clarity.
- The office works fast: admin screens favour density and quick actions over decoration.

## Accessibility & Inclusion

Mixed-age audience including older members: WCAG 2.2 AA contrast, body text at least 16px, touch targets of at least 44px, state never conveyed by color alone, reduced-motion respected.
