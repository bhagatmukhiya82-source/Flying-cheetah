# Security Architecture & Testing Pyramid

Flying Cheetah Labs enforces strict defense-in-depth controls across client JavaScript, Vercel HTTP headers, cryptographic authentication, transactional mail delivery, and automated CI/E2E verification suites.

---

## 1. Security Controls

### Cryptographic Auth & Sessions (`flying-cheetah/api/_auth.js`)
- **Strict Secret Enforcement (`getJwtSecret`):** Throws immediately when `JWT_SECRET` or `SECRET_KEY` is missing in strict mode — zero hardcoded JWT signing keys.
- **Constant-Time Verification (`verifyJwt`):** Computes HMAC-SHA256 signatures and verifies tokens with `crypto.timingSafeEqual` alongside strict `exp` expiration checking.
- **Salted `scrypt` Passwords & Migration (`hashPasswordScrypt`, `verifyPassword`):** Hashes credentials with unique 16-byte random salts (`crypto.scryptSync`); legacy SHA-256 credentials verify once and automatically trigger `needsRehash: true` upgrades to `scrypt` inside `api/auth.js`.
- **Fail-Closed Admin Guards (`verifyAdmin`):** Protected admin endpoints (`GET`/`PATCH /api/leads`, `GET /api/demos`) strictly require a valid admin JWT (`401 Unauthorized` when missing/invalid).
- **OAuth Guard:** `action=google-callback` rejects unverified OAuth token payloads with `HTTP 403`.

### Transactional Mail & Input Sanitization (`flying-cheetah/api/_mailer.js`)
- **XSS Control Escaping (`escapeHtml`):** Encodes `&`, `<`, `>`, `"`, `'` across all dynamically interpolated customer names, messages, and service strings inside HTML emails.
- **SMTP Header Injection Prevention (`sanitizeHeader`):** Strips `\r` and `\n` sequences from headers and subject lines.
- **Strict TLS Certificate Pinning:** Enforces `rejectUnauthorized: true` on direct port `465` SMTPS sockets and gracefully skips delivery without crashing when `SMTP_USER`/`SMTP_PASS` are absent.

### Database Fail-Closed Semantics & Anti-Spam
- **Honeypot Filtering:** Hidden bot trap fields (`honeypot`, `website_url`, `company_url`) cleanly short-circuit spam before database insertion.
- **Upstream Failure Visibility:** Failed Supabase writes return structured `502 Bad Gateway` JSON errors rather than leaking stack traces or faking `201` success objects.

---

## 2. Multi-Layer Automated Test Pyramid (`flying-cheetah/tests/`)

| Suite | Focus Area | Run Command |
| :--- | :--- | :--- |
| `m1_backend_security.test.js` | `_auth.js`, `_mailer.js`, TLS `rejectUnauthorized`, JWT timing safety, XSS & CRLF escaping | `npm test` |
| `m3_challenger_adversarial.test.js` & `m3_challenger_test.js` | Adversarial boundary probes, auth guards, asset existence across 51 showcase/brand files | `npm test` |
| `e2e/tier3_cross_feature.test.js` | Pairwise interactions (DB outage `502`, CORS preflight + `401`, scrypt upgrade, `.vercelignore`, SEO schema) | `npm test` |
| `e2e/tier4_scenarios.test.js` | Full user journeys: inbound lead, admin lifecycle, mobile drawer vs WA widget collision, store dispatch, indexing | `npm test` |
| `e2e/tier1_feature.test.js` & `e2e/tier2_boundary.test.js` | Comprehensive feature & boundary contracts across all pages, forms, founders metadata, SEO & JSON-LD | `node --test tests/e2e/tier1_feature.test.js tests/e2e/tier2_boundary.test.js` |
| `challenger1_404_test.js` | HTML tag balance, responsive drawer button, recovery CTAs, and `css/styles.min.css` import check on `404.html` | `node tests/challenger1_404_test.js` |
| `challenger1_founder_branding_test.js` | SHA-256 parity (`bhagat.jpg`, `Yash.jpg`), exact disk case sensitivity, HTTPS LinkedIn links, zero placeholder text | `node tests/challenger1_founder_branding_test.js` |
| `challenger1_empirical_audit.js` | 30 empirical checks: compiled CSS integrity, `0` CDN scripts, 15/15 service audit modal wiring, auth runtime, zero hardcoded VPAs | `node tests/challenger1_empirical_audit.js` |

### Latest Verified Run Results
- **`npm test`:** `64/64` passed (`0` failed, `0` skipped)
- **`tier1_feature.test.js` + `tier2_boundary.test.js`:** `220/221` passed (`0` failed; `1` pre-existing Milestone 3 baseline skip on `F19.4` secondary mobile header optimization)
- **`challenger1_empirical_audit.js`:** `30/30` passed (`0` failed)
- **`challenger1_404_test.js` & `challenger1_founder_branding_test.js`:** All checks passed
