# 🚀 Деплой на Render: Пошаговая инструкция

## ✅ Что исправлено

1. **Обновлён SQLAlchemy** — используется современный `DeclarativeBase` вместо устаревшего `declarative_base()`
2. **Исправлен FastAPI** — заменён deprecated `@app.on_event("startup")` на `lifespan`
3. **Улучшена обработка БД** — добавлена обработка ошибок при создании таблиц
4. **Исправлен config.py** — корректная работа с переменными окружения
5. **Добавлен render.yaml** — для автоматического деплоя

---

## 📋 Пошаговый деплой

### Шаг 1: Запушьте изменения на GitHub

```bash
cd backend
git add .
git commit -m "Fix: Update for Render deployment"
git push
```

### Шаг 2: Создайте Web Service на Render

1. Зайдите на [render.com](https://render.com)
2. Нажмите **"New +"** → **"Web Service"**
3. Подключите ваш GitHub-репозиторий

### Шаг 3: Настройте параметры

| Параметр | Значение |
|----------|----------|
| **Name** | `polygon-editor-api` |
| **Region** | Frankfurt (или ближайший) |
| **Branch** | `main` |
| **Root Directory** | `backend` ⚠️ **ВАЖНО!** |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

### Шаг 4: Добавьте переменные окружения

В разделе **"Environment Variables"** нажмите **"Add Environment Variable"**:

```
Key:   DATABASE_URL
Value: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

> ⚠️ Замените `[PASSWORD]` на ваш пароль от Supabase, а `[PROJECT]` на имя проекта.

### Шаг 5: Задеплойте

Нажмите **"Create Web Service"** и ждите 2-3 минуты.

---

## 🔍 Проверка после деплоя

### 1. Health Check
```bash
curl https://your-app.onrender.com/health
```
Должен вернуть:
```json
{"status":"ok","service":"polygon-editor-api"}
```

### 2. Swagger UI
Откройте в браузере:
```
https://your-app.onrender.com/docs
```

### 3. Тест API
```bash
# Получить все многоугольники
curl https://your-app.onrender.com/api/polygons
```

---

## 🚨 Частые ошибки и решения

### Ошибка 1: "ModuleNotFoundError: No module named 'app'"

**Причина:** Не указан Root Directory

**Решение:**
- Убедитесь, что в настройках Render указано **Root Directory: `backend`**
- Проверьте, что в папке `backend` есть файл `requirements.txt`

---

### Ошибка 2: "psycopg2.OperationalError: could not connect to server"

**Причина:** Неправильный DATABASE_URL или БД недоступна

**Решение:**
1. Проверьте строку подключения в Supabase:
   - Settings → Database → Connection string → URI
2. Убедитесь, что пароль правильный
3. Проверьте, что переменная `DATABASE_URL` добавлена в Render

---

### Ошибка 3: "Address already in use" или порт не работает

**Причина:** Не используется переменная `$PORT`

**Решение:**
- Start Command должен содержать: `--port $PORT`
- НЕ используйте жёстко заданный порт (например, `--port 8000`)

---

### Ошибка 4: "sqlalchemy.exc.ArgumentError: Mapper could not assemble any primary key"

**Причина:** Устаревший синтаксис SQLAlchemy

**Решение:** ✅ Уже исправлено в обновлённом коде

---

### Ошибка 5: "AttributeError: module 'fastapi' has no attribute 'on_event'"

**Причина:** Устаревший синтаксис FastAPI

**Решение:** ✅ Уже исправлено — используется `lifespan`

---

### Ошибка 6: Build падает с "ERROR: Could not find a version that satisfies the requirement"

**Причина:** Проблемы с версиями пакетов

**Решение:**
```bash
# Обновите requirements.txt до совместимых версий
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Update dependencies"
git push
```

---

## 📊 Логи и отладка

### Просмотр логов в реальном времени
1. Откройте ваш Web Service на Render
2. Перейдите во вкладку **"Logs"**
3. Смотрите вывод в реальном времени

### Типичные сообщения в логах

✅ **Успешный старт:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Database tables created/verified successfully
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:10000
```

❌ **Ошибка подключения к БД:**
```
WARNING:  Could not create tables (they may already exist): ...
```
Это нормально, если таблицы уже созданы в Supabase.

---

## 🔧 Альтернативный вариант: Docker

Если нативный Python не работает, используйте Docker:

### 1. Обновите Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей для psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 2. Настройки на Render

| Параметр | Значение |
|----------|----------|
| **Runtime** | `Docker` |
| **DockerfilePath** | `Dockerfile` |
| **Root Directory** | `backend` |

---

## ✅ Чек-лист перед деплоем

- [ ] Код запушен на GitHub
- [ ] В папке `backend` есть `requirements.txt`
- [ ] В папке `backend` есть папка `app/` с `main.py`
- [ ] На Render указан **Root Directory: `backend`**
- [ ] Добавлена переменная `DATABASE_URL`
- [ ] Start Command содержит `--port $PORT`
- [ ] Build Command: `pip install -r requirements.txt`

---

## 🎯 Если всё ещё не работает

Пришлите:
1. **Полный текст ошибки** из логов Render
2. **Скриншот настроек** Web Service на Render
3. **Структуру проекта** на GitHub (вывод `tree backend/`)

Я помогу разобраться! 💪
