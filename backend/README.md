# ⚡ FLYING CHEETAH LABS — PRODUCTION BACKEND ARCHITECTURE

Enterprise Autonomous AI Commerce & Omnichannel Marketing Backend Engine powering 20 frontend pages, 18-minute Mumbai hyperlocal dispatch, bilingual AI voice verification calls, and automated WhatsApp/Instagram shopping workflows.

---

## 🏛️ Architecture Overview

```
                                      [ FRONTEND CLIENTS (20 Pages) ]
                                                     │
                                       HTTPS / WSS   │  REST + WebSockets
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │   FastAPI Web Application   │
                                      │    (Python 3.11+, ASGI)     │
                                      └──────┬───────────────┬──────┘
                                             │               │
                     ┌───────────────────────┘               └───────────────────────┐
                     ▼                                                               ▼
        ┌─────────────────────────┐                                     ┌─────────────────────────┐
        │  Supabase PostgreSQL 16 │                                     │   Redis 7 + Celery      │
        │   (RLS, Pools, JSONB)   │                                     │  (Async Workers & Beat) │
        └─────────────────────────┘                                     └────────────┬────────────┘
                     │                                                               │
                     │                                            ┌──────────────────┼──────────────────┐
                     ▼                                            ▼                  ▼                  ▼
        ┌─────────────────────────┐                           ┌────────┐        ┌─────────┐        ┌─────────┐
        │ Real-Time WebSockets    │                           │15-min  │        │5-minute │        │14-Day   │
        │ /ws/inbox /ws/telemetry │                           │Cart    │        │COD Voice│        │Trial    │
        └─────────────────────────┘                           │Recovery│        │Verify   │        │Expiry   │
                                                              └────────┘        └─────────┘        └─────────┘
```

---

## 🚀 Key Integrations & Third-Party APIs

| Service | Protocol / API | Purpose |
|---|---|---|
| **Meta Graph API v21.0** | WhatsApp Cloud API | Interactive abandoned cart recovery, automated order status notifications, and 2-way live chat. |
| **Meta Instagram Graph** | Webhooks & Messaging API | Instant auto-reply to Reel comments and automatic DM checkout link dispatch. |
| **Twilio / Exotel SIP Trunk** | Deepgram + Polly / ElevenLabs | Automated bilingual (Hindi + English) voice agent calls to confirm COD orders in real time. |
| **Borzo API v2** | Hyperlocal Courier REST | 18-minute on-demand motorcycle courier dispatch across Mumbai / MMR. |
| **Porter API** | Fleet Delivery REST | Same-day 2-wheeler, 3-wheeler, and mini-truck bulk dispatch. |
| **Razorpay / Cashfree** | Dynamic UPI Intent API | 1-tap WhatsApp and Web payment generation with automatic webhook reconciliation. |
| **n8n Automation Engine** | Inbound Webhooks | Instant lead dispatch to agency CRM, Google Sheets, and slack alerts. |
| **Email Dispatcher** | SMTP / BackgroundTasks | Immediate transaction alerts to `flyingcheetah.agency@gmail.com`. |

---

