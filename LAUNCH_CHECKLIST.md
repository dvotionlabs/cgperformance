# Launch checklist

Work top to bottom. Nothing goes live until every box in sections 1 to 8 is
ticked.

---

## 1. Content and assets

- [ ] Add final professional portrait, or confirm the current hero photograph is
      the one to keep
- [ ] Add final logo, or approve the existing CG mark and text wordmark
- [ ] Confirm the business email address shown in the footer, Privacy Policy and
      Terms
- [ ] Confirm the cancellation email address in the Terms
- [ ] Add the business telephone number, or remove the line from the footer
- [ ] Add the Instagram URL, or remove the line from the footer
- [ ] Add the company registration number and registered office address to the
      Privacy Policy and Terms
- [ ] Replace or approve the social sharing image at
      `assets/images/social-share.jpg`
- [ ] Review the About copy
- [ ] Review the Approach copy and the five stages
- [ ] Review every service description and every inclusion list
- [ ] Review the FAQ answers

## 2. Legal

- [ ] Review the Privacy Policy in full
- [ ] Review the Terms of Service in full
- [ ] Complete the legal review of the liability, consumer rights, refunds and
      governing law section marked as a placeholder in the Terms
- [ ] Confirm the data retention periods in the Privacy Policy
- [ ] Remove the "Draft for review" banners from both pages once approved

## 3. Stripe, products and prices

- [ ] Create the seven recurring products
- [ ] Create the three one time products
- [ ] Create every recurring Price at the correct monthly amount
- [ ] Create every one time Price at the correct amount
- [ ] Create the three one time Payment Links
- [ ] Enable Bacs Direct Debit on the account
- [ ] Set the Privacy and Terms URLs in Stripe public details
- [ ] Upload Stripe branding
- [ ] Add all seven `STRIPE_PRICE_*` variables in Vercel
- [ ] Add `SITE_URL` in Vercel
- [ ] Add `STRIPE_SECRET_KEY` in Vercel, securely
- [ ] Paste the three Payment Link URLs into `services.js`

## 4. Existing client discounts

- [ ] Create the DD4 coupon, £100 off, forever, restricted to the DD4 product
- [ ] Create the DD8 coupon, £200 off, forever, restricted to the DD8 product
- [ ] Create the DD12 coupon, £300 off, forever, restricted to the DD12 product
- [ ] Create the 10 Session Pack coupon, £250 off, once, restricted to that pack
- [ ] Create an individual promotion code for each eligible client, limited to
      one redemption
- [ ] Test that each discount produces the correct final price: £400, £760,
      £1,080 and £1,000
- [ ] Test that discounts cannot be stacked
- [ ] Test that a code is refused on any product it was not issued for
- [ ] Test that a recurring discount still appears on the next invoice
- [ ] Keep the private record of which code went to which client, outside this
      repository

## 5. Billing behaviour

- [ ] Test billing on the first of the month
- [ ] Confirm no automatic proration is charged before the first full cycle
- [ ] Confirm the period before the first is not shown as a free trial
- [ ] Test a Bacs Direct Debit submission end to end in test mode
- [ ] Confirm `/payment-submitted` appears after Checkout and after a Payment
      Link
- [ ] Test every standard Checkout, all seven recurring services
- [ ] Test every one time Payment Link, all three
- [ ] Test the Virtual Coaching selector on all three options
- [ ] Confirm the interim session process and the rates to quote

## 6. Forms and notifications

- [ ] Create the Resend account with the CG Performance inbox address
- [ ] Add `RESEND_API_KEY` in Vercel
- [ ] Test the enquiry form and confirm the email arrives
- [ ] Confirm the reply-to address returns to the enquirer
- [ ] Check the first email did not land in spam, and mark it as not spam if it
      did
- [ ] Configure Stripe email notifications for payments, failures and disputes
- [ ] Configure your own Stripe dashboard notifications

## 7. Content and security review

- [ ] Confirm no existing client or legacy price appears publicly
- [ ] Confirm no promotion code appears in any source file
- [ ] Confirm no Stripe secret appears in the repository:
      `git grep -nE "sk_(live|test)_|whsec_"`
- [ ] Confirm only UNTIL Liverpool Street and UNTIL Marylebone appear as
      locations
- [ ] Confirm no Wix branding remains anywhere
- [ ] Run `npm run check:placeholders` and confirm the list is empty
- [ ] Confirm the footer year renders the current year

## 8. Domain and delivery

- [ ] Set the final canonical domain in every page and in `sitemap.xml`
- [ ] Record all existing DNS records
- [ ] Preserve MX, SPF, DKIM and DMARC records
- [ ] Connect or transfer the domain, following `DOMAIN_MIGRATION.md`
- [ ] Test `https://cgperformance.fit`
- [ ] Test `https://www.cgperformance.fit` redirects correctly
- [ ] Test SSL is active and valid
- [ ] Test business email sends and receives
- [ ] Test every redirect from the old Wix paths
- [ ] Confirm `/privacy` and `/terms` do not redirect

## 9. Quality

- [ ] Test mobile navigation, open, close and Escape
- [ ] Test keyboard navigation through the whole page, including the skip link
- [ ] Test the FAQ accordions with a keyboard
- [ ] Test the enquiry form validation messages
- [ ] Test every button on the page
- [ ] Check layout at mobile, tablet and desktop widths
- [ ] Check colour contrast
- [ ] Run Lighthouse and review Performance, Accessibility, Best Practices
      and SEO
- [ ] Confirm the browser console is clean, including the price check warnings

## 10. After launch

- [ ] Submit the sitemap in Google Search Console
- [ ] Update the website link on Instagram and any other profile
- [ ] Cancel the Wix website plan, only after the new site and email have both
      worked correctly for several days
- [ ] Confirm domain renewal is active at the registrar
