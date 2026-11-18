# Serverless REST API Reference

Flying Cheetah Labs exposes production Vercel Serverless Node.js endpoints under `flying-cheetah/api/*.js`, with clean URL rewrites defined in `flying-cheetah/vercel.json`.

---

## Base URL & Clean Route Rewrites

- **Production Base URL:** `https://flying-cheetah.vercel.app`
- **Health Rewrite:** `GET /health` &rarr; `/api/health`
- **Versioned Rewrites (`/api/v1/*`):**
  - `/api/v1/auth/:path*` &rarr; `/api/auth?action=:path*`
  - `/api/v1/leads` &rarr; `/api/leads`
  - `/api/v1/demos` &rarr; `/api/demos`
  - `/api/v1/fleet` &rarr; `/api/fleet`
  - `/api/v1/telemetry` &rarr; `/api/telemetry`

All endpoints configure CORS (`Access-Control-Allow-Origin: *`) and respond to `OPTIONS` preflight with `200 OK`.

---

## 1. System Readiness & Telemetry

### `GET /api/health` (or `GET /health`)
Returns service liveliness, version, and cluster metadata.

```json
{
  "status": "healthy",
  "service": "flying-cheetah-api",
  "version": "1.0.0",
  "environment": "production",
  "cluster": "mumbai-central-1",
  "uptime_seconds": 12,
  "timestamp": "2026-11-18T04:35:00.000Z"
}
```

### `GET /api/telemetry` (or `GET /api/v1/telemetry`)
Queries exact row counts from Supabase `leads_inquiries`, `fleet_orders`, and `demo_bookings` (with operational baseline fallbacks) alongside conversion benchmarks.

```json
{
  "status": "operational",
  "cluster": "mumbai-central-1",
  "metrics": {
    "total_leads_captured": 142,
    "total_demos_booked": 89,
    "total_fleet_dispatches": 318,
    "total_ai_voice_calls": 512,
    "avg_mumbai_eta_mins": 17.8,
    "cod_verification_accuracy_pct": 99.1,
    "whatsapp_open_rate_pct": 98.6,
    "cart_recovery_roi_multiplier": 5.2,
    "storefront_p95_latency_ms": 32.0
  }
}
```

---

## 2. Authentication & Identity (`/api/auth`)

Implemented in `flying-cheetah/api/auth.js` using HS256 JWTs (`api/_auth.js`) and `crypto.scryptSync` salted password hashes (with legacy hash migration support). Action routing uses `?action=<name>` or `/api/v1/auth/<name>`.

| Action | Method | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `register-trial` | `POST` | Public | Creates merchant account with 14-day trial & JWT |
| `login` | `POST` | Public | Verifies credentials & upgrades legacy password hashes to `scrypt` |
| `me` | `GET` | `Bearer <jwt>` | Returns active user identity claims |
| `forgot-password` | `POST` | Public | Generates OTP, persists via `fc_store_password_otp`, sends email |
| `reset-password` | `POST` | Public | Consumes OTP & updates password via `fc_verify_and_update_password` |
| `request-change-password-otp` | `POST` | `Bearer <jwt>` | Dispatches authenticated password-change OTP |
| `change-password` | `POST` | `Bearer <jwt>` | Verifies OTP and updates password hash |
| `profile` | `POST`/`PUT`/`PATCH` | `Bearer <jwt>` | Updates merchant metadata (UPI ID, business name, phone) |
| `google-callback` | `POST` | Public | Enforces strict OAuth payload verification (`403` on unverified tokens) |

---

## 3. Leads CRM (`/api/leads`)

Implemented in `flying-cheetah/api/leads.js`:

### `POST /api/leads` — Public Lead Ingestion
- **Required fields:** `name`, `email`, `phone` (returns `400 Bad Request` when missing).
- **Optional fields:** `service` (or `service_interested`), `message`, `source_page`.
- **Honeypot Protection:** Requests specifying `honeypot` or `website_url` short-circuit cleanly (`201`, `id: "bot-filtered"`) without database insertion.
- **Database Behavior:** Inserts into Supabase `leads_inquiries`; returns `201 Created` on persistence and triggers an asynchronous SMTPS alert via `_mailer.js`. Returns `502 Bad Gateway` if upstream database persistence fails.

### `GET /api/leads` & `PATCH /api/leads` — Admin Protected
- Requires valid admin JWT (`Authorization: Bearer <token>`, verified by `verifyAdmin`); unauthenticated or non-admin tokens receive `401`/`403`.
- `GET` returns `{ total, page: 1, size: 50, items }`.
- `PATCH` updates `status` (e.g., `"contacted"`) for the specified `id` (`400` if missing `id`, `404` if not found).

---

## 4. Demo Bookings (`/api/demos`)

Implemented in `flying-cheetah/api/demos.js`:
- **`POST /api/demos`:** Public booking creation validating `name`, `email`, `phone` (`400` on missing fields, honeypot guard for `honeypot`/`company_url`), persists to Supabase `demo_bookings` (`201 Created`, or `502` on DB failure), and emails sanitized summary via `_mailer.js`.
- **`GET /api/demos`:** Admin JWT protected (`verifyAdmin`), returns `{ total, items }` ordered by `created_at.desc`.

---

## 5. Hyperlocal Logistics (`/api/fleet` & `/api/borzo-dispatch`)

### `POST /api/borzo-dispatch`
Supports `action: "calculate"` (`200 OK`) and `action: "create"` (`201 Created`) against **Borzo Business API v1.8**:
- Uses live `https://robot-in.borzodelivery.com/api/business/1.8` when `BORZO_ENV=production` or `https://robotapitest-in.borzodelivery.com/api/business/1.8` in `test`.
- Automatically enters **zero-config sandbox mode** (`environment: "sandbox_simulation"`) when `BORZO_AUTH_TOKEN` is unset or starts with `MOCK`, returning realistic Mumbai rider assignment (`tracking_number`, `delivery_otp`, `eta_minutes`, `delivery_fee_inr`).

```bash
curl -X POST https://flying-cheetah.vercel.app/api/borzo-dispatch \
  -H "Content-Type: application/json" \
  -d '{"action":"calculate","order_ref":"FC-TEST-101"}'
```

### `POST /api/fleet` & `GET /api/fleet`
Creates simulated/live hyperlocal courier dispatches (writing to Supabase `fleet_orders` when configured) and retrieves order tracking coordinates by `?order_ref=...` or `/track/:order_ref`.

---

## 6. Transactional Mailer (`/api/send-email`)

Implemented in `flying-cheetah/api/send-email.js` (Accepts `POST` only; returns `405` otherwise):
- Supports `type`: `"lead_submission"`, `"otp_verification"`, and `"login_alert"`.
- Escapes HTML entities (`escapeHtml`) and strips CR/LF header injection (`sanitizeHeader`) via `api/_mailer.js` before delivering over TLS port `465` (`rejectUnauthorized: true`) with optional Resend fallback.
