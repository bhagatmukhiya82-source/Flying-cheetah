# Production Deployment Playbook

This playbook covers compiling, deploying, and verifying the `flying-cheetah/` production application on **Vercel**, **Supabase**, and **GitHub**.

---

## 1. Local Build & Pre-Flight Verification

From inside `flying-cheetah/`:

```bash
# Install Tailwind CSS CLI dev dependency
npm install

# Compile css/input.css -> css/styles.min.css (minified, zero runtime CDN)
npm run build

# Run core security, challenger, and E2E suites
npm test
node --test tests/e2e/tier1_feature.test.js tests/e2e/tier2_boundary.test.js
node tests/challenger1_404_test.js
node tests/challenger1_founder_branding_test.js
node tests/challenger1_empirical_audit.js
```

All `25` public and portal HTML pages in `flying-cheetah/` load the compiled `css/styles.min.css` stylesheet cleanly with zero dependency on `cdn.tailwindcss.com`.

---

## 2. Vercel Deployment & Environment Configuration

Deploy from the `flying-cheetah/` subdirectory (`outputDirectory: "."`):

```bash
cd flying-cheetah
npx vercel --prod --yes
```

### Routing & Security (`flying-cheetah/vercel.json`)
- **Clean URLs:** `cleanUrls: true`, `trailingSlash: false`
- **Permanent Redirects:** `/home` and `/home.html` &rarr; `/` (`301`)
- **Security Headers Applied to `/(.*)`:**
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Immutable Static Caching:** `Cache-Control: public, max-age=31536000, immutable` on `/images/*` and `/videos/*` (with `Accept-Ranges: bytes` & `video/mp4` streaming headers).

### Environment Variables (`.env.example` Blueprint)
Configure secrets exclusively inside **Vercel Project Settings &rarr; Environment Variables** (never commit `.env*` files):

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `JWT_SECRET` | Yes (Prod) | Signing/verifying HS256 admin & session JWT tokens |
| `INITIAL_ADMIN_PASSWORD` | Yes | Seed password for initial agency administrator account |
| `FOUNDER_NOTIFY_EMAIL` | Yes | Inbound notification target (`flyingcheetah.agency@gmail.com`) |
| `SUPABASE_URL` | Yes | Supabase PostgreSQL REST base URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase public anonymous key for RLS REST calls |
| `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT` | Optional | Native TLS (`465`) transactional mail transport |
| `BORZO_AUTH_TOKEN`, `BORZO_ENV` | Optional | Borzo Business v1.8 courier API (`test` or `production`; defaults to sandbox simulation if omitted or `MOCK*`) |
| `RESEND_API_KEY`, `FROM_EMAIL` | Optional | Secondary transactional email fallback |

---

## 3. Production Hygiene (`.vercelignore`)

`flying-cheetah/.vercelignore` prevents heavyweight local reference files, tests, schemas, and secrets from being bundled into Vercel deployments:
- Excludes `*.pdf`, `*.pptx`, `*.docx`, `*.msi`, `*.exe`, `blender*`, `tests/`, `*.test.js`, `*.sql`, `.env*`, `client_secret*.json`, and root-anchored `/*.mp4` (while preserving web video assets inside `/videos/*.mp4`).

---

## 4. Supabase PostgreSQL Tables & Cold-Start Keep-Alive

Required database tables:
- `profiles` — Merchant & admin accounts (`password_hash`, trial timestamps, business metadata)
- `leads_inquiries` — Public audit/consultation submissions & admin status tracking
- `demo_bookings` — 1-on-1 architecture walkthrough bookings
- `fleet_orders` — Hyperlocal dispatch logs & live courier GPS coordinates
- `password_reset_otps` — Persistent OTP records paired with `fc_store_password_otp` and `fc_verify_and_update_password` RPCs

A scheduled workflow in [`.github/workflows/supabase-keep-alive.yml`](../.github/workflows/supabase-keep-alive.yml) pings Supabase periodically to avoid free-tier project pausing.

---

## 5. Post-Deploy Smoke Checklist

1. `GET https://flying-cheetah.vercel.app/api/health` &rarr; HTTP `200`, `status: "healthy"`
2. `GET https://flying-cheetah.vercel.app/api/leads` (no auth header) &rarr; HTTP `401`
3. `GET https://flying-cheetah.vercel.app/nonexistent-route-check` &rarr; HTTP `404` serving `404.html`
4. Verify CSS (`css/styles.min.css`) and key pure-white showcase assets return HTTP `200`.
