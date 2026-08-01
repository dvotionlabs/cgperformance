# Stripe setup

Everything needed to take the CG Performance website from an empty Stripe
account to working Direct Debits, one time payments and private existing client
discounts.

Work through this in **test mode** first. There is a toggle at the top of the
Stripe Dashboard. Test mode has its own products, prices, links and keys, so
nothing done in test mode affects live customers.

> Never paste a secret key or a live promotion code into this file, into
> `services.js`, or into any file that is committed to GitHub.

---

## Contents

1. [Account basics](#1-account-basics)
2. [Enable Bacs Direct Debit](#2-enable-bacs-direct-debit)
3. [Branding, Privacy and Terms URLs](#3-branding-privacy-and-terms-urls)
4. [Create the recurring products and prices](#4-create-the-recurring-products-and-prices)
5. [Create the one time products and prices](#5-create-the-one-time-products-and-prices)
6. [One time services](#6-one-time-services)
7. [Add the environment variables to Vercel](#7-add-the-environment-variables-to-vercel)
8. [How the Checkout function works](#8-how-the-checkout-function-works)
9. [Existing client coupons and promotion codes](#9-existing-client-coupons-and-promotion-codes)
10. [Testing](#10-testing)
11. [Email notifications](#11-email-notifications)
12. [Going live](#12-going-live)

---

## 1. Account basics

1. Sign in at <https://dashboard.stripe.com>.
2. Complete the business profile for CG Performance Limited: legal name,
   company number, registered address, business category and bank account for
   payouts.
3. Set the account country to the United Kingdom and the default currency
   to GBP.
4. Set the statement descriptor to something a client will recognise on a bank
   statement, for example `CG PERFORMANCE`. Bacs shows a shortened form of this
   on the payer's statement.

---

## 2. Enable Bacs Direct Debit

1. Go to **Settings, Payments, Payment methods**.
2. Find **Bacs Direct Debit** and turn it on.
3. Stripe will ask for details about how you will collect mandates. Choose the
   option for collecting through Stripe's hosted pages, since this site uses
   Stripe Checkout and Stripe hosted mandate collection.
4. Approval is not always instant. Bacs can take a few working days to be
   enabled on a new account. Do this early.

Things to know about Bacs before testing:

- Bacs is not an instant payment method. A first payment typically takes several
  working days to clear, and the mandate itself needs a short set up period.
- A submitted instruction is not the same as a completed payment. The website
  never tells a client that payment has been received, only that their
  instruction has been submitted.
- Bacs is available for GBP payments from UK bank accounts only.

---

## 3. Branding, Privacy and Terms URLs

Checkout is configured to require acceptance of the Terms of Service. Stripe
takes the link for that from your public business information, so this must be
filled in or Checkout will not open.

1. Go to **Settings, Business, Public details**.
2. Set:
   - Business name: `CG Performance`
   - Website: `https://cgperformance.fit`
   - Privacy policy: `https://cgperformance.fit/privacy`
   - Terms of service: `https://cgperformance.fit/terms`
   - Support email: the CG Performance business email address
3. Go to **Settings, Business, Branding** and upload the CG logo, set the icon
   and choose a restrained accent colour that matches the website, for example
   near black `#16150F`.

While testing on a Vercel preview URL, you can point these at the preview
domain, but remember to set them back to `cgperformance.fit` before launch.

---

## 4. Create the recurring products and prices

Go to **Product catalogue, Add product** and create each of these. For every one:

- Currency: **GBP**
- Pricing model: **Standard pricing**
- Billing period: **Monthly**
- Type: **Recurring**

| Product name                                        | Monthly price | Environment variable             |
| --------------------------------------------------- | ------------- | -------------------------------- |
| CG Performance \| 4 In Person Sessions Monthly       | £500.00       | `STRIPE_PRICE_PT_4_MONTHLY`      |
| CG Performance \| 8 In Person Sessions Monthly       | £960.00       | `STRIPE_PRICE_PT_8_MONTHLY`      |
| CG Performance \| 12 In Person Sessions Monthly      | £1,380.00     | `STRIPE_PRICE_PT_12_MONTHLY`     |
| CG Performance \| Online Coaching                    | £350.00       | `STRIPE_PRICE_ONLINE_MONTHLY`    |
| CG Performance \| 4 Virtual Coaching Sessions Monthly | £400.00      | `STRIPE_PRICE_VIRTUAL_4_MONTHLY` |
| CG Performance \| 8 Virtual Coaching Sessions Monthly | £800.00      | `STRIPE_PRICE_VIRTUAL_8_MONTHLY` |
| CG Performance \| 12 Virtual Coaching Sessions Monthly | £1,200.00   | `STRIPE_PRICE_VIRTUAL_12_MONTHLY` |

Useful product descriptions, which appear on the Checkout page and on invoices:

- 4 In Person: `Four 60 minute in person sessions per calendar month at UNTIL Liverpool Street or UNTIL Marylebone. Unused sessions expire at the end of the calendar month. One month of written notice is required to cancel.`
- 8 In Person: as above with eight sessions.
- 12 In Person: as above with twelve sessions.
- Online Coaching: `Individual monthly training programme with one monthly review call. One month of written notice is required to cancel.`
- Virtual Coaching: `Live one to one coaching by video call, 60 minutes per session. Unused sessions expire at the end of the calendar month. One month of written notice is required to cancel.`

Do **not** enable free trials, customer chosen pricing or adjustable quantities
on any of these.

After saving each product, open it and copy the **Price ID**. It looks like
`price_1AbCdEf...`. That is the value for the environment variable, not the
product ID (`prod_...`).

---

## 5. Create the one time products and prices

Same place, but with type **One off**.

| Product name                                              | Price     | Environment variable             |
| --------------------------------------------------------- | --------- | -------------------------------- |
| CG Performance \| 3 Session In Person Pack                 | £390.00   | `STRIPE_PRICE_PT_3_PACK`         |
| CG Performance \| 10 Session In Person Pack                | £1,250.00 | `STRIPE_PRICE_PT_10_PACK`        |
| CG Performance \| Movement Strategy Analysis Consultation  | £150.00   | `STRIPE_PRICE_MOVEMENT_ANALYSIS` |

Suggested descriptions:

- 3 Session Pack: `Three 60 minute in person sessions. Valid for one month from the date of purchase.`
- 10 Session Pack: `Ten 60 minute in person sessions. Valid for three months from the date of purchase.`
- Movement Strategy Analysis: `A 60 minute movement assessment and coaching consultation. Not a medical diagnosis or physiotherapy assessment.`

---

## 6. One time services

There are **no Stripe Payment Links to create**. The session packs and the
consultation are bought through the same Checkout function as the monthly
services, so everything on the website behaves the same way and there is only
one place to configure.

What this means in practice:

- Copy the Price ID of each one time product, exactly as for the monthly ones,
  and add it to Vercel using the variable names in the table above.
- Payment methods for one time purchases are whatever you have enabled under
  **Settings, Payments, Payment methods**. Card is on by default. Turning on
  Apple Pay and Google Pay there makes them appear at Checkout with no change
  to the website.
- Bacs is not used for one time purchases. It takes several working days to
  clear, which is the wrong fit for a pack somebody wants to book against this
  week.
- Promotion codes are enabled for the 10 Session Pack and switched off for the
  3 Session Pack and the consultation. This is set in the function, not in the
  Dashboard.

## 7. Add the environment variables to Vercel

In Vercel, open the project, then **Settings, Environment Variables**. Add:

| Name                               | Value                                      |
| ---------------------------------- | ------------------------------------------ |
| `STRIPE_SECRET_KEY`                | `sk_test_...` while testing, `sk_live_...` at launch |
| `STRIPE_PRICE_PT_4_MONTHLY`        | `price_...`                                |
| `STRIPE_PRICE_PT_8_MONTHLY`        | `price_...`                                |
| `STRIPE_PRICE_PT_12_MONTHLY`       | `price_...`                                |
| `STRIPE_PRICE_ONLINE_MONTHLY`      | `price_...`                                |
| `STRIPE_PRICE_VIRTUAL_4_MONTHLY`   | `price_...`                                |
| `STRIPE_PRICE_VIRTUAL_8_MONTHLY`   | `price_...`                                |
| `STRIPE_PRICE_VIRTUAL_12_MONTHLY`  | `price_...`                                |
| `STRIPE_PRICE_PT_3_PACK`           | `price_...`                                |
| `STRIPE_PRICE_PT_10_PACK`          | `price_...`                                |
| `STRIPE_PRICE_MOVEMENT_ANALYSIS`   | `price_...`                                |
| `SITE_URL`                         | `https://cgperformance.fit`, or the preview URL while testing |

Use the test Price IDs in the Preview and Development environments, and the live
Price IDs in Production. Redeploy after changing any variable, since functions
read them at runtime from the deployment's configuration.

If a Price ID is missing, the matching button does not break. The function
returns a clear message and the visitor is pointed at the enquiry form.

---

## 8. How the Checkout function works

`api/create-checkout.js` is deliberately narrow.

- It accepts **POST only** and rejects any request that did not come from the
  CG Performance site.
- It accepts **one field**, `serviceId`, and only the ten values in its own
  server side allowlist.
- It maps that ID to a Price ID held in an environment variable. The browser
  never sees, sends or influences a Price ID, an amount, a discount or a date.
- Monthly services are created in `subscription` mode, restricted to
  `bacs_debit`. Packs and the consultation are created in `payment` mode using
  the payment methods enabled on the account. Either way there is one line item
  at quantity 1 with quantity adjustment off.
- It passes the terms of that specific service to Stripe, so they appear on the
  Checkout page next to the terms of service acceptance box. The website itself
  does not restate them.
- It collects name and billing address, email and telephone number, and requires
  acceptance of the Terms of Service.
- It sets promotion codes on or off per service, as in the table below.
- It returns only the Stripe hosted Checkout URL.

Promotion code entry:

| Service ID                | Promotion codes |
| ------------------------- | --------------- |
| `pt-4-monthly`            | Enabled         |
| `pt-8-monthly`            | Enabled         |
| `pt-12-monthly`           | Enabled         |
| `online-coaching-monthly` | Disabled        |
| `virtual-4-monthly`       | Disabled        |
| `virtual-8-monthly`       | Disabled        |
| `virtual-12-monthly`      | Disabled        |
| `pt-3-pack`               | Disabled        |
| `pt-10-pack`              | Enabled         |
| `movement-strategy-analysis` | Disabled     |

### Billing on the first of the month

The rule is that the regular monthly billing date is the first. The function
works out the current date in the **Europe/London** timezone and then:

- **If today is the first**, the subscription starts immediately, so every
  renewal falls on the first from then on.
- **On any other day**, the subscription is created with a billing cycle anchor
  on day 1 of the month and `proration_behavior` set to `none`. Nothing is
  charged before the first full cycle, and no prorated amount is taken.

No calendar date is hard coded anywhere. The function first uses Stripe's
`billing_cycle_anchor_config` with `day_of_month: 1`. If the Stripe account is
pinned to an API version that predates that parameter, it automatically retries
using an explicit `billing_cycle_anchor` timestamp for the next first of the
month, which produces the same result.

Because the period before the first is free of charge but is **not** a trial,
the website states plainly that no sessions are included before the first
monthly billing cycle, and that interim sessions are arranged and charged
separately.

---

## 9. Existing client coupons and promotion codes

Existing client pricing never appears on the website. It is delivered entirely
through private Stripe promotion codes.

### 9.1 Internal pricing table

| Service         | Standard price   | Existing client discount | Existing client price |
| --------------- | ---------------: | -----------------------: | --------------------: |
| DD4             | £500 per month   | £100 per month           | £400 per month        |
| DD8             | £960 per month   | £200 per month           | £760 per month        |
| DD12            | £1,380 per month | £300 per month           | £1,080 per month      |
| 10 Session Pack | £1,250           | £250                     | £1,000                |

Per session equivalents, for reference when speaking to clients:

| Service         | Standard per session | Existing client per session |
| --------------- | -------------------: | --------------------------: |
| DD4             | £125                 | £100                        |
| DD8             | £120                 | £95                         |
| DD12            | £115                 | £90                         |
| 10 Session Pack | £125                 | £100                        |

### 9.2 Create the four coupons

Go to **Product catalogue, Coupons, Create coupon**. Create these four. Each one
is a fixed amount discount in GBP, restricted to one specific product.

| Coupon name                | Discount   | Duration | Applies to product                              |
| -------------------------- | ---------- | -------- | ----------------------------------------------- |
| Existing client DD4        | £100 off   | Forever  | CG Performance \| 4 In Person Sessions Monthly  |
| Existing client DD8        | £200 off   | Forever  | CG Performance \| 8 In Person Sessions Monthly  |
| Existing client DD12       | £300 off   | Forever  | CG Performance \| 12 In Person Sessions Monthly |
| Existing client 10 Pack    | £250 off   | Once     | CG Performance \| 10 Session In Person Pack     |

For each coupon:

1. Choose **Fixed amount discount** and enter the amount in GBP.
2. Set the duration. **Forever** for the three monthly coupons, so the discount
   is applied to every monthly invoice while that subscription stays active.
   **Once** for the 10 Session Pack, so it applies to a single purchase.
3. Open **Apply to specific products** and select the one matching product. This
   is what stops a DD4 code from working on DD8 or on anything else.
4. Do not set a maximum redemption limit on the coupon itself. The limits go on
   the individual promotion codes, so each client gets their own.

### 9.3 Create one promotion code per client

A coupon is the discount. A promotion code is the string a client types at
Checkout. Every eligible client gets their own code.

1. Open the coupon and choose **Create promotion code**.
2. Enter a code that is easy to read aloud and not guessable in bulk. Avoid
   anything that looks like a public offer. A client's initials plus a short
   random string works well.
3. Set **Maximum redemptions** to **1**.
4. Optionally set a **redemption deadline**, for example 30 days, so an unused
   code does not stay live indefinitely.
5. Where practical, restrict the code to a specific **Customer**. This is the
   strongest control, since the code then only works for that person's Stripe
   customer record. It is only possible once that customer exists in Stripe.
6. Send the code to that client privately. Do not put it in any public place, in
   this repository, in `services.js`, in the HTML, or in an environment
   variable.

Keep your own private record, outside this repository, of which code was issued
to which client and when.

### 9.4 Discount continuity, internal policy

An existing client discount stays attached while the same monthly subscription
remains continuously active. It does not automatically transfer if the client
cancels, lets the subscription lapse, changes to another monthly option, moves
to another service or starts a different subscription. A further code may be
issued manually at CG Performance's discretion.

The same applies to the discounted 10 Session Pack. A new code must be issued
manually if another discounted pack purchase is approved. The discounted pack is
valid for three months from the purchase date, exactly like the standard pack.

---

## 10. Testing

Do all of this in test mode, on a Vercel preview URL, before anything goes live.

### 10.1 Bacs Direct Debit test details

Stripe provides test sort codes and account numbers for Bacs. Take the current
values from <https://docs.stripe.com/testing> under bank debits, since Stripe
updates them from time to time. Test mode mandates and payments move through
their states automatically, without waiting for real Bacs timings.

### 10.2 Checkout, one service at a time

For each of the seven recurring services:

- [ ] The button opens Stripe Checkout with the correct service name and price.
- [ ] Bacs Direct Debit is the only payment method offered.
- [ ] Name, email, telephone and billing address are all requested.
- [ ] The Terms of Service checkbox appears and must be ticked.
- [ ] The quantity cannot be changed.
- [ ] Completing Checkout lands on `/payment-submitted`.
- [ ] Cancelling out of Checkout returns to the services section.

### 10.3 Billing on the first, and no proration

- [ ] Set up a subscription on a day that is not the first. In the Dashboard,
      open the subscription and confirm the next invoice is dated the first of
      the next month.
- [ ] Confirm no invoice was charged at the moment of signup, and that no
      prorated line item exists.
- [ ] Confirm the subscription is not described as being in a trial.
- [ ] Use **Billing, Subscriptions, the subscription, Upcoming invoice** to
      confirm the first full invoice is the full monthly amount.
- [ ] If you can, repeat the test on the first of a month and confirm the
      subscription starts immediately instead.

### 10.4 Promotion codes

- [ ] The DD4 code reduces DD4 from £500 to £400, and is refused on DD8, DD12
      and the 10 Session Pack.
- [ ] The DD8 code reduces DD8 from £960 to £760, and is refused elsewhere.
- [ ] The DD12 code reduces DD12 from £1,380 to £1,080, and is refused elsewhere.
- [ ] The 10 Session Pack code reduces £1,250 to £1,000, and is refused on the
      3 Session Pack and on the Movement Strategy Analysis.
- [ ] A code set to one redemption cannot be used a second time.
- [ ] An expired code is refused and the price does not change.
- [ ] An invented code is refused and the price does not change.
- [ ] Two codes cannot be applied to the same Checkout.
- [ ] The promotion code field does **not** appear on Online Coaching, on any
      Virtual Coaching option, on the Movement Strategy Analysis or on the
      3 Session Pack.
- [ ] For a monthly code, open the subscription in the Dashboard and confirm the
      discount is attached and that the upcoming invoice shows the reduced
      amount. Advance the test clock, or check again after a real cycle, to
      confirm it repeats.

### 10.5 One time purchases

- [ ] Each of the three one time services opens Checkout with the correct
      product and price.
- [ ] Name, email, telephone number and billing address are collected.
- [ ] The terms for that service appear next to the acceptance box.
- [ ] Payment redirects to `/payment-submitted`.
- [ ] The promotion code field appears only on the 10 Session Pack.

### 10.6 The rest of the site

- [ ] Each Virtual Coaching option opens the matching Checkout.
- [ ] The enquiry form sends and the email arrives.
- [ ] Every Enquire button jumps to the form with the right service selected.
- [ ] Every redirect in `vercel.json` resolves.

---

## 11. Email notifications

In **Settings, Business, Customer emails**, turn on:

- Successful payments
- Refunds
- Failed payments and disputes

In **Settings, Billing, Subscriptions and emails**, turn on the emails for
upcoming invoices and failed payment retries, and set the retry rules you want
for a failed Direct Debit.

For your own alerts, check **Settings, Personal, Notifications** so that you are
emailed when a payment succeeds or fails and when a Direct Debit mandate is
cancelled by a payer.

### Before onboarding any client

A visitor reaching `/payment-submitted` means only that their instruction was
submitted. Before you begin providing sessions:

1. Open the Stripe Dashboard.
2. Find the customer and confirm the Bacs mandate status is active, not pending
   or failed.
3. For a subscription, confirm it is active and confirm the date of the first
   invoice.
4. Contact the client to confirm their start date, preferred location or
   delivery method, appointment availability, and to arrange and separately
   charge any interim sessions.

Interim session rates, for reference:

| Plan the client selected | Standard interim rate | Existing client interim rate |
| ------------------------ | --------------------: | ---------------------------: |
| DD4                      | £125 per session      | £100 per session             |
| DD8                      | £120 per session      | £95 per session              |
| DD12                     | £115 per session      | £90 per session              |
| Virtual Coaching         | £100 per session      | £100 per session             |

Online Coaching has no interim rate. The programme begins on the first.

---

## 12. Going live

Only when every test above has passed:

1. Recreate the products, prices and coupons in **live mode**. Test mode
   objects do not carry across.
2. Replace `STRIPE_SECRET_KEY` in Vercel Production with the live key
   (`sk_live_...`).
3. Replace all ten `STRIPE_PRICE_*` variables in Production with the live
   Price IDs.
4. Set `SITE_URL` in Production to `https://cgperformance.fit`.
5. Set the Privacy and Terms URLs in Stripe back to the live domain.
6. Redeploy.
7. Confirm no secret key appears anywhere in the repository:

   ```bash
   git grep -nE "sk_(live|test)_|rk_live_|whsec_" || echo "No Stripe secrets found."
   ```

8. Confirm no promotion code appears in the repository:

   ```bash
   git grep -niE "promo|coupon" -- services.js script.js index.html
   ```

   Only comments and structural references should appear, never a code.

9. Make one small real purchase yourself, then refund it, to confirm the live
   path works end to end.
