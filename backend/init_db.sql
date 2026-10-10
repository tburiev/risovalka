-- ============================================
-- Polygon Editor Database Schema
-- Для Supabase / PostgreSQL
-- ============================================

-- Удаление существующих таблиц (если есть)
DROP TABLE IF EXISTS points CASCADE;
DROP TABLE IF EXISTS polygons CASCADE;
DROP TABLE IF EXISTS visitors CASCADE;

-- ============================================
-- Таблица многоугольников
-- ============================================
CREATE TABLE polygons (
    id VARCHAR(255) PRIMARY KEY,
    fill VARCHAR(7) NOT NULL DEFAULT '#4682B4',
    stroke VARCHAR(7) NOT NULL DEFAULT '#2c5f8a',
    stroke_width FLOAT NOT NULL DEFAULT 2.0,
    opacity FLOAT NOT NULL DEFAULT 0.7 CHECK (opacity >= 0.0 AND opacity <= 1.0),
    z_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_polygons_z_index ON polygons(z_index);
CREATE INDEX idx_polygons_created_at ON polygons(created_at DESC);

-- ============================================
-- Таблица точек
-- ============================================
CREATE TABLE points (
    id SERIAL PRIMARY KEY,
    polygon_id VARCHAR(255) NOT NULL REFERENCES polygons(id) ON DELETE CASCADE,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска точек
CREATE INDEX idx_points_polygon_id ON points(polygon_id);
CREATE INDEX idx_points_order ON points(polygon_id, order_index);

-- ============================================
-- Таблица посетителей (статистика)
-- ============================================
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

-- Индексы для visitors
CREATE INDEX idx_visitors_ip ON visitors(ip_address);
CREATE INDEX idx_visitors_last_visit ON visitors(last_visit DESC);

-- ============================================
-- Функция автоматического обновления updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_polygons_updated_at
    BEFORE UPDATE ON polygons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Тестовые данные (опционально)
-- ============================================

-- Пример многоугольника 1: Квадрат
INSERT INTO polygons (id, fill, stroke, opacity, z_index)
VALUES ('test-001', '#FF5733', '#C70039', 0.8, 1);

INSERT INTO points (polygon_id, x, y, order_index) VALUES
('test-001', 100, 100, 0),
('test-001', 200, 100, 1),
('test-001', 200, 200, 2),
('test-001', 100, 200, 3);

-- Пример многоугольника 2: Треугольник
INSERT INTO polygons (id, fill, stroke, opacity, z_index)
VALUES ('test-002', '#33FF57', '#00C739', 0.7, 2);

INSERT INTO points (polygon_id, x, y, order_index) VALUES
('test-002', 300, 100, 0),
('test-002', 400, 200, 1),
('test-002', 200, 200, 2);

-- Пример многоугольника 3: Пятиугольник
INSERT INTO polygons (id, fill, stroke, opacity, z_index)
VALUES ('test-003', '#3357FF', '#0039C7', 0.6, 3);

INSERT INTO points (polygon_id, x, y, order_index) VALUES
('test-003', 500, 100, 0),
('test-003', 600, 150, 1),
('test-003', 580, 250, 2),
('test-003', 420, 250, 3),
('test-003', 400, 150, 4);

-- ============================================
-- Проверка создания
-- ============================================
SELECT 
    p.id AS polygon_id,
    p.fill,
    p.opacity,
    COUNT(pt.id) AS points_count
FROM polygons p
LEFT JOIN points pt ON p.id = pt.polygon_id
GROUP BY p.id, p.fill, p.opacity
ORDER BY p.z_index;
