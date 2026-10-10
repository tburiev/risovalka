from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import sys

# Настраиваем логирование
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

logger.info("Importing modules...")

try:
    from app.database import get_db, init_db
    logger.info("Database module imported successfully")
    
    from app import models  # Важно: модели должны быть импортированы
    logger.info("Models imported successfully")
    
    from app import crud, schemas
    logger.info("CRUD and schemas imported successfully")
except Exception as e:
    logger.error(f"Failed to import modules: {e}", exc_info=True)
    raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 50)
    logger.info("Starting up application...")
    logger.info("=" * 50)
    
    try:
        init_db()
        logger.info("Database initialization completed")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}", exc_info=True)
        raise
    
    logger.info("Application startup complete!")
    yield
    
    # Shutdown
    logger.info("Shutting down application...")


logger.info("Creating FastAPI app...")

app = FastAPI(
    title="Polygon Editor API",
    description="API для сохранения и управления многоугольниками",
    version="1.0.0",
    lifespan=lifespan
)

logger.info("Adding CORS middleware...")

# Кастомный CORS middleware для гарантированной работы
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin", "")
    
    # Разрешённые домены
    allowed_origins = [
        "https://risovalka-1.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]
    
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# Стандартный CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://risovalka-1.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Обработка preflight OPTIONS запросов
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "https://risovalka-1.onrender.com",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )

logger.info("FastAPI app created successfully")


# ============ Polygon Endpoints ============

@app.post("/api/polygons", response_model=schemas.PolygonResponse, status_code=201)
def create_polygon(polygon: schemas.PolygonCreate, db: Session = Depends(get_db)):
    """Создать новый многоугольник"""
    return crud.create_polygon(db, polygon)


