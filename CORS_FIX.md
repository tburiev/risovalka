# 🔧 Исправление ошибки CORS

## ❌ Проблема

```
Access to fetch at 'https://polygon-editor-api.onrender.com/health' from origin 
'https://risovalka-1.onrender.com' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ Что исправлено

Добавлена **двойная защита** от CORS ошибок:

1. **Кастомный middleware** — добавляет CORS заголовки ко **всем** ответам
2. **Стандартный CORSMiddleware** — обрабатывает стандартные CORS запросы
3. **Preflight handler** — обрабатывает OPTIONS запросы с правильными заголовками

---

## 📋 Что нужно сделать

### Шаг 1: Запушьте изменения на GitHub

```bash
git add .
git commit -m "Fix: CORS - add custom middleware and preflight handler"
git push
```

### Шаг 2: Дождитесь деплоя бэкенда на Render

Render автоматически пересоберёт бэкенд после push.

### Шаг 3: Проверьте работу

1. Откройте консоль браузера (F12) на фронтенде
2. Обновите страницу
3. Ошибок CORS больше не должно быть

---

## 🔍 Как это работает

### Кастомный middleware

```python
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin", "")
    
    allowed_origins = [
        "https://risovalka-1.onrender.com",  # Ваш фронтенд
        "http://localhost:5173",              # Локальная разработка
        ...
    ]
    
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        ...
    
    return response
```

Этот middleware:
- Перехватывает **каждый** HTTP запрос
- Проверяет origin запроса
- Если origin в списке разрешённых — добавляет CORS заголовки
- Работает даже если стандартный CORSMiddleware не справляется

### Preflight handler

```python
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "https://risovalka-1.onrender.com",
            ...
        }
    )
```

Этот endpoint:
- Обрабатывает все OPTIONS запросы (preflight)
- Возвращает правильные CORS заголовки
- Браузер получает разрешение на отправку основного запроса

---

## 🎯 Разрешённые домены

В коде указаны:

```python
allowed_origins = [
    "https://risovalka-1.onrender.com",  # Ваш фронтенд на Render
    "http://localhost:5173",              # Vite dev server
    "http://localhost:3000",              # Альтернативный порт
    "http://localhost:8000",              # Локальный бэкенд
]
```

Если вы измените домен фронтенда, **обновите этот список** в `backend/app/main.py`.

---

## 🚨 Если снова ошибка CORS

### Проверьте логи бэкенда на Render

В логах должно быть:
```
Adding CORS middleware...
FastAPI app created successfully
```

### Проверьте что бэкенд пересобрался

1. Откройте Web Service на Render
2. Вкладка **Deploys**
3. Убедитесь что последний деплой успешный

### Проверьте вручную

```bash
curl -I https://polygon-editor-api.onrender.com/health
```

В ответе должны быть заголовки:
```
Access-Control-Allow-Origin: https://risovalka-1.onrender.com
Access-Control-Allow-Credentials: true
```

### Проверьте OPTIONS запрос

```bash
curl -X OPTIONS https://polygon-editor-api.onrender.com/api/polygons \
  -H "Origin: https://risovalka-1.onrender.com" \
  -H "Access-Control-Request-Method: GET" \
  -I
```

Должны вернуться CORS заголовки.

---

## 📊 Проверка работы

### 1. Откройте фронтенд

```
https://risovalka-1.onrender.com
```

### 2. Откройте консоль браузера (F12)

Должны быть логи:
```
Checking API health at: https://polygon-editor-api.onrender.com
Health check response: 200
Tracking visit at: https://polygon-editor-api.onrender.com/api/visitors/track
Track visit response: 200
```

**НЕ должно быть ошибок CORS!**

### 3. Создайте фигуру

В консоли:
```
Syncing polygons to backend... 1 polygons
Creating polygon: abc123
Sync completed successfully
```

### 4. Обновите страницу

Фигура должна остаться!

---

## ✅ Чек-лист

- [ ] Код запушен на GitHub
- [ ] Бэкенд пересобран на Render
- [ ] В консоли браузера нет ошибок CORS
- [ ] Health check работает
- [ ] Фигуры создаются и сохраняются
- [ ] Статистика посещений работает

---

## 🆘 Если ничего не помогло

Пришлите:
1. Скриншот консоли браузера с ошибкой CORS
2. Результат `curl -I https://polygon-editor-api.onrender.com/health`
3. Логи бэкенда с Render (вкладка Logs)

Я помогу разобраться! 💪
