/*
 * Unit tests for the two serverless functions.
 * Run with: npm test
 * No dependencies, no network, no Stripe or Resend account required.
 */
const checkout = require('../api/create-checkout.js');
const enquiry = require('../api/enquiry.js');
const { nextFirstOfMonthUnix, SERVICES } = checkout.internals;

let failed = 0;
function check(name, pass, detail) {
  if (!pass) failed++;
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (!pass && detail ? '   [' + detail + ']' : ''));
}

function londonString(unix) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
  }).format(new Date(unix * 1000));
}

/* --- billing anchor ----------------------------------------------------- */
check('on the first, no anchor is set (starts immediately)',
  nextFirstOfMonthUnix(new Date('2026-09-01T09:00:00Z')) === null);

check('mid month anchors to the next first',
  londonString(nextFirstOfMonthUnix(new Date('2026-08-14T10:00:00Z'))) === '01/09/2026, 00:05',
  londonString(nextFirstOfMonthUnix(new Date('2026-08-14T10:00:00Z'))));

check('December rolls over into January',
  londonString(nextFirstOfMonthUnix(new Date('2026-12-20T10:00:00Z'))) === '01/01/2027, 00:05',
  londonString(nextFirstOfMonthUnix(new Date('2026-12-20T10:00:00Z'))));

check('anchor lands on London midnight across a BST boundary',
  londonString(nextFirstOfMonthUnix(new Date('2027-03-15T12:00:00Z'))) === '01/04/2027, 00:05',
  londonString(nextFirstOfMonthUnix(new Date('2027-03-15T12:00:00Z'))));

check('anchor lands on London midnight in GMT',
  londonString(nextFirstOfMonthUnix(new Date('2026-10-15T12:00:00Z'))) === '01/11/2026, 00:05',
  londonString(nextFirstOfMonthUnix(new Date('2026-10-15T12:00:00Z'))));

// 23:30 UTC on 31 Aug is already 00:30 on 1 Sep in London (BST), so it starts immediately.
check('the London date decides, not the UTC date',
  nextFirstOfMonthUnix(new Date('2026-08-31T23:30:00Z')) === null);

// 23:30 London on 31 Aug is still the 31st, so it anchors to 1 Sep.
check('late on the 31st in London still anchors to the next first',
  londonString(nextFirstOfMonthUnix(new Date('2026-08-31T23:30:00+01:00'))) === '01/09/2026, 00:05',
  londonString(nextFirstOfMonthUnix(new Date('2026-08-31T23:30:00+01:00'))));

check('anchor is always in the future',
  nextFirstOfMonthUnix(new Date()) === null || nextFirstOfMonthUnix(new Date()) * 1000 > Date.now());

/* --- allowlist ---------------------------------------------------------- */
const ids = Object.keys(SERVICES);
check('all ten services are purchasable', ids.length === 10, ids.join(','));
check('seven are monthly subscriptions',
  ids.filter((id) => SERVICES[id].mode === 'subscription').length === 7);
check('three are one time payments',
  ids.filter((id) => SERVICES[id].mode === 'payment').sort().join(',') ===
    'movement-strategy-analysis,pt-10-pack,pt-3-pack',
  ids.filter((id) => SERVICES[id].mode === 'payment').join(','));
check('promotion codes only on the three in person monthly plans and the 10 pack',
  ids.filter((id) => SERVICES[id].allowPromotionCodes).sort().join(',') ===
    'pt-10-pack,pt-12-monthly,pt-4-monthly,pt-8-monthly',
  ids.filter((id) => SERVICES[id].allowPromotionCodes).join(','));
check('every service states its terms for the Checkout page',
  ids.every((id) => typeof SERVICES[id].terms === 'string' && SERVICES[id].terms.length > 40));
check('every service resolves its price from an environment variable',
  ids.every((id) => /^STRIPE_PRICE_/.test(SERVICES[id].priceEnv)));

/* --- request handling --------------------------------------------------- */
function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} };
  res.setHeader = (k, v) => (res.headers[k] = v);
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  res.send = (b) => ((res.body = b), res);
  res.end = () => res;
  return res;
}
const goodHeaders = { origin: 'https://cgperformance.fit', host: 'cgperformance.fit' };

