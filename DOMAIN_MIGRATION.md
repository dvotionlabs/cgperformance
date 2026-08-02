# Domain migration

Moving `cgperformance.fit` from the Wix website to this one, without breaking
business email and without risking the domain itself.

The order below matters. Nothing here happens automatically. No DNS record is
changed by this repository, and the Wix plan is never cancelled by any script.

> The registrar has not been confirmed. The domain may be registered at Wix, or
> it may be registered elsewhere and only pointed at Wix. Confirm this before
> starting, in step 3.

---

## Stage 1: build and test on a temporary address

1. Deploy this repository to Vercel. Every push produces a preview URL such as
   `cgperformance-abc123.vercel.app`.
2. Test the whole site on that URL: all pages, the enquiry form, every Stripe
   test mode Checkout, the Virtual Coaching selector, the redirects, mobile
   layout and keyboard navigation.
3. Set `SITE_URL` in the Vercel Preview environment to the preview URL so Stripe
   redirects come back to the right place while testing.
4. Do not touch DNS until this stage is genuinely finished.

---

## Stage 2: record everything that exists now

Before changing anything, take a full copy of the current DNS zone. This is the
safety net.

1. Sign in wherever the DNS is managed today, most likely Wix, and open the DNS
   or Domain records page.
2. Take a screenshot of every record and also write them down in a file kept
   outside this repository.
3. Record, for every entry: type, host or name, value, priority and TTL.

You can also read the live records from a terminal:

```bash
dig +short A     cgperformance.fit
dig +short AAAA  cgperformance.fit
dig +short CNAME www.cgperformance.fit
dig +short MX    cgperformance.fit
dig +short TXT   cgperformance.fit
dig +short NS    cgperformance.fit
dig +short TXT   _dmarc.cgperformance.fit
```

DKIM records sit on a selector name that varies by provider, for example
`google._domainkey.cgperformance.fit` for Google Workspace. Check the email
provider's documentation for the exact selector and query it the same way.

---

## Stage 3: confirm the registrar and the email setup

1. Confirm where the domain is actually **registered**:

   ```bash
   whois cgperformance.fit | head -n 25
   ```

   Look at the registrar line and the expiry date.
2. Confirm what the domain does for **email** today. If business email runs on
   this domain, its MX, SPF, DKIM and DMARC records must survive the move
   untouched. If email is only the Gmail address and nothing routes through
   `cgperformance.fit`, the move is simpler, but still record what is there.
3. Note the expiry date and make sure auto renewal is on. A domain that expires
   mid migration is a far bigger problem than a website that is briefly offline.

---

## Stage 4: decide whether to transfer the domain

Two options. Both work.

**Option A: keep the domain registered where it is and only repoint DNS.**
Lower risk, faster, nothing to unlock and no transfer window. Choose this if the
domain is registered at Wix but you are happy to keep paying Wix for domain
registration alone after cancelling the website plan.

**Option B: transfer the domain to another registrar,** for example Cloudflare,
Namecheap or Vercel itself. Cleaner in the long run, and removes any dependency
on Wix. Takes five to seven days.

If choosing Option B:

1. In Wix, unlock the domain and turn off any transfer lock or privacy lock.
2. Request the authorisation code, also called the EPP code or auth code.
3. Start the transfer at the new registrar and pay for the transfer year. This
   adds a year to the registration, it does not lose the remaining time.
4. Approve the confirmation email. Wix may also ask you to approve on their
   side, which speeds it up.
5. Wait for the transfer to complete. **Do not cancel anything at Wix during
   this window.** Cancelling can cause the transfer to fail.
6. Once the transfer completes, recreate every DNS record from Stage 2 at the
   new registrar, especially the email records, before repointing the website.

---

## Stage 5: add the domain in Vercel

1. In the Vercel project, open **Settings, Domains**.
2. Add `cgperformance.fit`.
3. Add `www.cgperformance.fit`.
4. Choose which one is primary. `cgperformance.fit` as primary with `www`
   redirecting to it is the usual choice, and matches the canonical URLs in this
   site's HTML.
5. Vercel will show the exact records to create. Typically:
   - An `A` record on the apex, pointing at Vercel's address
   - A `CNAME` on `www`, pointing at Vercel

   Use the values Vercel shows at the time, not values copied from an article.

---

## Stage 6: change the DNS records

This is the only step where the live site changes.

1. In the DNS provider, edit **only** the records that point the website:
   - the apex `A` record, and any apex `AAAA` record
   - the `www` `CNAME`
   - remove any Wix specific pointing records that Vercel replaces
2. **Do not touch** the MX records, the SPF `TXT` record, any DKIM record or the
   DMARC record. Business email breaks the moment one of these is removed.
3. Lower the TTL on the website records to 300 seconds a day beforehand if you
   can. Changes then propagate in minutes rather than hours.
4. Save, and wait. Propagation is usually minutes but can take up to 48 hours.

---

## Stage 7: verify before cancelling anything

Work through all of these and only continue when every one passes.

- [ ] `https://cgperformance.fit` loads the new website.
- [ ] `https://www.cgperformance.fit` redirects to the primary domain.
- [ ] `http://cgperformance.fit` upgrades to HTTPS.
- [ ] The padlock shows a valid certificate. Vercel issues this automatically,
      normally within minutes of the DNS change.
- [ ] Business email still sends **and** receives. Send a test in both
      directions, including one from an outside address.
- [ ] The MX, SPF, DKIM and DMARC records are still present:

      ```bash
      dig +short MX  cgperformance.fit
      dig +short TXT cgperformance.fit
      dig +short TXT _dmarc.cgperformance.fit
      ```

- [ ] The enquiry form sends and the email arrives at the inbox.
- [ ] Stripe Checkout opens and returns to `https://cgperformance.fit/payment-submitted`.
- [ ] The old Wix paths redirect correctly, for example `/about`, `/services`,
      `/pricing`, `/contact`, `/personal-training`.
- [ ] `/privacy` and `/terms` load and do not redirect.
- [ ] `https://cgperformance.fit/sitemap.xml` and `/robots.txt` load.

Then update the outside world:

- [ ] Set `SITE_URL` in Vercel Production to `https://cgperformance.fit`.
- [ ] Set the Privacy and Terms URLs in Stripe to the live domain.
- [ ] Submit the sitemap in Google Search Console and request indexing of the
      homepage.
- [ ] Update the website link on Instagram and any other profile.

---

## Stage 8: only now, cancel Wix

Once the new site has been live and correct for a few days, and email has been
working the whole time:

1. Cancel the **Wix website plan**.
2. If the domain is still registered at Wix, keep the **domain registration**
   active and keep auto renewal on. These are two separate purchases. Cancelling
   the site plan must not cancel the domain.
3. Keep the Wix account itself open until you are certain nothing else depends
   on it, such as email forwarding or an old mailbox.
4. Confirm renewal is active wherever the domain now lives, with a card that
   will not expire before the next renewal.

---

## If something goes wrong

The DNS records recorded in Stage 2 are the way back. Restoring the original
apex `A` record and the `www` `CNAME` puts the Wix site back exactly as it was,
subject only to propagation time. This is why the Wix plan stays active until
Stage 8 and why the records are written down before anything changes.