## 📂 Project Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py            # Trial signup, login, Google OAuth, me
│   │   │   │   ├── leads.py           # Lead capture, honeypot, admin management
│   │   │   │   ├── demos.py           # Demo booking, calendar slots, WhatsApp alerts
│   │   │   │   ├── webhooks.py        # Meta WhatsApp & Instagram, Courier GPS updates
│   │   │   │   ├── voice.py           # Twilio COD verification triggers & TwiML speech
│   │   │   │   ├── fleet.py           # Borzo / Porter dispatch & live GPS tracking
│   │   │   │   └── telemetry.py       # Aggregated platform KPIs & latency stats
│   │   │   └── router.py              # Assembles all API v1 endpoints
│   │   └── websockets/
│   │       ├── manager.py             # Central WebSocket connection & broadcast manager
│   │       ├── inbox_ws.py            # Live omnichannel support chat (/ws/inbox)
│   │       └── telemetry_ws.py        # Real-time GPS & platform telemetry (/ws/telemetry)
│   ├── core/
│   │   ├── config.py                  # Pydantic BaseSettings & env resolution
│   │   ├── database.py                # SQLAlchemy 2.0 async engine & sessionmaker
│   │   └── security.py                # JWT auth, bcrypt passwords, Meta HMAC-SHA256
│   ├── models/                        # SQLAlchemy database models
│   │   ├── user.py                    # Profile (users & trials)
│   │   ├── lead.py                    # LeadInquiry
│   │   ├── demo.py                    # DemoBooking
│   │   ├── message.py                 # OmnichannelMessage
│   │   ├── voice.py                   # AIVoiceCall
│   │   ├── fleet.py                   # FleetOrder
│   │   └── audit.py                   # StorefrontSpeedAudit & AuditLog
│   ├── schemas/                       # Pydantic v2 validation models
│   │   ├── auth_schema.py
│   │   ├── lead_schema.py
│   │   ├── demo_schema.py
│   │   ├── webhook_schema.py
│   │   ├── voice_schema.py
│   │   └── fleet_schema.py
│   ├── services/                      # Enterprise service drivers (Dual-mode: Prod / Mock)
│   │   ├── meta_whatsapp.py           # WhatsApp Cloud API v21.0 driver
│   │   ├── meta_instagram.py          # Instagram Graph API comment & DM automation
│   │   ├── voice_agent.py             # Bilingual voice agent & TwiML generator
│   │   ├── courier_borzo.py           # Borzo 18-minute hyperlocal Mumbai dispatch
│   │   ├── courier_porter.py          # Porter 2-wheeler / mini-truck dispatch
│   │   ├── payment_upi.py             # Razorpay / Cashfree UPI Intent generator
│   │   └── email_service.py           # SMTP alerts & n8n webhook triggers
│   ├── workers/                       # Celery asynchronous task workers
│   │   ├── celery_app.py              # Celery instance configuration & beat schedule
│   │   ├── cart_recovery_worker.py    # 15-minute abandoned cart recovery worker
│   │   ├── cod_verification_worker.py # 5-minute automated COD voice caller worker
│   │   └── trial_expiry_worker.py     # Daily 14-day trial monitor & WhatsApp alert cron
│   └── main.py                        # FastAPI application factory, CORS & lifespans
├── migrations/
│   └── 001_initial_schema.sql         # Supabase PostgreSQL 16 DDL with RLS & Triggers
├── tests/                             # Comprehensive automated pytest test suite
│   ├── conftest.py                    # Async test client & database fixtures
│   ├── test_auth.py                   # Trial registration, login, and auth guard tests
│   ├── test_leads.py                  # Lead ingestion, honeypot filter, admin CRUD tests
│   ├── test_fleet.py                  # Borzo dispatch and live tracking tests
│   └── test_webhooks.py               # Meta signature verification and webhook tests
├── .env.example                       # Production environment configuration template
├── Dockerfile                         # Production multi-stage slim container
├── docker-compose.yml                 # Multi-service stack (API, Celery, Postgres, Redis)
└── requirements.txt                   # Complete locked dependencies
```

---

## 🛠️ Quickstart (Local Development)

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# By default, DATABASE_URL uses SQLite (sqlite+aiosqlite:///./flying_cheetah.db)
# for zero-config local testing without requiring external servers.
```

### 3. Launch Development Server
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health Probe: `http://localhost:8000/health`

### 4. Run Automated Test Suite
```bash
python -m pytest tests/ -v
```

---

## 🐳 Running with Docker Compose

To boot the entire production stack including PostgreSQL 16, Redis 7, Celery Workers, Celery Beat, and FastAPI:

```bash
cd backend
docker-compose up --build -d
```

Check running services:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f web
docker-compose logs -f celery_worker
```

---

## 🛡️ PostgreSQL Migration & Row Level Security (RLS)

The database schema in `migrations/001_initial_schema.sql` includes:
- **UUID primary keys** across all entities.
- **Row Level Security (RLS)** policies restricting access:
  - Leads & Demo bookings can be inserted by anonymous public users, but viewed only by authenticated admins.
  - User profiles can be viewed and edited only by their respective owner or admins.
  - Fleet tracking data can be queried by order reference or admin credentials.
- **Auto-updating `updated_at` triggers** for audit integrity.
