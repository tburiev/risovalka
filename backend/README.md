# Polygon Editor API

REST API для сохранения и управления многоугольниками в PostgreSQL.

## Технологии

- **FastAPI** — веб-фреймворк
- **SQLAlchemy** — ORM
- **PostgreSQL** — база данных
- **Pydantic** — валидация данных
- **Docker** — контейнеризация

## Быстрый старт

### Вариант 1: Docker Compose (рекомендуется)

```bash
# Запустить PostgreSQL и API
docker-compose up -d

# API доступен на http://localhost:8000
# Swagger UI: http://localhost:8000/docs
```

### Вариант 2: Локальный запуск

1. Установите PostgreSQL и создайте базу данных:
```sql
CREATE DATABASE polygons_db;
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

3. Настройте `.env`:
```bash
cp .env.example .env
# Отредактируйте DATABASE_URL при необходимости
```

4. Запустите сервер:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Многоугольники

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/polygons` | Создать многоугольник |
| GET | `/api/polygons` | Получить все многоугольники |
| GET | `/api/polygons/{id}` | Получить многоугольник по ID |
| PATCH | `/api/polygons/{id}` | Обновить свойства |
| DELETE | `/api/polygons/{id}` | Удалить многоугольник |
| DELETE | `/api/polygons` | Удалить все |

### Точки

| Метод | Путь | Описание |
|-------|------|----------|
| PUT | `/api/polygons/{id}/points` | Заменить все точки |
| POST | `/api/polygons/{id}/points` | Добавить точку |
| DELETE | `/api/polygons/{id}/points/{point_id}` | Удалить точку |
| PATCH | `/api/polygons/{id}/points/{point_id}` | Переместить точку |

### Слои

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/polygons/{id}/bring-to-front` | На передний план |
| POST | `/api/polygons/{id}/send-to-back` | На задний план |

## Примеры запросов

### Создать многоугольник

```bash
curl -X POST http://localhost:8000/api/polygons \
  -H "Content-Type: application/json" \
  -d '{
    "fill": "#FF5733",
    "stroke": "#C70039",
    "stroke_width": 2,
    "opacity": 0.8,
    "points": [
      {"x": 100, "y": 100},
      {"x": 200, "y": 100},
      {"x": 200, "y": 200},
      {"x": 100, "y": 200}
    ]
  }'
```

### Получить все многоугольники

```bash
curl http://localhost:8000/api/polygons
```

### Обновить цвет

```bash
curl -X PATCH http://localhost:8000/api/polygons/abc12345 \
  -H "Content-Type: application/json" \
  -d '{"fill": "#00FF00", "opacity": 0.5}'
```

### Добавить точку

```bash
curl -X POST "http://localhost:8000/api/polygons/abc12345/points?position=2" \
  -H "Content-Type: application/json" \
  -d '{"x": 150, "y": 150}'
```

### Переместить на передний план

```bash
curl -X POST http://localhost:8000/api/polygons/abc12345/bring-to-front
```

## Структура БД

### Таблица `polygons`
- `id` (VARCHAR) — уникальный идентификатор
- `fill` (VARCHAR) — цвет заливки (HEX)
- `stroke` (VARCHAR) — цвет обводки (HEX)
- `stroke_width` (FLOAT) — толщина обводки
- `opacity` (FLOAT) — прозрачность (0-1)
- `z_index` (INTEGER) — порядок слоёв
- `created_at` (TIMESTAMP) — дата создания
- `updated_at` (TIMESTAMP) — дата обновления

### Таблица `points`
- `id` (INTEGER) — уникальный идентификатор
- `polygon_id` (VARCHAR, FK) — связь с многоугольником
- `x` (FLOAT) — координата X
- `y` (FLOAT) — координата Y
- `order_index` (INTEGER) — порядок точки в многоугольнике
- `created_at` (TIMESTAMP) — дата создания

## Документация

После запуска API доступна интерактивная документация:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
