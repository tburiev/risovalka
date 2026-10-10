from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

# Поддержка обоих форматов URL (postgresql:// и postgresql+psycopg2://)
DATABASE_URL = settings.database_url
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

logger.info(f"Connecting to database...")
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency для получения сессии БД"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Проверка подключения к БД (таблицы уже созданы в Supabase)"""
    try:
        # Проверяем подключение
        with engine.connect() as conn:
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            logger.info(f"Connected to database. Tables: {tables}")
            
            # Проверяем наличие нужных таблиц
            required_tables = ['polygons', 'points']
            missing = [t for t in required_tables if t not in tables]
            if missing:
                logger.warning(f"Missing tables: {missing}. Please run init_db.sql in Supabase.")
            else:
                logger.info("All required tables exist.")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise
