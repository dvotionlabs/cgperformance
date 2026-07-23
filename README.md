# cg performance

Landing page, membership signup, Direct Debit billing, and session booking
for Chris Gkoufas / CG Performance (UNTIL Liverpool Street).

Stack: Next.js (App Router) on Vercel, Supabase (Postgres + Auth), Stripe
Billing with UK Bacs Direct Debit. See `docs/backend-build-brief.md` for the
full spec this was built from.

## Setup

1. **Supabase**
   - Create a project, then run `supabase/schema.sql` in the SQL editor (or
     via the CLI) to create the tables and seed the venue/plans.
   - Enable email OTP / magic-link auth (Authentication → Providers → Email).

2. **Stripe**
   - Enable Bacs Direct Debit as a payment method on the account.
   - Add a webhook endpoint pointing at `/api/webhooks/stripe` listening for
     `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.paid`, and
     `invoice.payment_failed`.

3. **Environment**
   - Copy `.env.example` to `.env.local` and fill in the Stripe/Supabase keys,
     `NEXT_PUBLIC_APP_URL`, and `ADMIN_EMAIL` (the address Cg signs in with to
     reach `/admin`).

4. **Run**
   ```
   npm install
   npm run dev
   ```

   For local Stripe webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   and put the printed signing secret in `STRIPE_WEBHOOK_SECRET`.

## Structure

```
/app
  /(marketing)/page.tsx        — landing page
  /signup/page.tsx             — plan selection + client details form
  /api/checkout/route.ts       — creates the Stripe Checkout Session
  /api/webhooks/stripe/route.ts — handles Stripe events
  /api/slots/route.ts          — available booking slots for a day
  /api/bookings/route.ts       — list / create bookings
  /api/bookings/[id]/route.ts  — cancel a booking
  /account/page.tsx            — client portal: book sessions, see plan
  /admin/page.tsx               — internal view for Cg (gated by middleware.ts)
/lib
  stripe.ts, supabase/, plans.ts, booking.ts, auth.ts, config.ts
/supabase
  schema.sql
```

## Notes

- Pricing (`lib/plans.ts`) mirrors the `plans` table: flat £50/session,
  1x–4x/week, billed monthly on a 4-week month.
- Only UNTIL Liverpool Street is wired up for booking. UNTIL Marylebone
  exists as a `venues` row for later, per the brief.
- `clients` rows are only created from the Stripe webhook, never from the
  client-side checkout redirect — see `docs/backend-build-brief.md`.
- A subscription that goes `past_due` keeps booking access for
  `PAYMENT_FAILURE_GRACE_PERIOD_DAYS` (env var, default 7) before new
  bookings are blocked in `/api/bookings`.
