# 🔌 REST API & WebSocket Reference

The Flying Cheetah platform exposes production REST APIs and real-time WebSocket channels for merchants, mobile clients, and autonomous back-office agents.

---

## 🌐 Base URLs

| Environment | Base URL |
| ----------- | -------- |
| **Production CDN** | `https://flying-cheetah.vercel.app` |
| **Backend API Core** | `http://localhost:8000/api/v1` |
| **WebSocket Telemetry** | `ws://localhost:8000/ws/telemetry` |
| **WebSocket Inbox** | `ws://localhost:8000/ws/inbox` |

---

## 📌 Authentication Endpoints

### `POST /auth/register`
Creates a new merchant profile with 14-day zero-cost trial.

#### Request Body
```json
{
  "email": "merchant@brand.com",
  "full_name": "Arjun Sharma",
  "business_name": "Mumbai Artisanal Roasters",
  "phone": "+91 98200 12345"
}
```

#### Response (`201 Created`)
```json
{
  "id": "usr_91fa82b4",
  "email": "merchant@brand.com",
  "trial_active": true,
  "trial_expires_at": "2026-11-08T23:59:59Z",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

---

## 📥 Leads & Demo Bookings

### `POST /leads`
Captures inbound merchant audits, sales inquiries, and agency consultation requests.

#### Request Body
```json
{
  "name": "Rajesh Singhania",
  "email": "rajesh@fashionhub.in",
  "phone": "+91 99203 86421",
  "company": "Singhania Silk Mills",
  "service": "WhatsApp Commerce & Hyperlocal Dispatch",
  "source": "Vercel Production Storefront"
}
```

#### Dual-Sync Dispatch
1. **Supabase DB**: Inserts into `public.leads_inquiries`.
2. **Google Sheet**: POST to Google Apps Script Webhook (`200 OK`).
3. **Email Notification**: FormSubmit alert to `flyingcheetah.agency@gmail.com`.

---

## 🛵 Fleet Logistics & Dispatch

### `POST /fleet/dispatch`
Triggers instant courier pickup via Borzo or Porter API.

#### Request Body
```json
{
  "order_id": "ORD_20261025_981",
  "courier_provider": "BORZO",
  "pickup_address": "Shop 14, Opera House, Mumbai 400004",
  "dropoff_address": "Tower 2, Marine Drive, Mumbai 400020",
  "package_weight_kg": 1.5,
  "cod_amount": 0.0
}
```

#### Response (`200 OK`)
```json
{
  "tracking_id": "BRZ_MUM_948210",
  "courier_status": "RIDER_ASSIGNED",
  "rider_name": "Suresh Patil",
  "rider_phone": "+91 98199 44321",
  "eta_pickup_minutes": 5.2,
  "live_tracking_url": "https://borzodelivery.com/track/BRZ_MUM_948210"
}
```

---

## 📊 Real-Time WebSockets

### `GET /ws/telemetry`
Streams live GMV ticker, order attribution, and AI recovery metrics at 1-second intervals.

```json
{
  "type": "TELEMETRY_UPDATE",
  "monthly_gmv": 4820000,
  "daily_revenue": 168400,
  "profit_surge_pct": 42.5,
  "roas": 4.8,
  "active_riders_online": 48,
  "whatsapp_response_rate": 98.4
}
```
