/*
 * CG Performance | Secure Checkout
 * --------------------------------
 * Creates a Stripe Checkout Session for every purchasable service:
 *   - monthly services, as Bacs Direct Debit subscriptions
 *   - session packs and the consultation, as one time payments
 *
 * The browser sends one thing only: a public service ID. Everything that
 * affects money is resolved here:
 *   - the Stripe Price ID comes from a server environment variable
 *   - the billing date is calculated here in Europe/London
 *   - promotion code eligibility is decided here
 *
 * The function never accepts a price, a Price ID, an amount, a discount or a
 * billing date from the client.
 *
 * The terms of each service are shown on the Stripe Checkout page itself,
 * beside the terms of service acceptance box, so a client reads them before
 * paying rather than only on the Terms page.
 */

const Stripe = require('stripe');

const MONTHLY_TERMS =
  'Your session allowance applies to the calendar month. Unused sessions expire at the end of the month and do not roll over. ' +
  'Billing is on the first of each month and one month of written notice is required to cancel. ' +
  'Sessions arranged before your first monthly payment are charged separately. ' +
  'Sessions cancelled with less than 24 hours of notice are charged in full and cannot be rescheduled.';

const ONLINE_TERMS =
  'Online Coaching runs monthly, billed on the first of each month, and one month of written notice is required to cancel. ' +
  'If you join before the first, your programme begins on the first unless another arrangement is agreed directly.';

function packTerms(validity) {
  return (
    'Sessions are arranged by appointment and are subject to availability. This pack is valid for ' + validity +
    ' from the date of purchase, and unused sessions expire at the end of that period. ' +
    'Sessions cancelled with less than 24 hours of notice are charged in full and cannot be rescheduled.'
  );
}

/* ---------------------------------------------------------------------------
 * Server side allowlist. A service ID that is not in this table is rejected.
 * ------------------------------------------------------------------------- */
const SERVICES = {
  'pt-4-monthly': {
    mode: 'subscription',
    priceEnv: 'STRIPE_PRICE_PT_4_MONTHLY',
    description: 'CG Performance | 4 In Person Sessions Monthly',
    allowPromotionCodes: true,
    terms: MONTHLY_TERMS,
  },
  'pt-8-monthly': {
    mode: 'subscription',
    priceEnv: 'STRIPE_PRICE_PT_8_MONTHLY',
    description: 'CG Performance | 8 In Person Sessions Monthly',
    allowPromotionCodes: true,
    terms: MONTHLY_TERMS,
  },
  'pt-12-monthly': {
    mode: 'subscription',
    priceEnv: 'STRIPE_PRICE_PT_12_MONTHLY',
    description: 'CG Performance | 12 In Person Sessions Monthly',
    allowPromotionCodes: true,
    terms: MONTHLY_TERMS,
  },
  'online-coaching-monthly': {
    mode: 'subscription',
    priceEnv: 'STRIPE_PRICE_ONLINE_MONTHLY',
    description: 'CG Performance | Online Coaching',
    allowPromotionCodes: false,
    terms: ONLINE_TERMS,
  },
  'virtual-4-monthly': {
    mode: 'subscription',
    priceEnv: 'STRIPE_PRICE_VIRTUAL_4_MONTHLY',
    description: 'CG Performance | 4 Virtual Coaching Sessions Monthly',
    allowPromotionCodes: false,
    terms: MONTHLY_TERMS,
  },
  'virtual-8-monthly': {
    mode: 'subscription',
    priceEnv: 'STRIPE_PRICE_VIRTUAL_8_MONTHLY',
    description: 'CG Performance | 8 Virtual Coaching Sessions Monthly',
    allowPromotionCodes: false,
    terms: MONTHLY_TERMS,
  },
  'virtual-12-monthly': {
    mode: 'subscription',
    priceEnv: 'STRIPE_PRICE_VIRTUAL_12_MONTHLY',
    description: 'CG Performance | 12 Virtual Coaching Sessions Monthly',
    allowPromotionCodes: false,
    terms: MONTHLY_TERMS,
  },
  'pt-3-pack': {
    mode: 'payment',
    priceEnv: 'STRIPE_PRICE_PT_3_PACK',
    description: 'CG Performance | 3 Session In Person Pack',
    allowPromotionCodes: false,
    terms: packTerms('one month'),
  },
  'pt-10-pack': {
    mode: 'payment',
    priceEnv: 'STRIPE_PRICE_PT_10_PACK',
    description: 'CG Performance | 10 Session In Person Pack',
    allowPromotionCodes: true,
    terms: packTerms('three months'),
  },
  'movement-strategy-analysis': {
    mode: 'payment',
    priceEnv: 'STRIPE_PRICE_MOVEMENT_ANALYSIS',
    description: 'CG Performance | Movement Strategy Analysis Consultation',
    allowPromotionCodes: false,
    terms:
      'A 60 minute movement assessment and coaching consultation, arranged by appointment at UNTIL Liverpool Street or UNTIL Marylebone. ' +
      'It is not a medical diagnosis, physiotherapy assessment or substitute for medical care. ' +
      'Appointments cancelled with less than 24 hours of notice are charged in full and cannot be rescheduled.',
  },
};

