# ✅ Исправление настроек Render

## 🔍 Найденные проблемы

### Проблема 1: Root Directory со слэшем
**Сейчас:** `backend/`
**Должно быть:** `backend` (без слэша)

### Проблема 2: Отсутствует PYTHON_VERSION
Нужно явно указать версию Python в переменных окружения.

---

## 🔧 Пошаговое исправление

### Шаг 1: Исправьте Root Directory

1. Откройте ваш Web Service на Render
2. Перейдите в **Settings** → **General**
3. Найдите поле **Root Directory**
4. Измените `backend/` → `backend` (уберите слэш)
5. Нажмите **Save Changes**

### Шаг 2: Добавьте PYTHON_VERSION

1. В том же разделе **Settings** найдите **Environment Variables**
2. Нажмите **Add Environment Variable**
3. Добавьте:
   ```
   Key:   PYTHON_VERSION
   Value: 3.11.9
   ```
4. Нажмите **Save Changes**

### Шаг 3: Проверьте DATABASE_URL

Убедитесь, что переменная `DATABASE_URL` добавлена и имеет правильный формат:

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Важно:**
- Должно быть `postgresql://`, а не `postgres://`
- Пароль должен быть без лишних пробелов
- PROJECT-REF — это ID вашего проекта в Supabase

### Шаг 4: Пересоберите

1. Перейдите во вкладку **Deploys**
2. Нажмите **Manual Deploy** → **Deploy latest commit**
3. Дождитесь завершения

---

## 📁 Структура проекта на GitHub

Убедитесь, что структура выглядит так:

```
your-repository/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── crud.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── requirements.txt
│   ├── runtime.txt          ← ВАЖНО: должен быть в backend/
│   ├── render.yaml
│   └── ...
└── src/                     ← фронтенд (для Vercel)
```

**Проверьте, что `runtime.txt` находится в папке `backend/`!**

---

## 🎯 Итоговые настройки на Render

| Параметр | Значение |
|----------|----------|
| **Branch** | `main` |
| **Root Directory** | `backend` ← **БЕЗ слэша!** |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

### Environment Variables:
```
DATABASE_URL = postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
PYTHON_VERSION = 3.11.9
```

---

## 🔍 Проверка после деплоя

### 1. Проверьте логи

В логах Render должно быть:
```
==> Using Python version: 3.11.9
==> Build successful 🎉
==> Deploying...
==> Running 'uvicorn app.main:app --host 0.0.0.0 --port $PORT'
Importing modules...
Database module imported successfully
...
INFO: Uvicorn running on http://0.0.0.0:10000
```

### 2. Проверьте /debug endpoint

Откройте в браузере:
```
https://your-app.onrender.com/debug
```

Должно показать:
```json
{
  "python_version": "3.11.9 ...",
  "env_vars": {
    "DATABASE_URL": "SET",
    "PYTHON_VERSION": "3.11.9",
    "PORT": "10000"
  },
  "database": {
    "status": "connected",
    "has_polygons": true,
    "has_points": true
  }
}
```

---

## 🆘 Если снова ошибка

Пришлите текстом из логов Render:
1. Строку с версией Python (должна быть `3.11.9`)
2. Все строки от `==> Running` до `Exited with status 1`
3. Содержимое `/debug` endpoint (если приложение запустилось)

Я помогу разобраться! 💪
