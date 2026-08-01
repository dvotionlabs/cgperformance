/*
 * Minimal local server for testing the static site without the Vercel CLI.
 * Mimics vercel.json clean URLs and redirects, and stubs the two API routes so
 * the purchase and enquiry flows can be exercised without Stripe or Resend.
 *
 *   node tests/dev-server.js   then open http://localhost:4321
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

const REDIRECTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).redirects;

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost:4321');
    let pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith('/api/')) {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        console.log('API', pathname, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (pathname === '/api/create-subscription-checkout') {
          res.end(JSON.stringify({ url: '/payment-submitted?stub=1' }));
        } else {
          res.end(JSON.stringify({ ok: true }));
        }
      });
      return;
    }

    const hit = REDIRECTS.find((r) => r.source === pathname);
    if (hit) {
      res.writeHead(308, { Location: hit.destination });
      return res.end();
    }

    if (pathname === '/') pathname = '/index.html';
    let file = path.join(ROOT, pathname);
    if (!path.extname(file) && fs.existsSync(file + '.html')) file += '.html';

    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(ROOT, '404.html')));
    }

    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  })
  .listen(4321, () => console.log('listening on 4321'));
