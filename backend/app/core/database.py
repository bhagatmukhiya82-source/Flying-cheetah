from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Configure async engine
# For SQLite, check_same_thread needs to be false
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async_session_factory = AsyncSessionLocal

Base = declarative_base()

async def get_db():
    """Async database session dependency with auto-commit/rollback."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    """Initializes tables for local testing / SQLite environment."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if "sqlite" in settings.DATABASE_URL:
            def migrate_sqlite_columns(connection):
                cursor = connection.connection.cursor()
                try:
                    cursor.execute("PRAGMA table_info(profiles)")
                    existing_cols = [row[1] for row in cursor.fetchall()]
                    cols_to_add = [
                        ("business_name", "TEXT"),
                        ("category_niche", "TEXT"),
                        ("gstin_udyam", "TEXT"),
                        ("whatsapp_support", "TEXT"),
                        ("pickup_address", "TEXT"),
                        ("merchant_upi_id", "TEXT"),
                        ("delivery_radius_km", "INTEGER DEFAULT 15")
                    ]
                    for col_name, col_type in cols_to_add:
                        if col_name not in existing_cols:
                            cursor.execute(f"ALTER TABLE profiles ADD COLUMN {col_name} {col_type}")
                except Exception:
                    pass
            await conn.run_sync(migrate_sqlite_columns)
