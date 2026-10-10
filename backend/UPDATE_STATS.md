# 🔄 Обновление статистики посещений

## Что изменилось

Теперь **каждый вход** на страницу сохраняется как отдельная запись в БД (раньше обновлялась одна запись для каждого IP).

В интерфейсе статистики:
- Записи **сгруппированы** по IP + браузер (по умолчанию свёрнуты)
- Можно **раскрыть** группу кликом, чтобы увидеть все входы по времени
- Сортировка по последнему входу

---

## 📋 Что нужно сделать

### Шаг 1: Обновите таблицу в БД

Откройте SQL Editor в Neon и выполните:

```sql
-- Удаляем старую таблицу
DROP TABLE IF EXISTS visitors CASCADE;

-- Создаём новую таблицу
CREATE TABLE visitors (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    browser VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    visit_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_visitors_ip ON visitors(ip_address);
CREATE INDEX idx_visitors_visit_time ON visitors(visit_time DESC);
```

### Шаг 2: Запушьте изменения

```bash
git add .
git commit -m "Update: Track every visit separately with grouping UI"
git push
```

### Шаг 3: Дождитесь деплоя

Render автоматически пересоберёт бэкенд и фронтенд.

---

## 🎯 Как это работает

### Бэкенд

Каждый POST запрос на `/api/visitors/track` создаёт **новую запись** в таблице `visitors`:

```python
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
```

### Фронтенд

Компонент `StatsModal` группирует записи по ключу `IP + браузер`:

```typescript
const key = `${visitor.ip_address}_${visitor.browser}`;
```

По умолчанию группы свёрнуты. Клик на группу раскрывает список всех входов с точным временем.

---

## 📊 Пример отображения

```
┌─────────────────────────────────────────────────────────────┐
│ ▶ 192.168.1.1    Chrome    Moscow, Russia    5    10.10 14:30 │
├─────────────────────────────────────────────────────────────┤
│   🕐 10.10.2024 14:30:15  Mozilla/5.0...              #123  │
│   🕐 10.10.2024 14:25:03  Mozilla/5.0...              #122  │
│   🕐 10.10.2024 14:20:45  Mozilla/5.0...              #121  │
│   🕐 10.10.2024 14:15:22  Mozilla/5.0...              #120  │
│   🕐 10.10.2024 14:10:01  Mozilla/5.0...              #119  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Проверка

1. Откройте страницу несколько раз (обновите F5)
2. Нажмите "📈 Статистика"
3. Должна появиться группа с вашим IP
4. Кликните на группу — раскроется список всех входов с точным временем

---

## 🔍 Что изменилось в коде

### Бэкенд

**Модель** (`backend/app/models.py`):
- Убрано поле `visit_count`
- Убрано поле `first_visit`, `last_visit`
- Добавлено поле `visit_time` (время каждого входа)
- Убран `unique=True` у `ip_address`

**CRUD** (`backend/app/crud.py`):
- `track_visitor()` теперь всегда создаёт новую запись
- `get_visitors()` возвращает все записи, отсортированные по `visit_time DESC`

### Фронтенд

**Компонент** (`src/components/StatsModal.tsx`):
- Добавлена группировка по `IP + браузер`
- Добавлено состояние `expandedGroups` для раскрытия групп
- Сортировка групп по последнему входу
- При раскрытии показываются все входы с точным временем

---

## 🆘 Если что-то не работает

### Ошибка: "column visit_time does not exist"

Вы не обновили таблицу в БД. Выполните SQL скрипт из Шага 1.

### Ошибка: "duplicate key value violates unique constraint"

Старая таблица всё ещё имеет `UNIQUE` constraint на `ip_address`. Удалите и пересоздайте таблицу.

### Статистика не обновляется

Проверьте консоль браузера (F12) — должны быть логи:
```
Tracking visit at: https://risovalka-7pnh.onrender.com/api/visitors/track
Track visit response: 200
```

---

Готово! Теперь каждый вход сохраняется отдельно, а в интерфейсе удобно сгруппирован. 🎉
