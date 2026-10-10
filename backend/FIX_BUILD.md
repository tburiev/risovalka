# 🔧 Исправление ошибки сборки на Render

## ❌ Проблема

```
error: metadata-generation-failed
× Encountered error while generating package metadata.
╰─> pydantic-core
```

### Причина
Render по умолчанию использует **Python 3.14** (последнюю доступную версию), но старые версии `pydantic-core` не имеют pre-built wheel для него. Пакет пытается скомпилироваться из исходников через Rust/maturin, что падает с ошибкой `Read-only file system`.

## ✅ Решение

### 1. Обновлены версии пакетов (`requirements.txt`)

**Было (старые версии):**
```
fastapi==0.109.0
pydantic==2.5.3
pydantic-core==2.14.6  ← нет wheel для Python 3.14
```

**Стало (новые версии с поддержкой Python 3.11+):**
```
fastapi>=0.115.0
pydantic>=2.10.0
pydantic-core>=2.27.0  ← есть wheel для всех версий
```

### 2. Добавлен `runtime.txt`

Создан файл `backend/runtime.txt` с содержимым:
```
3.11.9
```

Этот файл указывает Render использовать **Python 3.11** вместо 3.14.

### 3. Обновлён Dockerfile

Теперь использует `python:3.11.9-slim` и переменную `$PORT` вместо жёстко заданного порта.

---

## 📋 Что нужно сделать

### Шаг 1: Запушьте изменения

```bash
cd backend
git add .
git commit -m "Fix: Update dependencies for Python 3.11 compatibility"
git push
```

### Шаг 2: Пересоберите на Render

**Вариант A: Автоматический редеплой**
Render должен автоматически начать новый деплой после push.

**Вариант B: Ручной перезапуск**
1. Откройте ваш Web Service на Render
2. Перейдите во вкладку **"Deploys"**
3. Нажмите **"Manual Deploy"** → **"Deploy latest commit"**

### Шаг 3: Проверьте логи

В логах должно быть:
```
==> Using Python version: 3.11.9
==> Building...
Successfully installed fastapi-0.115.x pydantic-2.10.x ...
==> Build successful ✅
==> Starting service with 'uvicorn app.main:app --host 0.0.0.0 --port $PORT'
```

---

## 🎯 Альтернативное решение (если не помогло)

Если проблема сохраняется, можно явно указать версию Python в настройках Render:

1. Откройте Web Service на Render
2. Перейдите в **Settings** → **Environment**
3. Добавьте переменную:
   ```
   Key:   PYTHON_VERSION
   Value: 3.11.9
   ```
4. Сохраните и перезапустите деплой

---

## 🔍 Проверка версии Python

После успешного деплоя проверьте версию Python в логах:

```bash
# В логах Render должно быть:
Python 3.11.9
```

Или добавьте временный endpoint для проверки:

```python
@app.get("/python-version")
def get_python_version():
    import sys
    return {"python_version": sys.version}
```

---

## ✅ Итоговый чек-лист

- [ ] Обновлён `requirements.txt` (версии с `>=` вместо `==`)
- [ ] Создан `runtime.txt` с `3.11.9`
- [ ] Обновлён `Dockerfile` (использует `$PORT`)
- [ ] Изменения запушены на GitHub
- [ ] На Render запущен новый деплой
- [ ] В логах видна версия Python 3.11.x
- [ ] Build завершён успешно ✅

---

## 🆘 Если снова ошибка

Пришлите:
1. **Полный лог сборки** (вкладка "Logs" → "Build Logs")
2. **Версию Python** из логов (должна быть 3.11.9)
3. **Скриншот настроек** Web Service на Render

Я помогу разобраться! 💪
