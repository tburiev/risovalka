from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import QueuePool
from app.config import get_settings
import logging
import socket

logger = logging.getLogger(__name__)
settings = get_settings()

# Поддержка обоих форматов URL и использование psycopg (v3)
DATABASE_URL = settings.database_url

# Нормализуем URL: postgres:// → postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Убираем +psycopg2 если есть (мы используем psycopg v3)
if "+psycopg2" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("+psycopg2", "")

# Добавляем sslmode=require для Supabase
if "?" not in DATABASE_URL:
    DATABASE_URL += "?sslmode=require"
elif "sslmode" not in DATABASE_URL:
    DATABASE_URL += "&sslmode=require"

logger.info(f"Connecting to database with driver: psycopg (v3)")
logger.info(f"Database URL: {DATABASE_URL[:60]}...")


def force_ipv4_connection():
    """Обёртка для форсирования IPv4 при подключении к БД"""
    _original_getaddrinfo = socket.getaddrinfo
    
    def _ipv4_only_getaddrinfo(*args, **kwargs):
        # Форсируем IPv4 (AF_INET) вместо IPv6 (AF_INET6)
        results = _original_getaddrinfo(*args, **kwargs)
        return [r for r in results if r[0] == socket.AF_INET] or results
    
    socket.getaddrinfo = _ipv4_only_getaddrinfo


# Применяем форсирование IPv4
force_ipv4_connection()
logger.info("IPv4 forced for database connections")

# Создаём engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
)
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
            # Простой запрос для проверки
            result = conn.execute(text("SELECT 1"))
            logger.info("Database connection test: OK")
            
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
        logger.error("Make sure DATABASE_URL is correct and Supabase allows connections")
        raise