/* ---------------------------------------------------------------------------
 * Basic rate limiting.
 * Serverless instances are not shared, so this is a best effort guard against
 * a single client hammering the endpoint rather than a global limiter. It is
 * intentionally simple: no database, no external store.
 * ------------------------------------------------------------------------- */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 12;
const hits = new Map();

function rateLimited(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 500) {
    for (const [existingKey, times] of hits) {
      if (!times.length || now - times[times.length - 1] > WINDOW_MS) hits.delete(existingKey);
    }
  }
  return recent.length > MAX_REQUESTS;
}

/* ---------------------------------------------------------------------------
 * Europe/London date helpers.
 * The business rule is that the regular billing date is the first of the month.
 * No calendar date is ever hard coded.
 * ------------------------------------------------------------------------- */
function londonParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const out = {};
  for (const part of parts) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  out.hour = out.hour % 24;
  return out;
}

/* Milliseconds London is ahead of UTC at the given instant. */
function londonOffsetMs(utcMs) {
  const p = londonParts(new Date(utcMs));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - utcMs;
}

/* UTC timestamp for a given local London wall clock time. */
function londonWallClockToUtcMs(year, month, day, hour) {
  const naive = Date.UTC(year, month - 1, day, hour, 0, 0);
  let guess = naive - londonOffsetMs(naive);
  guess = naive - londonOffsetMs(guess);
  return guess;
}

/*
 * Returns null when the subscription should begin immediately, which is the
 * case when Checkout is opened on the first of the month. Renewals then fall
 * naturally on the first of every following month.
 *
 * Otherwise returns the unix timestamp of the next first of the month at
 * 00:05 London time, used as the fallback anchor when the account's API
 * version does not support billing_cycle_anchor_config.
 */
function nextFirstOfMonthUnix(now) {
  const today = londonParts(now);
  if (today.day === 1) return null;

  const year = today.month === 12 ? today.year + 1 : today.year;
  const month = today.month === 12 ? 1 : today.month + 1;
  return Math.floor(londonWallClockToUtcMs(year, month, 1, 0) / 1000) + 300;
}

/* ------------------------------------------------------------------------- */

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return req.body;
}

