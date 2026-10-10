from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import QueuePool
from app.config import get_settings
import logging
import socket
import re
import os

logger = logging.getLogger(__name__)
settings = get_settings()


def resolve_to_ipv4(hostname: str) -> str:
    """Резолвит hostname в IPv4 адрес для обхода проблемы IPv6 на Render"""
    logger.info(f"Attempting to resolve {hostname} to IPv4...")
    try:
        # Форсируем IPv4 через family=AF_INET
        results = socket.getaddrinfo(hostname, 5432, socket.AF_INET, socket.SOCK_STREAM)
        if results:
            ipv4 = results[0][4][0]
            logger.info(f"✓ Successfully resolved {hostname} -> {ipv4} (IPv4)")
            return ipv4
        else:
            logger.warning(f"No results from getaddrinfo for {hostname}")
    except Exception as e:
        logger.error(f"✗ Failed to resolve {hostname} to IPv4: {e}")
    
    logger.warning(f"Returning original hostname: {hostname}")
    return hostname


def fix_database_url(url: str) -> str:
    """
    Нормализует DATABASE_URL:
    1. postgres:// -> postgresql+psycopg2://
    2. Резолвит hostname в IPv4
    3. Добавляет sslmode=require
    """
    logger.info(f"Original DATABASE_URL: {url[:60]}...")
    
    # Нормализуем схему
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        logger.info("Changed scheme: postgres:// -> postgresql+psycopg2://")
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        logger.info("Changed scheme: postgresql:// -> postgresql+psycopg2://")
    
    # Извлекаем hostname из URL
    # Формат: postgresql+psycopg2://user:pass@HOST:port/dbname?params
    match = re.match(r'(postgresql\+psycopg2://[^@]+@)([^:/]+)(:\d+)?(/[^?]*)?(\?.*)?', url)
    if match:
        prefix = match.group(1)      # postgresql+psycopg2://user:pass@
        hostname = match.group(2)    # db.xxx.supabase.co
        port = match.group(3) or ""  # :5432
        dbname = match.group(4) or ""  # /postgres
        params = match.group(5) or ""  # ?sslmode=require
        
        logger.info(f"Extracted hostname: {hostname}")
        
        # Резолвим hostname в IPv4
        ipv4 = resolve_to_ipv4(hostname)
        
        # Добавляем sslmode если нет
        if "sslmode" not in params:
            if params:
                params += "&sslmode=require"
            else:
                params = "?sslmode=require"
        
        url = f"{prefix}{ipv4}{port}{dbname}{params}"
        logger.info(f"✓ Final DATABASE_URL: {url[:60]}...")
    else:
        logger.error(f"✗ Could not parse DATABASE_URL with regex")
        logger.error(f"URL: {url}")
    
    return url


# Получаем и нормализуем URL
logger.info("=" * 60)
logger.info("DATABASE CONNECTION INITIALIZATION")
logger.info("=" * 60)

DATABASE_URL = fix_database_url(settings.database_url)

logger.info(f"Connecting to database with driver: psycopg2")
logger.info(f"Final DATABASE_URL: {DATABASE_URL[:60]}...")

# Устанавливаем переменную окружения для libpq (дополнительная защита)
os.environ['PGOPTIONS'] = '-c client_encoding=UTF8'

# Создаём engine
logger.info("Creating SQLAlchemy engine...")
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
)
logger.info("✓ SQLAlchemy engine created")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
logger.info("✓ Session factory created")


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
    logger.info("Testing database connection...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("✓ Database connection test: OK")
            
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            logger.info(f"✓ Connected to database. Tables: {tables}")
            
            required_tables = ['polygons', 'points', 'visitors']
            missing = [t for t in required_tables if t not in tables]
            if missing:
                logger.warning(f"⚠ Missing tables: {missing}. Please run init_db.sql in Supabase.")
            else:
                logger.info("✓ All required tables exist.")
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
        logger.error("Make sure DATABASE_URL is correct and Supabase allows connections")
        raise
