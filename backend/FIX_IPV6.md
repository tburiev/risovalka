# ✅ Исправление ошибки "Network is unreachable" (IPv6 проблема)

## ❌ Проблема

```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) connection to server at 
"db.tghammgdudguplqbpicb.supabase.co" (2a05:d018:cb7:ae00:282c:a6a1:4a1f:8ecc), 
port 5432 failed: Network is unreachable
```

### Причина
Render не поддерживает IPv6, а DNS Supabase возвращает IPv6 адрес. psycopg2 пытается подключиться по IPv6 и падает.

---

## ✅ Решение

**Исправлено!** Внесены следующие изменения:

1. **Переход на psycopg v3** — современный драйвер лучше работает с IPv6/IPv4
2. **Форсирование IPv4** — добавлена обёртка `socket.getaddrinfo` для игнорирования IPv6
3. **Добавлен sslmode=require** — для безопасного подключения к Supabase
4. **Улучшена обработка ошибок** — понятные сообщения при проблемах с подключением

---

## 📝 Что нужно сделать

### 1. Запушьте изменения

```bash
git add .
git commit -m "Fix: Force IPv4 and switch to psycopg v3"
git push
```

### 2. Дождитесь деплоя

Render автоматически начнёт новый деплой.

### 3. Проверьте логи

Должно быть:
```
Connecting to database with driver: psycopg (v3)
IPv4 forced for database connections
Database connection test: OK
Connected to database. Tables: ['polygons', 'points']
All required tables exist.
Application startup complete!
INFO: Uvicorn running on http://0.0.0.0:10000
```

---

## 🔍 Что было изменено

### requirements.txt
```
# Было:
psycopg2-binary>=2.9.10

# Стало:
psycopg[binary]>=3.2.0
```

### app/database.py
```python
# Добавлено форсирование IPv4
def force_ipv4_connection():
    _original_getaddrinfo = socket.getaddrinfo
    
    def _ipv4_only_getaddrinfo(*args, **kwargs):
        results = _original_getaddrinfo(*args, **kwargs)
        return [r for r in results if r[0] == socket.AF_INET] or results
    
    socket.getaddrinfo = _ipv4_only_getaddrinfo

force_ipv4_connection()
```

### URL подключения
```
# Было:
postgresql+psycopg2://postgres:password@host/db

# Стало:
postgresql://postgres:password@host/db?sslmode=require
```

---

## 🎯 Проверка после деплоя

Откройте в браузере:
```
https://your-app.onrender.com/debug
```

Должно показать:
```json
{
  "python_version": "3.11.9 ...",
  "database": {
    "status": "connected",
    "has_polygons": true,
    "has_points": true
  }
}
```

---

## 🆘 Если снова ошибка

### Ошибка: "connection refused"
Проверьте:
1. Правильность `DATABASE_URL` в переменных окружения Render
2. Пароль от Supabase (без лишних пробелов)
3. Активна ли БД в Supabase (не приостановлена)

### Ошибка: "password authentication failed"
Проверьте пароль в `DATABASE_URL`:
```
postgresql://postgres:[ПАРОЛЬ]@db.ПРОЕКТ.supabase.co:5432/postgres
```

### Ошибка: "timeout expired"
Supabase может быть недоступна. Проверьте статус на [status.supabase.com](https://status.supabase.com)

---

Проблема решена! 🎉
