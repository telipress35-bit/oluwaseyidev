// POST /api/contact
// Sends a portfolio enquiry to Moses through the Brevo transactional email API.
// Required env vars (set in Vercel → Project → Settings → Environment Variables):
//   BREVO_API_KEY   your Brevo API key (xkeysib-...)
//   CONTACT_TO      where enquiries go, e.g. kavodcom2009@gmail.com
//   CONTACT_FROM    a sender email VERIFIED in Brevo (Senders & IPs)

const TYPES = new Set([
  'Fintech / payments app',
  'Mobile app',
  'Dashboard / admin panel',
  'API & integrations',
  'Security review',
  'Something else',
]);

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

// Best-effort rate limit: 5 sends per IP per 10 minutes (per warm instance).
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_HITS;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { BREVO_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env;
  if (!BREVO_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    console.error('contact: missing env vars');
    return res.status(500).json({ ok: false, error: 'Email is not configured yet.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot: real people never fill this hidden field.
  if (clean(body.company, 200)) return res.status(200).json({ ok: true });

  const name = clean(body.name, 100);
  const email = clean(body.email, 254);
  const type = TYPES.has(body.type) ? body.type : 'Something else';
  const message = clean(body.message, 5000);

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Please add your name, email and a short description.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'That email address looks incomplete.' });
  }
  if (message.length < 10) {
    return res.status(400).json({ ok: false, error: 'Please tell me a little more about the project.' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'Too many messages. Please try again in a few minutes.' });
  }

  const subject = `Portfolio enquiry: ${type} from ${name}`;
  const text = `New enquiry from oluwaseyidev.vercel.app\n\nName: ${name}\nEmail: ${email}\nProject type: ${type}\n\n${message}\n`;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1D1B16">
      <p style="margin:0 0 12px;color:#1F5A43;font-weight:bold">New enquiry from your portfolio</p>
      <table style="border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:2px 12px 2px 0;color:#5A5447">Name</td><td><b>${escapeHtml(name)}</b></td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#5A5447">Email</td><td>${escapeHtml(email)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#5A5447">Project</td><td>${escapeHtml(type)}</td></tr>
      </table>
      <div style="white-space:pre-wrap;background:#F4EDDF;padding:14px;border-radius:8px">${escapeHtml(message)}</div>
      <p style="margin-top:16px;color:#5A5447;font-size:13px">Hit Reply to answer ${escapeHtml(name)} directly.</p>
    </div>`;

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'OluwaseyiDev Portfolio', email: CONTACT_FROM },
        to: [{ email: CONTACT_TO, name: 'Moses Afolabi' }],
        replyTo: { email, name },
        subject,
        textContent: text,
        htmlContent: html,
        tags: ['portfolio-contact'],
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('contact: brevo error', r.status, detail.slice(0, 500));
      return res.status(502).json({ ok: false, error: 'The message could not be sent right now.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact: request failed', err && err.message);
    return res.status(502).json({ ok: false, error: 'The message could not be sent right now.' });
  }
};
