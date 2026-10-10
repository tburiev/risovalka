FROM python:3.11.9-slim

WORKDIR /app

# Системные зависимости для psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Обновляем pip и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY app/ ./app/

# Render передаёт PORT через переменную окружения
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
