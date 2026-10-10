from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas
import uuid


def generate_polygon_id() -> str:
    return str(uuid.uuid4())[:8]


# Polygon CRUD
def create_polygon(db: Session, polygon: schemas.PolygonCreate) -> models.Polygon:
    polygon_id = polygon.id or generate_polygon_id()

    db_polygon = models.Polygon(
        id=polygon_id,
        fill=polygon.fill,
        stroke=polygon.stroke,
        stroke_width=polygon.stroke_width,
        opacity=polygon.opacity,
        z_index=0
    )
    db.add(db_polygon)
    db.flush()

    for idx, point in enumerate(polygon.points):
        db_point = models.Point(
            polygon_id=polygon_id,
            x=point.x,
            y=point.y,
            order_index=idx
        )
        db.add(db_point)

    db.commit()
    db.refresh(db_polygon)
    return db_polygon


def get_polygon(db: Session, polygon_id: str) -> Optional[models.Polygon]:
    return db.query(models.Polygon).filter(models.Polygon.id == polygon_id).first()


def get_polygons(db: Session, skip: int = 0, limit: int = 100) -> List[models.Polygon]:
    return db.query(models.Polygon).order_by(models.Polygon.z_index).offset(skip).limit(limit).all()


def update_polygon(db: Session, polygon_id: str, polygon_update: schemas.PolygonUpdate) -> Optional[models.Polygon]:
    db_polygon = get_polygon(db, polygon_id)
    if not db_polygon:
        return None

    update_data = polygon_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_polygon, key, value)

    db.commit()
    db.refresh(db_polygon)
    return db_polygon


def delete_polygon(db: Session, polygon_id: str) -> bool:
    db_polygon = get_polygon(db, polygon_id)
    if not db_polygon:
        return False

    db.delete(db_polygon)
    db.commit()
    return True


def update_polygon_points(db: Session, polygon_id: str, points: List[schemas.PointCreate]) -> Optional[models.Polygon]:
    db_polygon = get_polygon(db, polygon_id)
    if not db_polygon:
        return None

    # Удаляем старые точки
    for point in db_polygon.points:
        db.delete(point)

    # Добавляем новые
    for idx, point in enumerate(points):
        db_point = models.Point(
            polygon_id=polygon_id,
            x=point.x,
            y=point.y,
            order_index=idx
        )
        db.add(db_point)

    db.commit()
    db.refresh(db_polygon)
    return db_polygon


def add_point_to_polygon(db: Session, polygon_id: str, point: schemas.PointCreate, position: Optional[int] = None) -> Optional[models.Polygon]:
    db_polygon = get_polygon(db, polygon_id)
    if not db_polygon:
        return None

    if position is None:
        position = len(db_polygon.points)

    # Сдвигаем индексы
    for p in db_polygon.points:
        if p.order_index >= position:
            p.order_index += 1

    db_point = models.Point(
        polygon_id=polygon_id,
        x=point.x,
        y=point.y,
        order_index=position
    )
    db.add(db_point)
    db.commit()
    db.refresh(db_polygon)
    return db_polygon


def remove_point_from_polygon(db: Session, polygon_id: str, point_id: int) -> Optional[models.Polygon]:
    db_polygon = get_polygon(db, polygon_id)
    if not db_polygon:
        return None

    if len(db_polygon.points) <= 3:
        return None  # Минимум 3 точки

    db_point = db.query(models.Point).filter(
        models.Point.id == point_id,
        models.Point.polygon_id == polygon_id
    ).first()

    if not db_point:
        return None

    removed_index = db_point.order_index
    db.delete(db_point)

    # Обновляем индексы
    for p in db_polygon.points:
        if p.order_index > removed_index:
            p.order_index -= 1

    db.commit()
    db.refresh(db_polygon)
    return db_polygon


def move_point(db: Session, polygon_id: str, point_id: int, x: float, y: float) -> Optional[models.Point]:
    db_point = db.query(models.Point).filter(
        models.Point.id == point_id,
        models.Point.polygon_id == polygon_id
    ).first()

    if not db_point:
        return None

    db_point.x = x
    db_point.y = y
    db.commit()
    db.refresh(db_point)
    return db_point


def bring_to_front(db: Session, polygon_id: str) -> Optional[models.Polygon]:
    db_polygon = get_polygon(db, polygon_id)
    if not db_polygon:
        return None

    max_z = db.query(models.Polygon).order_by(models.Polygon.z_index.desc()).first()
    db_polygon.z_index = (max_z.z_index + 1) if max_z else 1

    db.commit()
    db.refresh(db_polygon)
    return db_polygon


def send_to_back(db: Session, polygon_id: str) -> Optional[models.Polygon]:
    db_polygon = get_polygon(db, polygon_id)
    if not db_polygon:
        return None

    min_z = db.query(models.Polygon).order_by(models.Polygon.z_index.asc()).first()
    db_polygon.z_index = (min_z.z_index - 1) if min_z else -1

    db.commit()
    db.refresh(db_polygon)
    return db_polygon


def delete_all_polygons(db: Session) -> int:
    count = db.query(models.Polygon).count()
    db.query(models.Polygon).delete()
    db.commit()
    return count


# Visitor CRUD
def get_client_ip(request) -> str:
    """Извлекает реальный IP клиента"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def parse_browser(user_agent: str) -> str:
    """Определяет браузер по User-Agent"""
    if not user_agent:
        return "Unknown"
    ua = user_agent.lower()
    if "firefox" in ua:
        return "Firefox"
    if "edg" in ua:
        return "Edge"
    if "opr" in ua or "opera" in ua:
        return "Opera"
    if "chrome" in ua:
        return "Chrome"
    if "safari" in ua:
        return "Safari"
    return "Other"


def get_geo_info(ip: str) -> dict:
    """Получает геолокацию по IP (бесплатный API)"""
    try:
        import urllib.request
        import json
        url = f"http://ip-api.com/json/{ip}?fields=status,country,city"
        req = urllib.request.Request(url, headers={"User-Agent": "PolygonEditor/1.0"})
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode())
            if data.get("status") == "success":
                return {
                    "country": data.get("country"),
                    "city": data.get("city"),
                }
    except Exception:
        pass
    return {"country": None, "city": None}


def track_visitor(db: Session, ip: str, user_agent: str) -> models.Visitor:
    """Фиксирует каждый визит как отдельную запись"""
    geo = get_geo_info(ip)
    visitor = models.Visitor(
        ip_address=ip,
        user_agent=user_agent,
        browser=parse_browser(user_agent),
        country=geo.get("country"),
        city=geo.get("city"),
    )
    db.add(visitor)
    db.commit()
    db.refresh(visitor)
    return visitor


def get_visitors(db: Session, skip: int = 0, limit: int = 1000) -> list:
    """Получает список всех визитов"""
    return db.query(models.Visitor).order_by(models.Visitor.visit_time.desc()).offset(skip).limit(limit).all()