function sameOrigin(req) {
  const allowed = new Set();
  if (process.env.SITE_URL) {
    try {
      allowed.add(new URL(process.env.SITE_URL).host);
    } catch (error) {
      /* ignore a malformed SITE_URL and fall back to the request host */
    }
  }
  if (req.headers.host) allowed.add(req.headers.host);

  const source = req.headers.origin || req.headers.referer;
  if (!source) return false;

  try {
    return allowed.has(new URL(source).host);
  } catch (error) {
    return false;
  }
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  if (!sameOrigin(req)) {
    return res.status(403).json({ message: 'Request rejected.' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({
      message: 'Too many attempts. Please wait a few minutes, or use the enquiry form.',
    });
  }

  const { serviceId } = readBody(req);
  const service = typeof serviceId === 'string' ? SERVICES[serviceId] : null;

  if (!service) {
    return res.status(400).json({ message: 'That service is not available to buy online.' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env[service.priceEnv];
  const siteUrl = (process.env.SITE_URL || 'https://cgperformance.fit').replace(/\/$/, '');

  /*
   * Two different setup faults, told apart deliberately. A missing secret key
   * breaks every service at once, a missing Price ID breaks only this one, and
   * they are fixed in different places. Neither message reveals a value.
   */
  if (!secretKey) {
    console.error(
      '[checkout] STRIPE_SECRET_KEY is not set in this environment.',
      'Add it in the Vercel dashboard and redeploy. Requested service:', serviceId
    );
    return res.status(503).json({
      message: 'Online payment is not connected yet. Please use the enquiry form and I will arrange it directly.',
    });
  }

  if (!priceId) {
    console.error(
      '[checkout]', service.priceEnv, 'is not set in this environment.',
      'The Stripe key is present, so only this service is affected.'
    );
    return res.status(503).json({
      message: 'This option cannot be bought online yet. Please use the enquiry form and I will arrange it directly.',
    });
  }

  const stripe = new Stripe(secretKey);
  const isSubscription = service.mode === 'subscription';
  const anchorUnix = isSubscription ? nextFirstOfMonthUnix(new Date()) : null;

  const params = {
    mode: service.mode,
    line_items: [
      {
        price: priceId,
        quantity: 1,
        adjustable_quantity: { enabled: false },
      },
    ],
    locale: 'en-GB',
    billing_address_collection: 'required',
    phone_number_collection: { enabled: true },
    consent_collection: { terms_of_service: 'required' },
    custom_text: {
      terms_of_service_acceptance: { message: service.terms },
    },
    allow_promotion_codes: service.allowPromotionCodes,
    metadata: { service_id: serviceId },
    success_url: siteUrl + '/payment-submitted?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: siteUrl + '/#services',
  };

  if (isSubscription) {
    /* Monthly services are collected by Bacs Direct Debit only. */
    params.payment_method_types = ['bacs_debit'];
    params.subscription_data = {
      description: service.description,
      proration_behavior: 'none',
      metadata: { service_id: serviceId },
    };
    params.custom_text.submit = {
      message:
        'Your Direct Debit instruction is submitted to CG Performance Limited. Monthly billing begins on the first of the month.',
    };

    /*
     * Billing date.
     * On the first of the month the subscription starts straight away, so every
     * renewal lands on the first. On any other day the first full billing cycle
     * is moved to the next first of the month with proration switched off, so
     * nothing is charged before that date.
     */
    if (anchorUnix !== null) {
      params.subscription_data.billing_cycle_anchor_config = { day_of_month: 1 };
    }
  } else {
    /*
     * One time purchases use whichever payment methods are enabled in the
     * Stripe Dashboard, so card, Apple Pay and Google Pay all work without
     * anything extra here.
     */
    params.payment_intent_data = { description: service.description };
    params.custom_text.submit = {
      message: 'CG Performance will contact you to arrange your sessions.',
    };
  }

  try {
    let session;
    try {
      session = await stripe.checkout.sessions.create(params);
    } catch (error) {
      /*
       * billing_cycle_anchor_config for Checkout Sessions requires a recent
       * API version. If the account is pinned to an older one, fall back to
       * the explicit timestamp anchor, which has the same effect.
       */
      const unsupported =
        anchorUnix !== null &&
        error &&
        error.type === 'StripeInvalidRequestError' &&
        String(error.param || error.message).includes('billing_cycle_anchor_config');

      if (!unsupported) throw error;

      delete params.subscription_data.billing_cycle_anchor_config;
      params.subscription_data.billing_cycle_anchor = anchorUnix;
      session = await stripe.checkout.sessions.create(params);
    }

    if (!session || !session.url) {
      throw new Error('Stripe did not return a Checkout URL.');
    }

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('[checkout] Stripe error for', serviceId, error && error.message);
    return res.status(502).json({
      message: 'Secure checkout could not be opened. Please try again shortly, or use the enquiry form.',
    });
  }
}

module.exports = handler;

/* Exposed for the local test script only. Not used at runtime. */
module.exports.internals = { SERVICES, nextFirstOfMonthUnix, londonParts };
