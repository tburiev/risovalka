# 🔍 Отладка ошибки "Exited with status 1"

## ❌ Проблема

Приложение успешно собирается, но падает при запуске:
```
==> Build successful 🎉
==> Deploying...
==> Running 'uvicorn app.main:app --host 0.0.0.0 --port $PORT'
==> Exited with status 1
```

Это означает ошибку в коде при старте приложения.

---

## 🔧 Что исправлено

1. **Улучшено логирование** — добавлены подробные логи на каждом этапе запуска
2. **Безопасная инициализация БД** — `init_db()` теперь только проверяет подключение, не создаёт таблицы
3. **Обработка ошибок импорта** — если модуль не загружается, будет понятная ошибка в логах
4. **Добавлен тестовый скрипт** — `test_startup.py` для локальной проверки

---

## 📋 Пошаговая диагностика

### Шаг 1: Запушьте изменения

```bash
cd backend
git add .
git commit -m "Fix: Improve error handling and logging"
git push
```

### Шаг 2: Проверьте логи на Render

После деплоя откройте вкладку **"Logs"** на Render. Вы должны увидеть подробные сообщения:

```
2024-01-XX ... - Importing modules...
2024-01-XX ... - Database module imported successfully
2024-01-XX ... - CRUD and schemas imported successfully
2024-01-XX ... - Creating FastAPI app...
2024-01-XX ... - Adding CORS middleware...
2024-01-XX ... - FastAPI app created successfully
2024-01-XX ... - Starting up application...
2024-01-XX ... - Connecting to database...
```

**Найдите строку с ошибкой** — она будет перед `Exited with status 1`.

---

## 🎯 Возможные причины и решения

### Причина 1: Ошибка подключения к БД

**Симптом в логах:**
```
ERROR - Database connection failed: could not connect to server
```

**Решение:**
1. Проверьте переменную `DATABASE_URL` в настройках Render
2. Убедитесь, что пароль правильный (без спецсимволов в начале/конце)
3. Проверьте, что БД в Supabase активна (не приостановлена)

**Формат URL:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

### Причина 2: Ошибка импорта модулей

**Симптом в логах:**
```
ERROR - Failed to import modules: No module named 'app.xxx'
```

**Решение:**
1. Проверьте структуру проекта на GitHub:
   ```
   backend/
   ├── app/
   │   ├── __init__.py
   │   ├── main.py
   │   ├── database.py
   │   ├── models.py
   │   ├── schemas.py
   │   └── crud.py
   └── requirements.txt
   ```
2. Убедитесь, что все файлы на месте
3. Проверьте, что **Root Directory** на Render = `backend`

---

### Причина 3: Отсутствие таблиц в БД

**Симптом в логах:**
```
WARNING - Missing tables: ['polygons', 'points']
```

**Решение:**
1. Откройте Supabase → SQL Editor
2. Выполните скрипт из `backend/init_db.sql`
3. Перезапустите деплой на Render

---

### Причина 4: Неправильная версия Python

**Симптом в логах:**
```
Using cached pydantic_core-2.50.0-cp314-cp314-...
```
(видно `cp314` — Python 3.14)

**Решение:**
1. Откройте Web Service на Render
2. **Settings** → **Environment**
3. Добавьте переменную:
   ```
   Key:   PYTHON_VERSION
   Value: 3.11.9
   ```
4. Сохраните и перезапустите деплой

---

### Причина 5: Конфликт версий пакетов

**Симптом в логах:**
```
ImportError: cannot import name 'xxx' from 'fastapi'
```

**Решение:**
Зафиксируйте версии в `requirements.txt`:
```
fastapi==0.115.0
pydantic==2.10.0
sqlalchemy==2.0.36
```

Затем:
```bash
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Pin dependency versions"
git push
```

---

## 🧪 Локальное тестирование

Перед деплоем проверьте работу локально:

```bash
cd backend

# Установите зависимости
pip install -r requirements.txt

# Запустите тестовый скрипт
python test_startup.py
```

Должно быть:
```
✓ Imports .......................... ✓ PASS
✓ Database ......................... ✓ PASS
✓ App Startup ...................... ✓ PASS
✓ ALL TESTS PASSED
```

Если тесты проходят локально, но падают на Render — проблема в переменных окружения или версии Python.

---

## 📊 Что искать в логах Render

### ✅ Успешный запуск:
```
==> Build successful 🎉
==> Deploying...
==> Running 'uvicorn app.main:app --host 0.0.0.0 --port $PORT'
2024-01-XX ... - Importing modules...
2024-01-XX ... - Database module imported successfully
2024-01-XX ... - CRUD and schemas imported successfully
2024-01-XX ... - Creating FastAPI app...
2024-01-XX ... - FastAPI app created successfully
2024-01-XX ... - Starting up application...
2024-01-XX ... - Connecting to database...
2024-01-XX ... - Connected to database. Tables: ['polygons', 'points']
2024-01-XX ... - All required tables exist.
2024-01-XX ... - Database initialization completed
2024-01-XX ... - Application startup complete!
INFO:     Uvicorn running on http://0.0.0.0:10000
```

### ❌ Ошибка:
```
==> Exited with status 1
```

**Найдите строку с `ERROR` или `Traceback`** — это и есть причина.

---

## 🔧 Ручная проверка на Render

Если логи не помогают, можно временно добавить endpoint для диагностики:

Добавьте в `app/main.py`:

```python
@app.get("/debug")
def debug_info():
    import sys
    import os
    from app.database import engine
    
    try:
        with engine.connect() as conn:
            db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    
    return {
        "python_version": sys.version,
        "database_url": settings.database_url[:50] + "...",
        "database_status": db_status,
        "env_vars": {
            "DATABASE_URL": "SET" if os.getenv("DATABASE_URL") else "NOT SET",
            "PYTHON_VERSION": os.getenv("PYTHON_VERSION", "NOT SET"),
            "PORT": os.getenv("PORT", "NOT SET"),
        }
    }
```

После деплоя откройте:
```
https://your-app.onrender.com/debug
```

Это покажет версию Python, статус БД и переменные окружения.

---

## 🆘 Если ничего не помогло

Пришлите:
1. **Полные логи** из Render (вкладка "Logs" → скопируйте всё от "==> Running" до "Exited")
2. **Скриншот настроек** Web Service (Settings → General)
3. **Результат** `python test_startup.py` (если запускали локально)
4. **Содержимое** `/debug` endpoint (если добавили)

Я помогу разобраться! 💪
