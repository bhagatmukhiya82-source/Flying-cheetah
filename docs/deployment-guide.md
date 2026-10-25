# 🚀 Production Deployment Playbook

This guide details how Flying Cheetah Labs is deployed across **Vercel** (Global CDN Frontend), **Supabase** (Postgres DB & Auth), and **Render / Railway / Docker** (FastAPI & Celery Backend).

---

## 🌐 1. Frontend: Vercel CDN

The frontend consists of 23 static, responsive pages styled with Tailwind CSS, SVG telemetry components, and vanilla JS widgets.

### Automatic Deployment
```bash
cd flying-cheetah
npx vercel --prod --yes
```

### Production Routing Configuration (`vercel.json`)
```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

## 🗄️ 2. Database: Supabase PostgreSQL

### Schema Deployment (`migrations/001_initial_schema.sql`)
1. Open your Supabase Dashboard: `https://txqtkpxdyoatzdgkcsry.supabase.co`
2. Navigate to **SQL Editor**.
3. Execute the initial migration schema creating:
   - `profiles`
   - `leads_inquiries`
   - `demo_bookings`
   - `fleet_orders`
4. Row-Level Security (RLS) is automatically enabled with authenticated read/write policies.

---

## 📊 3. Real-Time Google Sheet Sync

1. Create a Google Sheet named **"Flying Cheetah Leads"**.
2. Go to **Extensions ➔ Apps Script**.
3. Paste the webhook code and deploy as **Web App** (Access: Anyone).
4. Run `formatMySheet` to apply automated styling (Zebra striping, Inter typography, 38px rows).
5. Current Live Webhook URL:
   `https://script.google.com/macros/s/AKfycbwJ6cvX2sJ2wPMORyZCTWv3HRicUWe3B2_CS-Z5IZVQu-sBrqbl69c8XyMNt1eL4Bln/exec`

---

## ⚙️ 4. Backend: Docker & FastAPI

### Local / Production Docker Compose
```bash
cd backend
docker-compose up --build -d
```

### Services Started:
- **FastAPI Core**: `http://localhost:8000`
- **Redis Broker**: `localhost:6379`
- **Celery Worker**: Distributed background task execution
- **Celery Beat**: Periodic scheduled tasks (trial expiry, automated cart recovery reminders)
