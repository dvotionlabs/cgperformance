/*
 * Browser tests for the built site.
 * Needs Playwright, which is deliberately not a project dependency:
 *   npm install --no-save playwright
 * Then, in one terminal:  node tests/dev-server.js
 * and in another:         node tests/browser.test.js
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail: detail || '' });
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleMsgs = [];
  page.on('console', (m) => consoleMsgs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => consoleMsgs.push('pageerror: ' + e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });

  // 1. console clean
  const bad = consoleMsgs.filter((m) => !m.startsWith('log:'));
  check('console has no warnings or errors', bad.length === 0, bad.join(' | '));

  // 2. footer year
  const year = await page.locator('[data-year]').first().textContent();
  check('footer year is current', year === String(new Date().getFullYear()), year);

  // 3. purchase buttons fall back to enquiry (no payment links configured)
  const purchaseLabels = await page.locator('[data-purchase]').allTextContents();
  check(
    'unconfigured purchase buttons become Enquire to Purchase',
    purchaseLabels.every((t) => t.trim() === 'Enquire to Purchase'),
    JSON.stringify(purchaseLabels)
  );

  // 4. virtual selector starts disabled
  const vBtn = page.locator('#virtual-checkout');
  check('virtual button starts disabled', await vBtn.isDisabled());
  const vTotal0 = await page.locator('#virtual-total').textContent();
  check('virtual total prompts a selection', /Select an option/.test(vTotal0), vTotal0);

  // 5. select 8 sessions
  await page.locator('input[value="virtual-8-monthly"]').check();
  const vTotal = await page.locator('#virtual-total').textContent();
  check('virtual total updates for 8 sessions', /8 sessions.*£100.*£800/.test(vTotal), vTotal);
  check('virtual button enabled after selection', await vBtn.isEnabled());
  const aria = await vBtn.getAttribute('aria-label');
  check('virtual button aria-label updated', /8 Virtual Coaching sessions.*£800/.test(aria || ''), aria);

  // 6. 12 sessions
  await page.locator('input[value="virtual-12-monthly"]').check();
  const vTotal12 = await page.locator('#virtual-total').textContent();
  check('virtual total updates for 12 sessions', /12 sessions.*£1,200/.test(vTotal12), vTotal12);

  // 7. Enquire button preselects the service
  await page.locator('[data-enquire="pt-8-monthly"]').first().click();
  await page.waitForTimeout(700);
  const selected = await page.locator('#f-service').inputValue();
  check('Enquire preselects service', selected === '8 In Person Sessions Per Month', selected);

  // 8. preserve typed data when another Enquire is pressed
  await page.locator('#f-name').fill('Test Person');
  await page.locator('[data-enquire="online-coaching-monthly"]').first().click();
  await page.waitForTimeout(600);
  const keptName = await page.locator('#f-name').inputValue();
  const selected2 = await page.locator('#f-service').inputValue();
  check('typed data preserved on second enquire', keptName === 'Test Person', keptName);
  check('service updated on second enquire', selected2 === 'Online Coaching', selected2);

  // 9. validation blocks an incomplete form
  await page.locator('#f-name').fill('');
  await page.locator('#enquiry-submit').click();
  await page.waitForTimeout(300);
  const errVisible = await page.locator('#f-name-err').isVisible();
  const statusTxt = await page.locator('#enquiry-status').textContent();
  check('empty required field is flagged', errVisible, String(errVisible));
  check('status message shown on invalid submit', /highlighted fields/.test(statusTxt), statusTxt);

  // 10. valid submit reaches the success page
  await page.locator('#f-name').fill('Test Person');
  await page.locator('#f-email').fill('test@example.com');
  await page.locator('#f-location').selectOption('UNTIL Marylebone');
  await page.locator('#f-goals').fill('Return to running after a long break.');
  await page.locator('#f-consent').check();
  await Promise.all([
    page.waitForURL('**/enquiry-success**', { timeout: 5000 }),
    page.locator('#enquiry-submit').click(),
  ]);
  check('valid enquiry redirects to the success page', page.url().includes('/enquiry-success'), page.url());

  // 11. checkout button posts a service ID and follows the returned URL
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const posted = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/create-subscription-checkout')) posted.push(r.postData());
  });
  await Promise.all([
    page.waitForURL('**/payment-submitted**', { timeout: 5000 }),
    page.locator('[data-checkout="pt-12-monthly"]').click(),
  ]);
  check('checkout posts only a service ID', posted[0] === '{"serviceId":"pt-12-monthly"}', posted[0]);
  check('checkout follows the returned URL', page.url().includes('/payment-submitted'), page.url());

  // 12. no secrets in anything the browser downloads
  const clientJs = await (await fetch(BASE + '/services.js')).text();
  const clientJs2 = await (await fetch(BASE + '/script.js')).text();
  const html = await (await fetch(BASE + '/')).text();
  const secretPattern = /sk_(live|test)_|whsec_|price_[A-Za-z0-9]{10,}|re_[A-Za-z0-9]{10,}/;
  check(
    'no secret or Price ID in browser-delivered files',
    !secretPattern.test(clientJs + clientJs2 + html)
  );

  // 13. legacy pricing must not appear publicly
  const legacy = ['£400 per month', '£760', '£1,080', '£1,000', '£95 per session', '£90 per session'];
  const leaked = legacy.filter((v) => html.includes(v));
  check('no existing client pricing on the homepage', leaked.length === 0, leaked.join(', '));

  // 14. mobile navigation
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(BASE, { waitUntil: 'networkidle' });
  const toggle = mobile.locator('#nav-toggle');
  check('nav toggle visible on mobile', await toggle.isVisible());
  check('nav hidden before opening', !(await mobile.locator('#site-nav').isVisible()));
  await toggle.click();
  check('nav opens', await mobile.locator('#site-nav').isVisible());
  check('aria-expanded true when open', (await toggle.getAttribute('aria-expanded')) === 'true');
  await mobile.keyboard.press('Escape');
  check('Escape closes the nav', !(await mobile.locator('#site-nav').isVisible()));
  await toggle.click();
  await mobile.locator('#site-nav a[href="#about"]').click();
  await mobile.waitForTimeout(300);
  check('nav closes after following a link', !(await mobile.locator('#site-nav').isVisible()));

  // 15. no horizontal overflow on mobile
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  check('no horizontal overflow at 390px', overflow <= 0, 'overflow ' + overflow + 'px');

  // 16. keyboard reachability of the skip link
  await mobile.goto(BASE, { waitUntil: 'domcontentloaded' });
  await mobile.keyboard.press('Tab');
  const focused = await mobile.evaluate(() => document.activeElement.className);
  check('skip link is the first tab stop', focused.includes('skip-link'), focused);

  // 17. 404 page
  const notFound = await page.goto(BASE + '/definitely-not-a-page');
  check('unknown path returns 404 page', notFound.status() === 404, String(notFound.status()));

  // 18. FAQ works without JS
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const njPage = await noJs.newPage();
  await njPage.goto(BASE, { waitUntil: 'domcontentloaded' });
  await njPage.locator('.faq summary').first().click();
  check('FAQ opens without JavaScript', await njPage.locator('.faq details').first().evaluate((d) => d.open));
  const priceVisible = await njPage.locator('[data-price="pt-8-monthly.amount"]').textContent();
  check('prices render without JavaScript', priceVisible.trim() === '£960', priceVisible);

  await browser.close();

  let failed = 0;
  for (const r of results) {
    if (!r.pass) failed++;
    console.log((r.pass ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail && !r.pass ? '   [' + r.detail + ']' : ''));
  }
  console.log('\n' + (results.length - failed) + '/' + results.length + ' checks passed');
  if (consoleMsgs.length) console.log('\nConsole output:\n' + consoleMsgs.join('\n'));
  process.exit(failed ? 1 : 0);
})();
