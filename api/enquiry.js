/*
 * CG Performance | Enquiry form handler
 * -------------------------------------
 * Receives the enquiry form and emails it to the CG Performance inbox using
 * Resend. Nothing is stored: there is no database and no third party form
 * service holding client details.
 *
 * Environment variables (set in the Vercel dashboard, never in the repository):
 *   RESEND_API_KEY   required, from https://resend.com
 *   ENQUIRY_TO       optional, defaults to the address below
 *   ENQUIRY_FROM     optional, defaults to Resend's shared test sender
 *   SITE_URL         optional, used for the same origin check
 *
 * Works with JavaScript enabled (fetch, JSON in and JSON out) and without it
 * (a normal form post that answers with a redirect to the thank you page).
 */

const DEFAULT_TO = 'chrisgkoufas.performance@gmail.com';
const DEFAULT_FROM = 'CG Performance Website <onboarding@resend.dev>';

const FIELDS = [
  ['name', 'Full name'],
  ['email', 'Email address'],
  ['phone', 'Telephone'],
  ['service', 'Service of interest'],
  ['location', 'Preferred location'],
  ['frequency', 'Preferred training frequency'],
  ['goals', 'Current goals'],
  ['routine', 'Current training routine'],
  ['availability', 'General availability'],
  ['message', 'Message'],
];

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 6;
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

function readBody(req) {
  const body = req.body;
  if (!body) return {};
  if (typeof body === 'object') return body;

  if (typeof body === 'string') {
    const type = String(req.headers['content-type'] || '');
    if (type.includes('application/json')) {
      try {
        return JSON.parse(body);
      } catch (error) {
        return {};
      }
    }
    return Object.fromEntries(new URLSearchParams(body));
  }
  return {};
}

function sameOrigin(req) {
  const allowed = new Set();
  if (process.env.SITE_URL) {
    try {
      allowed.add(new URL(process.env.SITE_URL).host);
    } catch (error) {
      /* ignore a malformed SITE_URL */
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

function clean(value, limit) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit || 2000);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const wantsJson = String(req.headers.accept || '').includes('application/json');

  function fail(statusCode, message) {
    if (wantsJson) return res.status(statusCode).json({ message });
    return res.status(statusCode).send(message);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(405, 'Method not allowed.');
  }

  if (!sameOrigin(req)) {
    return fail(403, 'Request rejected.');
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return fail(429, 'Too many enquiries have been sent from this connection. Please try again later.');
  }

  const body = readBody(req);

  /* Honeypot. Silently accept so a bot does not learn anything useful. */
  if (clean(body.company)) {
    if (wantsJson) return res.status(200).json({ ok: true });
    res.setHeader('Location', '/enquiry-success');
    return res.status(303).end();
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 160);
  const goals = clean(body.goals, 2000);
  const consent = clean(body.consent, 10);

  if (!name || !email || !goals || !consent) {
    return fail(400, 'Please complete your name, email address, goals and the consent checkbox.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return fail(400, 'Please enter a valid email address.');
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[enquiry] RESEND_API_KEY is not set, the enquiry could not be delivered.');
    return fail(503, 'The enquiry form is not connected yet. Please email chrisgkoufas.performance@gmail.com directly.');
  }

  const rows = FIELDS.map(([key, label]) => [label, clean(body[key], 2000)]).filter(
    ([, value]) => value !== ''
  );

  const text = rows.map(([label, value]) => label + ': ' + value).join('\n') +
    '\n\nConsent to be contacted: yes\nSent from cgperformance.fit';

  const html =
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#16150f">' +
    '<h2 style="margin:0 0 16px;font-size:17px">New enquiry from cgperformance.fit</h2>' +
    '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
    rows
      .map(
        ([label, value]) =>
          '<tr><td style="padding:6px 18px 6px 0;vertical-align:top;color:#86827a;white-space:nowrap">' +
          escapeHtml(label) +
          '</td><td style="padding:6px 0;vertical-align:top">' +
          escapeHtml(value) +
          '</td></tr>'
      )
      .join('') +
    '</table>' +
    '<p style="margin:18px 0 0;color:#86827a;font-size:13px">Consent to be contacted: yes</p>' +
    '</div>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.ENQUIRY_FROM || DEFAULT_FROM,
        to: [process.env.ENQUIRY_TO || DEFAULT_TO],
        reply_to: email,
        subject: 'Enquiry: ' + (clean(body.service, 80) || 'General Enquiry') + ' from ' + name,
        text: text,
        html: html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('[enquiry] Resend responded', response.status, detail.slice(0, 500));
      return fail(502, 'Your enquiry could not be sent. Please email chrisgkoufas.performance@gmail.com directly.');
    }
  } catch (error) {
    console.error('[enquiry] Delivery failed:', error && error.message);
    return fail(502, 'Your enquiry could not be sent. Please email chrisgkoufas.performance@gmail.com directly.');
  }

  if (wantsJson) return res.status(200).json({ ok: true });
  res.setHeader('Location', '/enquiry-success');
  return res.status(303).end();
};
