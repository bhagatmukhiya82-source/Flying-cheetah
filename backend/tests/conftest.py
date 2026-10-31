import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.core.config import settings

# Test in-memory / temporary SQLite database
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(autouse=True)
def mock_external_services():
    orig_token = settings.META_WA_TOKEN
    settings.META_WA_TOKEN = "MOCK_META_WA_TOKEN"
    yield
    settings.META_WA_TOKEN = orig_token

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestingSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

@pytest_asyncio.fixture(scope="session")
async def prepare_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def db_session(prepare_database) -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture
def admin_token() -> str:
    return create_access_token(
        subject="admin-test-id",
        extra_claims={
            "email": "flyingcheetah.agency@gmail.com",
            "role": "admin",
            "full_name": "Agency Administrator"
        }
    )

@pytest.fixture
def client_token() -> str:
    return create_access_token(
        subject="client-test-id",
        extra_claims={
            "email": "client@example.com",
            "role": "client",
            "full_name": "Test Client"
        }
    )
