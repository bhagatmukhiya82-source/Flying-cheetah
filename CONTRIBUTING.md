# Contributing to Flying Cheetah Labs

Thank you for your interest in contributing to **Flying Cheetah Labs**! We are building the next-generation autonomous AI commerce and marketing automation platform for high-velocity eCommerce brands.

---

## 🛠️ Development Setup

### 1. Prerequisites
- **Node.js**: v18+ (Node 24 recommended)
- **Python**: v3.11+
- **Git**
- **Docker** (Optional, for running Redis and Celery locally)

### 2. Frontend Setup
```bash
cd flying-cheetah
# To preview locally
python -m http.server 8080
# Visit http://localhost:8080
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# Run FastAPI server
uvicorn app.main:app --reload --port 8000
```

### 4. Running Tests
```bash
cd backend
pytest -v
```

---

## 📋 Pull Request Process

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/amazing-feature
   ```
2. Ensure all unit and integration tests pass:
   ```bash
   pytest
   ```
3. Keep code styles clean, modular, and self-documented.
4. Open a Pull Request with a clear summary of your changes.

---

## 👥 Community & Support
- **Official Agency Email**: `flyingcheetah.agency@gmail.com`
- **WhatsApp Direct Support**: `+91 99203 86421`
