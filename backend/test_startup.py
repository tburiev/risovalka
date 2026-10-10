#!/usr/bin/env python3
"""
Тестовый скрипт для проверки запуска приложения локально
Запустите: python test_startup.py
"""

import sys
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def test_imports():
    """Проверка импортов"""
    logger.info("Testing imports...")
    
    try:
        from app.config import get_settings
        logger.info("✓ config imported")
        
        settings = get_settings()
        logger.info(f"✓ Settings loaded: DATABASE_URL={settings.database_url[:50]}...")
        
        from app.database import Base, get_db, init_db
        logger.info("✓ database imported")
        
        from app import models
        logger.info("✓ models imported")
        
        from app import schemas
        logger.info("✓ schemas imported")
        
        from app import crud
        logger.info("✓ crud imported")
        
        from app.main import app
        logger.info("✓ main app imported")
        
        return True
    except Exception as e:
        logger.error(f"✗ Import failed: {e}", exc_info=True)
        return False


def test_database_connection():
    """Проверка подключения к БД"""
    logger.info("\nTesting database connection...")
    
    try:
        from app.database import engine, init_db
        
        # Проверяем подключение
        with engine.connect() as conn:
            logger.info("✓ Connected to database")
            
            # Проверяем таблицы
            from sqlalchemy import inspect
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            logger.info(f"✓ Tables found: {tables}")
            
            required = ['polygons', 'points']
            missing = [t for t in required if t not in tables]
            
            if missing:
                logger.warning(f"⚠ Missing tables: {missing}")
                logger.warning("  Please run init_db.sql in Supabase")
            else:
                logger.info("✓ All required tables exist")
        
        return True
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}", exc_info=True)
        return False


def test_app_startup():
    """Проверка запуска приложения"""
    logger.info("\nTesting app startup...")
    
    try:
        from app.main import app
        from fastapi.testclient import TestClient
        
        with TestClient(app) as client:
            # Тест health check
            response = client.get("/health")
            assert response.status_code == 200
            logger.info("✓ Health check passed")
            
            # Тест получения многоугольников
            response = client.get("/api/polygons")
            assert response.status_code == 200
            logger.info("✓ GET /api/polygons passed")
            
        logger.info("✓ App startup test passed")
        return True
    except Exception as e:
        logger.error(f"✗ App startup test failed: {e}", exc_info=True)
        return False


def main():
    logger.info("=" * 60)
    logger.info("POLYGON EDITOR API - STARTUP TEST")
    logger.info("=" * 60)
    
    results = []
    
    # Тест 1: Импорты
    results.append(("Imports", test_imports()))
    
    # Тест 2: Подключение к БД
    results.append(("Database", test_database_connection()))
    
    # Тест 3: Запуск приложения
    results.append(("App Startup", test_app_startup()))
    
    # Итоги
    logger.info("\n" + "=" * 60)
    logger.info("TEST RESULTS")
    logger.info("=" * 60)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        logger.info(f"{name:.<30} {status}")
    
    all_passed = all(r for _, r in results)
    
    logger.info("=" * 60)
    if all_passed:
        logger.info("✓ ALL TESTS PASSED")
        logger.info("You can now run: uvicorn app.main:app --reload")
    else:
        logger.error("✗ SOME TESTS FAILED")
        logger.error("Please fix the errors above before deploying")
    logger.info("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
