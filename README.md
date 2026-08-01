# CG Performance

The website for CG Performance Limited, at [cgperformance.fit](https://cgperformance.fit).

Static HTML, CSS and vanilla JavaScript, with two small serverless functions.
No framework, no build step, no database, no client accounts. Hosted on Vercel,
the same project used for the previous CG Performance build.

---

## 1. Project structure

```
index.html                              Homepage. Every public section lives here.
privacy.html                            Privacy Policy (draft, needs review)
terms.html                              Terms of Service (draft, needs review)
enquiry-success.html                    Shown after an enquiry is sent
payment-submitted.html                  Shown after Stripe Checkout or a Payment Link
404.html                                Not found page

styles.css                              All styling
script.js                               All behaviour
services.js                             Prices, service data, Payment Link URLs

api/create-subscription-checkout.js     Creates Stripe Checkout sessions (Direct Debit)
api/enquiry.js                          Emails the enquiry form to the CG inbox

assets/images/                          Photography, logo, social sharing image
assets/icons/                           Favicons

tests/api.test.js                       Tests for both functions, no dependencies
tests/browser.test.js                   Tests for the rendered site, needs Playwright
tests/dev-server.js                     Local server that mimics the Vercel rules

vercel.json                             Clean URLs, redirects, security headers
robots.txt, sitemap.xml                 Search engines
package.json                            Only dependency is the Stripe Node library
.env.example                            Names of the environment variables (no values)

STRIPE_SETUP.md                         How to build the Stripe side, step by step
DOMAIN_MIGRATION.md                     Moving cgperformance.fit away from Wix
LAUNCH_CHECKLIST.md                     Everything to tick off before going live
```

### A note on the brief

The original brief specified Netlify Forms, Netlify Functions, `netlify.toml`
and `_redirects`. This build stays on Vercel, as requested, so those pieces map
across as follows:

| Brief                           | This build                                    |
| ------------------------------- | --------------------------------------------- |
| `netlify.toml` and `_redirects` | `vercel.json`                                 |
| Netlify Function                | `api/create-subscription-checkout.js`         |
| Netlify Forms                   | `api/enquiry.js`, which emails through Resend |

Everything else follows the brief as written.

---

## 2. Running the website locally

### Quickest look at the pages

```bash
npm run serve
```

Then open <http://localhost:4321>. This is a small local server, in
`tests/dev-server.js`, that applies the clean URLs and redirects from
`vercel.json` and stubs the two API routes. The purchase buttons and the enquiry
form complete their journey without touching Stripe or Resend, so the whole
site can be clicked through offline.

### Full local run, with the functions

Install the Vercel CLI once:

```bash
npm install -g vercel
```

Then, in the project folder:

```bash
npm install          # installs the Stripe library
cp .env.example .env.local
# fill in .env.local with your Stripe test keys and Resend key
npm run dev          # runs `vercel dev` on http://localhost:3000
```

`vercel dev` serves the static site, applies the rules in `vercel.json` and runs
the two functions, so purchase buttons and the enquiry form behave exactly as
they will in production.

---

## 3. Editing public copy

All public copy is in the HTML files, written in plain sentences. Open
`index.html` and edit the text between the tags. The section order is:

1. Header
2. Hero
3. About Chris (`#about`)
4. My Approach (`#approach`)
5. Services and pricing (`#services`)
6. Locations (`#locations`)
7. FAQs (`#faqs`)
8. Enquiry form (`#enquire`)
9. Footer

House style: UK English, no em dashes or en dashes, no sales language, no claims
that are not confirmed.

---

## 4. Editing prices and service information

`services.js` is the source of truth. Amounts are in pence.

```js
'pt-8-monthly': {
  name: '8 In Person Sessions Per Month',
  type: 'subscription',
  amount: 96000,        // 960.00
  perSession: 12000,    // 120.00
  ...
}
```

The prices are also written into `index.html` so that search engines and
visitors without JavaScript can read them. Each one carries a `data-price`
attribute, for example:

```html
<span class="price-main" data-price="pt-8-monthly.amount">&pound;960</span>
```

When the page loads, `script.js` compares every `data-price` element against
`services.js`. If they disagree it logs a warning in the browser console, so a
price cannot quietly change in one place only.

**To change a price:** edit the pence value in `services.js`, edit the matching
figure in `index.html`, then load the page and check the console is clean. If
the price is also live in Stripe, create a new Stripe Price and update the
environment variable or Payment Link too.

---

## 5. Images

### The professional portrait

The hero currently uses `assets/images/coaching-talk-bw.jpg`. To swap in a final
portrait:

1. Save it as `assets/images/portrait.jpg`, ideally 1200 x 1600 or larger, in
   the same 3 by 4 ratio.
2. In `index.html`, find the `hero-figure` block and change the `src`, the
   `width` and `height` attributes and the `alt` text.
3. Delete the `<source>` line above it, or produce a matching `.webp` and point
   the `srcset` at it.

The image is styled with a fixed aspect ratio, so the page will not shift while
it loads as long as `width` and `height` are set.

### The logo

`assets/images/logo-cgp-mark.png` is the header mark, drawn at 62 by 24 pixels.
It is a trimmed, transparent version of the original artwork, which is kept
alongside it as `assets/images/logo-cgp.png`. Replace both to change the mark,
and regenerate the favicons in `assets/icons/` from the same artwork so the
browser tab matches.

### The social sharing image

`assets/images/social-share.jpg`, 1200 x 630. Replace the file to change what
appears when the site is shared. The path is already set in the Open Graph and
Twitter tags in `index.html`.

---

## 6. Connecting Stripe

Full instructions are in [STRIPE_SETUP.md](STRIPE_SETUP.md). In short:

### Recurring services (Direct Debit)

Create the recurring Prices in Stripe and add the Price IDs as environment
variables in Vercel:

```
STRIPE_SECRET_KEY
STRIPE_PRICE_PT_4_MONTHLY
STRIPE_PRICE_PT_8_MONTHLY
STRIPE_PRICE_PT_12_MONTHLY
STRIPE_PRICE_ONLINE_MONTHLY
STRIPE_PRICE_VIRTUAL_4_MONTHLY
STRIPE_PRICE_VIRTUAL_8_MONTHLY
STRIPE_PRICE_VIRTUAL_12_MONTHLY
SITE_URL
```

The browser never sees a Price ID. It sends a service ID such as
`pt-8-monthly`, and the function looks up the matching Price on the server.

### One time services (Payment Links)

Create the Payment Links in Stripe and paste the URLs into `services.js`:

```js
paymentLinks: {
  'pt-3-pack': 'https://buy.stripe.com/...',
  'pt-10-pack': 'https://buy.stripe.com/...',
  'movement-strategy-analysis': 'https://buy.stripe.com/...',
}
```

While a link is left as an empty string, the Purchase button automatically
becomes "Enquire to Purchase" and takes the visitor to the enquiry form with
that service preselected. Nothing appears broken.

---

## 7. The enquiry form

Enquiries are emailed straight to the CG Performance inbox. Nothing is stored.

### Setting up Resend

1. Go to <https://resend.com> and create an account **using
   chrisgkoufas.performance@gmail.com**. This matters for step 4.
2. Go to API Keys and create a key with sending permission. Copy it once, it is
   shown only that one time.
3. In Vercel, add it as `RESEND_API_KEY`.
4. Until a domain is verified, Resend only allows sending from
   `onboarding@resend.dev` and only to the email address that owns the account.
   Because the account was created with the Gmail address above, enquiries will
   arrive correctly with no further setup. Leave `ENQUIRY_FROM` unset.
5. Optional, and better once the domain has moved: in Resend, add
   `cgperformance.fit` as a domain, add the DNS records it gives you, then set
   `ENQUIRY_FROM` to `CG Performance Website <enquiries@cgperformance.fit>`.
   Enquiries then arrive from your own domain instead of a shared sender.

The reply-to address on every enquiry email is set to the person who sent it, so
replying from the inbox goes straight back to them.

### Testing it

With `vercel dev` running and `RESEND_API_KEY` in `.env.local`, complete the
form on the homepage. You should land on `/enquiry-success` and the email should
arrive within a few seconds. Check the spam folder on the first send.

If the key is missing, the form returns a clear message asking the visitor to
email directly instead. It never fails silently.

---

## 8. Deploying to Vercel

The project is a zero configuration static site. Vercel serves the files as they
are and turns everything in `api/` into serverless functions.

1. Push to GitHub. Vercel builds the branch automatically.
2. Confirm in Project Settings, Build and Development Settings, that the
   Framework Preset is **Other**, and that the build command and output
   directory are empty. This project has no build step.
3. Node version 20 or newer, set in `package.json` under `engines`.

Every push to the branch creates a preview URL. Use a preview URL for all Stripe
test mode work, and set `SITE_URL` for the preview environment to that URL so
the success and cancel redirects come back to the right place.

### Environment variables

Add them in Vercel under Project Settings, Environment Variables. Add each one
to Production, Preview and Development as needed. Use Stripe **test** keys in
Preview and Development, and the live key in Production only once testing has
passed.

Never put a secret in the repository, in `services.js`, or in any file the
browser downloads.

---

## 9. Connecting the domain

The full order of operations, including protecting the business email, is in
[DOMAIN_MIGRATION.md](DOMAIN_MIGRATION.md). Do not change DNS until the site has
been tested on its Vercel URL.

---

## 10. Testing redirects

The old Wix paths are redirected in `vercel.json`. With `vercel dev` running, or
on a Vercel preview URL, check a few:

```bash
curl -sI http://localhost:3000/about   | head -n 3
curl -sI http://localhost:3000/pricing | head -n 3
curl -sI http://localhost:3000/contact | head -n 3
```

Each should return a 308 with a `Location` header pointing at the right anchor.
`/privacy` and `/terms` must return 200 and must never redirect to the homepage.

---

## 11. Tests

```bash
npm test
```

Runs `tests/api.test.js`, which covers both serverless functions with no
dependencies, no network and no Stripe or Resend account. It checks the billing
anchor logic across month ends, year ends and British Summer Time, the service
allowlist, which services accept promotion codes, the rejection of bad requests,
and the enquiry validation, honeypot, escaping and rate limiting.

There is also a browser test suite covering the rendered site: the price
integrity check, the Virtual Coaching selector, the Enquire buttons, form
validation, mobile navigation, keyboard access and the pages with JavaScript
turned off. It needs Playwright, which is kept out of the project dependencies
so that deployments stay small:

```bash
npm install --no-save playwright && npx playwright install chromium
node tests/dev-server.js          # in one terminal
npm run test:browser              # in another
```

---

## 12. Checking that no placeholder remains

```bash
npm run check:placeholders
```

This lists every remaining `PLACEHOLDER` comment and every "to be confirmed"
line in the HTML and JavaScript. The list should be empty before launch. The
items currently outstanding are the company registration details in the Privacy
Policy and Terms, and the optional final portrait.

Work through [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) before going live.

---

## 13. Security notes

- The Stripe secret key exists only as a Vercel environment variable. It is
  never sent to the browser.
- The browser can only ask for a service ID from a fixed allowlist. It cannot
  send a price, a Price ID, an amount, a discount or a billing date.
- Promotion codes are created and validated entirely inside Stripe. No code
  appears anywhere in this repository.
- Both functions accept POST only, check the request came from this site and
  apply simple per instance rate limiting.
- The site sets no cookies of its own and loads no third party scripts.
