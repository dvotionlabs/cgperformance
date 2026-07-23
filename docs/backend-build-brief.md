# cg performance — Backend Build Brief

Handoff spec for Claude Code. This covers the backend for the "cg performance"
30-minute PT landing page (Liverpool Street, UNTIL venue) — membership signup,
Direct Debit billing, and session booking.

## Context

- Landing page already exists as a static HTML file: `index.html`.
- Pricing model: flat **£50 per session**, no discount tiers. Clients pick a
  weekly frequency (1x–4x/week) and pay **monthly by Direct Debit**, calculated
  on **4 weeks/month**:
  - 1x/week → £200/mo
  - 2x/week → £400/mo
  - 3x/week → £600/mo
  - 4x/week → £800/mo
- Venue: UNTIL Liverpool Street, open 7am–7pm daily. (A second venue, UNTIL
  Marylebone, may be added later — model this as a first-class `venues` table
  now so it's not a rewrite.)
- Owner/coach: Cg, trading as "cg performance" (related to but distinct from
  Cg's other business, Dvotion — keep these as separate systems, don't conflate
  data models).
- Known existing stack preference (used on Dvotion): **Vercel + Supabase +
  Stripe**, with Microsoft Graph API used for calendar sync there. Default to
  the same stack here unless there's a good reason not to, for consistency
  across Cg's projects.

## Payment provider: Stripe, UK Bacs Direct Debit

Use **Stripe Billing** with **Bacs Direct Debit** as the payment method (not
GoCardless) — Cg already has a Stripe account/keys from the Dvotion project.

Important UK Direct Debit compliance notes for whoever implements this:
- Bacs requires a signed mandate and a **minimum advance notice period**
  (Stripe defaults to 3 working days) before the first debit — the first
  charge cannot happen instantly like a card payment. Surface this in the
  signup flow copy ("your first payment will be collected on ~[date]").
- Use Stripe Checkout in `mode: 'subscription'` with
  `payment_method_types: ['bacs_debit']` to collect the mandate.
- Handle `invoice.paid`, `invoice.payment_failed`, and
  `customer.subscription.updated/deleted` webhooks — Bacs payments can fail
  or get reported late (takes longer to clear than card payments).

## Data model (Postgres / Supabase)

See `supabase/schema.sql` for the full DDL. Summary:

- **venues** — UNTIL Liverpool Street, UNTIL Marylebone (future), with
  opening hours.
- **plans** — the 4 frequency tiers (1x–4x/week), each with
  `sessions_per_week`, `price_per_session` (always 50), and a computed/derived
  `monthly_price`.
- **clients** — name, email, phone, Stripe customer ID.
- **subscriptions** — links a client to a plan + venue, holds
  `stripe_subscription_id`, status, start date, next billing date.
- **session_bookings** — individual 30-minute slots booked against a
  subscription's weekly allowance; status: booked / completed / cancelled /
  no_show.
- **payments** — one row per Stripe invoice, for reconciliation and a simple
  admin view of who's paid.
- **webhook_events** — raw Stripe event log, keyed by `stripe_event_id`, for
  idempotency (Stripe can and will redeliver webhooks).

## Core flows (build in this order)

1. **Plan signup / Checkout**
   - Client picks a frequency on the landing page → redirected to a signup
     page collecting name/email/phone → creates a Stripe Customer → Stripe
     Checkout Session (`mode: subscription`, `bacs_debit`) for the matching
     monthly price.
   - On success, Stripe webhook (`checkout.session.completed` or
     `customer.subscription.created`) creates the `clients` + `subscriptions`
     rows. Don't create these rows purely off the client-side redirect —
     always confirm via webhook.

2. **Billing**
   - Stripe handles the recurring monthly charge automatically once the
     subscription exists. Webhook handlers just need to log `payments` rows
     and update `subscriptions.status` on `invoice.payment_failed` (pause
     future bookings if a payment fails and isn't resolved within a grace
     period — flag this as a config value, don't hardcode).

3. **Booking**
   - Each subscription has a weekly allowance (`plan.sessions_per_week`).
     Clients book individual 30-minute slots within venue opening hours
     (7am–7pm) against that allowance for the current billing period.
   - Keep this simple for v1: a basic slot picker backed by
     `session_bookings`, checking for double-booking conflicts on the coach's
     calendar. Don't build a generic multi-coach scheduling engine — there's
     one coach right now.
   - Optional v2: sync bookings to a real calendar (Outlook, via Microsoft
     Graph, as already used on Dvotion) so Cg doesn't have to check two
     systems.

4. **Admin view**
   - A simple internal page (auth-gated, just for Cg) listing: active
     subscriptions, upcoming bookings, failed payments needing attention.
     Doesn't need to be fancy for v1 — a table is fine.

## Non-functional requirements

- **Auth**: Supabase Auth is fine for both client login (to book sessions)
  and a gated admin route for Cg.
- **GDPR**: this stores UK personal data (name, email, phone, payment
  metadata). Don't store raw card/bank details — Stripe handles that; only
  store Stripe IDs.
- **Webhook security**: verify Stripe webhook signatures
  (`stripe.webhooks.constructEvent`) — don't trust unsigned payloads.
- **Idempotency**: use the `webhook_events` table to make sure a redelivered
  Stripe event doesn't double-create bookings/payments.

## Suggested repo structure (Next.js on Vercel)

```
/app
  /(marketing)/page.tsx        — landing page (port the existing HTML/CSS)
  /signup/page.tsx             — plan selection + client details form
  /api/checkout/route.ts       — creates Stripe Checkout Session
  /api/webhooks/stripe/route.ts — handles Stripe events
  /account/page.tsx            — client portal: book sessions, see plan
  /admin/page.tsx               — internal view for Cg
/lib
  stripe.ts
  supabase.ts
/supabase
  schema.sql                    — see companion file
```

## Environment variables

See `.env.example` — needs Stripe secret/publishable keys, webhook signing
secret, Supabase URL + service role key, and a `NEXT_PUBLIC_APP_URL`.

## Explicitly out of scope for v1

- Multi-coach scheduling
- Marylebone venue (model the table, don't build the flow yet)
- Pausing/freezing a subscription for holidays (flag as a likely v1.1 ask)
- SMS reminders (email confirmation is enough for v1)
