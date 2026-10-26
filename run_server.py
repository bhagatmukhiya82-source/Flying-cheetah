# -*- coding: utf-8 -*-
"""
FLYING CHEETAH LABS - ONE-CLICK BACKEND LAUNCHER
Boots FastAPI on http://localhost:8000 with interactive Swagger UI docs.
"""

import os
import sys
import uvicorn

if __name__ == "__main__":
    # Ensure backend folder is in Python path
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    print("=" * 65)
    print("🐆 FLYING CHEETAH LABS - AUTONOMOUS BACKEND GATEWAY")
    print("🚀 API Server:       http://localhost:8000")
    print("📖 Swagger UI Docs:  http://localhost:8000/docs")
    print("🔌 Redoc UI Docs:    http://localhost:8000/redoc")
    print("=" * 65)

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=backend_dir)