@app.get("/api/polygons", response_model=schemas.PolygonListResponse)
def get_polygons(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Получить список всех многоугольников"""
    polygons = crud.get_polygons(db, skip=skip, limit=limit)
    return schemas.PolygonListResponse(
        polygons=polygons,
        total=len(polygons)
    )


@app.get("/api/polygons/{polygon_id}", response_model=schemas.PolygonResponse)
def get_polygon(polygon_id: str, db: Session = Depends(get_db)):
    """Получить многоугольник по ID"""
    polygon = crud.get_polygon(db, polygon_id)
    if not polygon:
        raise HTTPException(status_code=404, detail="Polygon not found")
    return polygon


@app.patch("/api/polygons/{polygon_id}", response_model=schemas.PolygonResponse)
def update_polygon(
    polygon_id: str,
    polygon_update: schemas.PolygonUpdate,
    db: Session = Depends(get_db)
):
    """Обновить свойства многоугольника (цвет, прозрачность и т.д.)"""
    polygon = crud.update_polygon(db, polygon_id, polygon_update)
    if not polygon:
        raise HTTPException(status_code=404, detail="Polygon not found")
    return polygon


@app.delete("/api/polygons/{polygon_id}", response_model=schemas.MessageResponse)
def delete_polygon(polygon_id: str, db: Session = Depends(get_db)):
    """Удалить многоугольник"""
    success = crud.delete_polygon(db, polygon_id)
    if not success:
        raise HTTPException(status_code=404, detail="Polygon not found")
    return schemas.MessageResponse(message="Polygon deleted successfully", id=polygon_id)


# ============ Points Endpoints ============

@app.put("/api/polygons/{polygon_id}/points", response_model=schemas.PolygonResponse)
def replace_points(
    polygon_id: str,
    points: List[schemas.PointCreate],
    db: Session = Depends(get_db)
):
    """Заменить все точки многоугольника"""
    if len(points) < 3:
        raise HTTPException(status_code=400, detail="Polygon must have at least 3 points")
    polygon = crud.update_polygon_points(db, polygon_id, points)
    if not polygon:
        raise HTTPException(status_code=404, detail="Polygon not found")
    return polygon


@app.post("/api/polygons/{polygon_id}/points", response_model=schemas.PolygonResponse)
def add_point(
    polygon_id: str,
    point: schemas.PointCreate,
    position: Optional[int] = Query(None, ge=0),
    db: Session = Depends(get_db)
):
    """Добавить точку в многоугольник"""
    polygon = crud.add_point_to_polygon(db, polygon_id, point, position)
    if not polygon:
        raise HTTPException(status_code=404, detail="Polygon not found")
    return polygon


@app.delete("/api/polygons/{polygon_id}/points/{point_id}", response_model=schemas.PolygonResponse)
def remove_point(
    polygon_id: str,
    point_id: int,
    db: Session = Depends(get_db)
):
    """Удалить точку из многоугольника"""
    polygon = crud.remove_point_from_polygon(db, polygon_id, point_id)
    if not polygon:
        raise HTTPException(status_code=404, detail="Polygon or point not found, or minimum points reached")
    return polygon


@app.patch("/api/polygons/{polygon_id}/points/{point_id}", response_model=schemas.PointResponse)
def move_point(
    polygon_id: str,
    point_id: int,
    coords: schemas.PointBase,
    db: Session = Depends(get_db)
):
    """Переместить точку (обновить координаты)"""
    point = crud.move_point(db, polygon_id, point_id, coords.x, coords.y)
    if not point:
        raise HTTPException(status_code=404, detail="Point not found")
    return point


# ============ Layer Order Endpoints ============

@app.post("/api/polygons/{polygon_id}/bring-to-front", response_model=schemas.PolygonResponse)
def bring_to_front(polygon_id: str, db: Session = Depends(get_db)):
    """Переместить многоугольник на передний план"""
    polygon = crud.bring_to_front(db, polygon_id)
    if not polygon:
        raise HTTPException(status_code=404, detail="Polygon not found")
    return polygon


@app.post("/api/polygons/{polygon_id}/send-to-back", response_model=schemas.PolygonResponse)
def send_to_back(polygon_id: str, db: Session = Depends(get_db)):
    """Переместить многоугольник на задний план"""
    polygon = crud.send_to_back(db, polygon_id)
    if not polygon:
        raise HTTPException(status_code=404, detail="Polygon not found")
    return polygon


# ============ Bulk Operations ============

@app.delete("/api/polygons", response_model=schemas.MessageResponse)
def delete_all(db: Session = Depends(get_db)):
    """Удалить все многоугольники"""
    count = crud.delete_all_polygons(db)
    return schemas.MessageResponse(message=f"Deleted {count} polygons")


# ============ Visitor Stats ============

@app.post("/api/visitors/track", response_model=schemas.VisitorResponse)
def track_visit(request: Request, db: Session = Depends(get_db)):
    """Фиксирует визит пользователя"""
    ip = crud.get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    visitor = crud.track_visitor(db, ip, user_agent)
    return visitor


@app.get("/api/visitors", response_model=schemas.VisitorListResponse)
def get_visitors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Получает список всех посетителей"""
    visitors = crud.get_visitors(db, skip=skip, limit=limit)
    return schemas.VisitorListResponse(
        visitors=visitors,
        total=len(visitors)
    )


# ============ Health Check & Debug ============

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "polygon-editor-api"}


@app.get("/debug")
def debug_info():
    """Диагностический endpoint для отладки проблем с деплоем"""
    import sys
    import os
    from sqlalchemy import inspect
    
    result = {
        "python_version": sys.version,
        "python_executable": sys.executable,
        "env_vars": {
            "DATABASE_URL": "SET" if os.getenv("DATABASE_URL") else "NOT SET",
            "PYTHON_VERSION": os.getenv("PYTHON_VERSION", "NOT SET"),
            "PORT": os.getenv("PORT", "NOT SET"),
            "WEB_CONCURRENCY": os.getenv("WEB_CONCURRENCY", "NOT SET"),
        },
        "database": {},
    }
    
    try:
        from app.database import engine, settings
        result["database"]["url_preview"] = settings.database_url[:60] + "..."
        
        with engine.connect() as conn:
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            result["database"]["status"] = "connected"
            result["database"]["tables"] = tables
            result["database"]["has_polygons"] = "polygons" in tables
            result["database"]["has_points"] = "points" in tables
    except Exception as e:
        result["database"]["status"] = "error"
        result["database"]["error"] = str(e)
    
    return result
