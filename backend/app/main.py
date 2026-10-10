from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db, init_db
from app import crud, schemas

app = FastAPI(
    title="Polygon Editor API",
    description="API для сохранения и управления многоугольниками",
    version="1.0.0"
)

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


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


# ============ Health Check ============

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "polygon-editor-api"}