(async () => {
  process.env.SITE_URL = 'https://cgperformance.fit';

  let res = mockRes();
  await checkout({ method: 'GET', headers: goodHeaders, body: {} }, res);
  check('GET is rejected with 405', res.statusCode === 405, String(res.statusCode));

  res = mockRes();
  await checkout({ method: 'POST', headers: { origin: 'https://evil.example', host: 'cgperformance.fit' }, body: { serviceId: 'pt-4-monthly' } }, res);
  check('cross origin POST is rejected with 403', res.statusCode === 403, String(res.statusCode));

  res = mockRes();
  await checkout({ method: 'POST', headers: goodHeaders, body: { serviceId: 'made-up-service' } }, res);
  check('an ID outside the allowlist is rejected with 400', res.statusCode === 400, String(res.statusCode));

  res = mockRes();
  await checkout({ method: 'POST', headers: goodHeaders, body: { serviceId: 'pt-4-monthly', priceId: 'price_hacked', amount: 1 } }, res);
  check('a missing Stripe key returns 503, not a broken checkout',
    res.statusCode === 503, String(res.statusCode) + ' ' + JSON.stringify(res.body));
  check('a missing Stripe key says payment is not connected',
    /not connected yet/.test(res.body.message), res.body.message);

  process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_for_this_test';
  res = mockRes();
  await checkout({ method: 'POST', headers: goodHeaders, body: { serviceId: 'pt-4-monthly' } }, res);
  check('a missing Price ID is reported differently from a missing key',
    res.statusCode === 503 && /cannot be bought online yet/.test(res.body.message), res.body.message);
  delete process.env.STRIPE_SECRET_KEY;

  check('neither setup message leaks a variable name or value',
    !/STRIPE_|price_|sk_/.test(res.body.message), res.body.message);

  /* enquiry */
  process.env.RESEND_API_KEY = 'test-key';
  let sent = null;
  global.fetch = async (url, options) => {
    sent = { url, options };
    return { ok: true, status: 200, text: async () => '' };
  };

  res = mockRes();
  await enquiry({ method: 'POST', headers: { ...goodHeaders, accept: 'application/json' }, body: {} }, res);
  check('an empty enquiry is rejected with 400', res.statusCode === 400, String(res.statusCode));

  res = mockRes();
  await enquiry({
    method: 'POST',
    headers: { ...goodHeaders, accept: 'application/json' },
    body: { name: 'A Person', email: 'not-an-email', goals: 'x', consent: 'yes' },
  }, res);
  check('a malformed email is rejected with 400', res.statusCode === 400, String(res.statusCode));

  res = mockRes();
  await enquiry({
    method: 'POST',
    headers: { ...goodHeaders, accept: 'application/json' },
    body: { name: 'Bot', email: 'bot@example.com', goals: 'x', consent: 'yes', company: 'spam ltd' },
  }, res);
  check('the honeypot silently accepts and sends nothing', res.statusCode === 200 && sent === null, String(res.statusCode));

  res = mockRes();
  await enquiry({
    method: 'POST',
    headers: { ...goodHeaders, accept: 'application/json' },
    body: {
      name: 'A Person',
      email: 'person@example.com',
      phone: '07000 000000',
      service: 'Online Coaching',
      location: 'Online',
      goals: 'Build strength around a desk job.',
      consent: 'yes',
      message: '<script>alert(1)</script>',
    },
  }, res);
  check('a valid enquiry is accepted', res.statusCode === 200, String(res.statusCode));
  const body = sent ? JSON.parse(sent.options.body) : {};
  check('the email goes to the CG inbox', body.to && body.to[0] === 'chrisgkoufas.performance@gmail.com', JSON.stringify(body.to));
  check('reply-to is the enquirer', body.reply_to === 'person@example.com', body.reply_to);
  check('the subject names the service', /Online Coaching/.test(body.subject || ''), body.subject);
  check('HTML in a message is escaped', !/<script>/.test(body.html || ''), (body.html || '').slice(0, 120));
  check('all supplied fields are included', /07000 000000/.test(body.text) && /desk job/.test(body.text));

  res = mockRes();
  await enquiry({ method: 'POST', headers: { origin: 'https://evil.example', host: 'cgperformance.fit', accept: 'application/json' }, body: {} }, res);
  check('cross origin enquiry is rejected with 403', res.statusCode === 403, String(res.statusCode));

  /* rate limiting */
  let limited = false;
  for (let i = 0; i < 12; i++) {
    const r = mockRes();
    await enquiry({
      method: 'POST',
      headers: { ...goodHeaders, accept: 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: { name: 'A Person', email: 'person@example.com', goals: 'x', consent: 'yes' },
    }, r);
    if (r.statusCode === 429) limited = true;
  }
  check('repeated enquiries are rate limited', limited);

  console.log('\n' + (failed ? failed + ' FAILED' : 'all checks passed'));
  process.exit(failed ? 1 : 0);
})();
