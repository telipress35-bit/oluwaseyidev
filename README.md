# OluwaseyiDev

Portfolio of **Moses Afolabi**, full-stack and fintech developer in Akure, Nigeria.

**Live:** https://oluwaseyidev.vercel.app

## What's here

| Path | What it is |
|---|---|
| `index.html` | The whole site: hero, about, work, engineering highlights, skills, services, contact |
| `api/contact.js` | Vercel serverless function that emails contact-form messages through Brevo |
| `og-image.jpg` | Preview card shown when the link is shared |
| `robots.txt`, `sitemap.xml` | Search engine files |
| `google38b4e5a9ba9e4490.html` | Google Search Console verification. **Do not delete.** |
| `vercel.json` | Clean URLs, caching and security headers |

No build step and no dependencies. It's plain HTML, CSS and JavaScript.

## Deploy

```bash
vercel --prod
```

The contact form needs three environment variables in Vercel (Project → Settings → Environment Variables):

| Name | Value |
|---|---|
| `BREVO_API_KEY` | Brevo API key |
| `CONTACT_TO` | Inbox that receives enquiries |
| `CONTACT_FROM` | A sender email verified in Brevo |

Never commit these values. `.env` files are ignored.

## Contact

- Email: kavodcom2009@gmail.com
- WhatsApp: +234 813 575 5379
- LinkedIn: https://www.linkedin.com/in/moses-afolabi-0a8396323
- X: https://x.com/dev_oluwaseyi
