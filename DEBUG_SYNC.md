# 🔧 Отладка: Данные не сохраняются в БД

## ❌ Проблема

Фигуры не сохраняются в БД, статистика посещений не работает.

## ✅ Что исправлено

1. **API URL** — теперь динамический (localhost для разработки, Render для production)
2. **CORS** — исправлена несовместимость `allow_credentials` с `allow_origins=["*"]`
3. **Логирование** — добавлены подробные логи в консоли браузера
4. **Обработка ошибок** — ошибки теперь видны в консоли

---

## 📋 Что нужно сделать

### Шаг 1: Обновите URL бэкенда в `.env`

Откройте файл `.env` в корне проекта и убедитесь что указан правильный URL:

```env
VITE_API_URL=https://ВАШ-БЭКЕНД.onrender.com/api
```

**Замените** `ВАШ-БЭКЕНД` на реальный URL вашего API с Render.

### Шаг 2: Запушьте изменения

```bash
git add .
git commit -m "Fix: Dynamic API URL, CORS, error logging"
git push
```

### Шаг 3: Пересоберите фронтенд

Vercel автоматически пересоберёт после push.

---

## 🔍 Как проверить что всё работает

### 1. Откройте консоль браузера (F12)

При загрузке страницы вы должны увидеть:

```
Checking API health at: https://ВАШ-БЭКЕНД.onrender.com
Health check response: 200
Tracking visit at: https://ВАШ-БЭКЕНД.onrender.com/api/visitors/track
Track visit response: 200
```

### 2. Создайте фигуру

В консоли должно появиться:

```
Syncing polygons to backend... 1 polygons
Existing polygons in DB: 0
Creating polygon: abc123
Sync completed successfully
```

### 3. Обновите страницу

Фигура должна остаться! В консоли:

```
Checking API health at: https://ВАШ-БЭКЕНД.onrender.com
Health check response: 200
```

### 4. Проверьте статистику

Нажмите кнопку "📈 Статистика" — должен открыться модальный окно с вашим визитом.

---

## 🚨 Возможные проблемы и решения

### Проблема 1: "API not available, skipping sync"

**Причина:** Бэкенд недоступен

**Решение:**
1. Проверьте что бэкенд запущен на Render
2. Откройте URL бэкенда в браузере: `https://ВАШ-БЭКЕНД.onrender.com/health`
3. Должно вернуться: `{"status":"ok","service":"polygon-editor-api"}`

### Проблема 2: CORS ошибки в консоли

**Причина:** Неправильные настройки CORS

**Решение:**
1. Убедитесь что в `backend/app/main.py` стоит `allow_credentials=False`
2. Пересоберите бэкенд на Render

### Проблема 3: "Failed to track visit"

**Причина:** Таблица `visitors` не создана в БД

**Решение:**
Выполните в SQL Editor Neon:

```sql
CREATE TABLE visitors (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    user_agent TEXT,
    browser VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    visit_count INTEGER NOT NULL DEFAULT 1,
    first_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_visitors_ip ON visitors(ip_address);
CREATE INDEX idx_visitors_last_visit ON visitors(last_visit DESC);
```

### Проблема 4: Фигуры не загружаются при обновлении

**Причина:** Ошибка при загрузке из БД

**Решение:**
1. Откройте консоль браузера (F12)
2. Найдите ошибки с "Sync error" или "Failed to fetch"
3. Проверьте что бэкенд отвечает на `/api/polygons`

### Проблема 5: Статистика не открывается

**Причина:** Эндпоинт `/api/visitors` не работает

**Решение:**
1. Проверьте в консоли браузера ошибки
2. Откройте вручную: `https://ВАШ-БЭКЕНД.onrender.com/api/visitors`
3. Должен вернуться JSON со списком посетителей

---

## 📊 Проверка через API

### Проверьте что фигуры сохраняются

```bash
curl https://ВАШ-БЭКЕНД.onrender.com/api/polygons
```

Должен вернуться список фигур.

### Проверьте статистику

```bash
curl https://ВАШ-БЭКЕНД.onrender.com/api/visitors
```

Должен вернуться список посетителей.

### Проверьте health check

```bash
curl https://ВАШ-БЭКЕНД.onrender.com/health
```

Должно вернуть: `{"status":"ok","service":"polygon-editor-api"}`

---

## 🎯 Чек-лист

- [ ] В `.env` указан правильный `VITE_API_URL`
- [ ] Код запушен на GitHub
- [ ] Vercel пересобрал фронтенд
- [ ] Render пересобрал бэкенд
- [ ] В консоли браузера нет ошибок CORS
- [ ] Health check работает: `https://ВАШ-БЭКЕНД.onrender.com/health`
- [ ] Таблица `visitors` создана в Neon
- [ ] При создании фигуры в консоли видны логи синхронизации
- [ ] После обновления страницы фигуры остаются
- [ ] Статистика посещений открывается

---

## 🆘 Если ничего не помогло

Пришлите:
1. Скриншот консоли браузера (F12 → Console) при загрузке страницы
2. Скриншот консоли при создании фигуры
3. Результат `curl https://ВАШ-БЭКЕНД.onrender.com/health`
4. Результат `curl https://ВАШ-БЭКЕНД.onrender.com/api/polygons`
5. Результат `curl https://ВАШ-БЭКЕНД.onrender.com/api/visitors`

Я помогу разобраться! 💪
