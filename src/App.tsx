import { useState, useRef, useCallback, useEffect } from 'react';
import { Polygon, Point, Tool } from './types';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import PolygonTable from './components/PolygonTable';
import StatsModal from './components/StatsModal';
import * as api from './api';

// eslint-disable-next-line @typescript-eslint/no-unused-vars

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const DEFAULT_COLORS = [
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#FFFF00', '#ADFF2F',
  '#00FF00', '#00CED1', '#0000FF', '#4B0082', '#8B00FF', '#FF00FF',
  '#FF69B4', '#FFFFFF', '#808080', '#000000', '#8B4513', '#006400',
];

export default function App() {
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [currentColor, setCurrentColor] = useState<string>('#4682B4');
  const [currentOpacity, setCurrentOpacity] = useState<number>(0.7);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [showTable, setShowTable] = useState<boolean>(true);
  const [draggingPoint, setDraggingPoint] = useState<{ polygonId: string; pointIndex: number } | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const selectedPolygon = polygons.find(p => p.id === selectedId) || null;

  // Проверка доступности API
  useEffect(() => {
    api.checkHealth().then(setApiAvailable);
  }, []);

  // Загрузка фигур из БД при старте
  useEffect(() => {
    if (apiAvailable) {
      api.fetchPolygons()
        .then(setPolygons)
        .catch(err => console.error('Failed to load polygons:', err));
    }
  }, [apiAvailable]);

  // Фиксация визита
  useEffect(() => {
    if (apiAvailable) {
      api.trackVisit().catch(err => console.error('Failed to track visit:', err));
    }
  }, [apiAvailable]);

  const getSvgPoint = useCallback((e: React.MouseEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Сохранение в БД
  const syncToBackend = useCallback(async (updatedPolygons: Polygon[]) => {
    if (!apiAvailable) {
      console.warn('API not available, skipping sync');
      return;
    }
    setSaving(true);
    try {
      console.log('Syncing polygons to backend...', updatedPolygons.length, 'polygons');
      
      // Простая стратегия: синхронизируем все фигуры
      const existing = await api.fetchPolygons();
      console.log('Existing polygons in DB:', existing.length);
      
      const existingIds = new Set(existing.map(p => p.id));
      const newIds = new Set(updatedPolygons.map(p => p.id));

      // Удаляем фигуры, которых больше нет
      for (const p of existing) {
        if (!newIds.has(p.id)) {
          console.log('Deleting polygon:', p.id);
          await api.deletePolygon(p.id).catch(err => console.error('Delete error:', err));
        }
      }

      // Создаём или обновляем
      for (const p of updatedPolygons) {
        if (existingIds.has(p.id)) {
          console.log('Updating polygon:', p.id);
          await api.updatePolygon(p.id, {
            fill: p.fill,
            stroke: p.stroke,
            strokeWidth: p.strokeWidth,
            opacity: p.opacity,
          }).catch(err => console.error('Update error:', err));
          await api.replacePoints(p.id, p.points).catch(err => console.error('Replace points error:', err));
        } else {
          console.log('Creating polygon:', p.id);
          await api.createPolygon(p).catch(err => console.error('Create error:', err));
        }
      }
      
      console.log('Sync completed successfully');
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSaving(false);
    }
  }, [apiAvailable]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (tool === 'draw') {
      const point = getSvgPoint(e);
      setCurrentPoints(prev => [...prev, point]);
    } else if (tool === 'add-point' && selectedId) {
      const point = getSvgPoint(e);
      setPolygons(prev => {
        const updated = prev.map(p => {
          if (p.id !== selectedId) return p;
          let minDist = Infinity;
          let insertIndex = p.points.length;
          for (let i = 0; i < p.points.length; i++) {
            const next = (i + 1) % p.points.length;
            const dist = distToSegment(point, p.points[i], p.points[next]);
            if (dist < minDist) {
              minDist = dist;
              insertIndex = next;
            }
          }
          const newPoints = [...p.points];
          newPoints.splice(insertIndex, 0, point);
          return { ...p, points: newPoints };
        });
        syncToBackend(updated);
        return updated;
      });
    }
  }, [tool, selectedId, getSvgPoint, syncToBackend]);

  const handleDoubleClick = useCallback(() => {
    if (tool === 'draw' && currentPoints.length >= 3) {
      const newPolygon: Polygon = {
        id: generateId(),
        points: [...currentPoints],
        fill: currentColor,
        stroke: darkenColor(currentColor, 30),
        strokeWidth: 2,
        opacity: currentOpacity,
      };
      const updated = [...polygons, newPolygon];
      setPolygons(updated);
      setSelectedId(newPolygon.id);
      setCurrentPoints([]);
      setTool('select');
      syncToBackend(updated);
    }
  }, [tool, currentPoints, currentColor, currentOpacity, polygons, syncToBackend]);

  const handlePointMouseDown = useCallback((e: React.MouseEvent, polygonId: string, pointIndex: number) => {
    e.stopPropagation();
    if (tool === 'move-point') {
      setDraggingPoint({ polygonId, pointIndex });
    } else if (tool === 'delete-point') {
      setPolygons(prev => {
        const updated = prev.map(p => {
          if (p.id !== polygonId) return p;
          if (p.points.length <= 3) return p;
          const newPoints = p.points.filter((_, i) => i !== pointIndex);
          return { ...p, points: newPoints };
        });
        syncToBackend(updated);
        return updated;
      });
    }
  }, [tool, syncToBackend]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingPoint) {
      const point = getSvgPoint(e);
      setPolygons(prev => prev.map(p => {
        if (p.id !== draggingPoint.polygonId) return p;
        const newPoints = [...p.points];
        newPoints[draggingPoint.pointIndex] = point;
        return { ...p, points: newPoints };
      }));
    }
  }, [draggingPoint, getSvgPoint]);

  const handleMouseUp = useCallback(() => {
    if (draggingPoint) {
      // Синхронизируем после завершения перетаскивания
      setPolygons(current => {
        syncToBackend(current);
        return current;
      });
    }
    setDraggingPoint(null);
  }, [draggingPoint, syncToBackend]);

  const handlePolygonClick = useCallback((e: React.MouseEvent, polygonId: string) => {
    e.stopPropagation();
    if (tool === 'select' || tool === 'move-point' || tool === 'add-point' || tool === 'delete-point') {
      setSelectedId(polygonId);
    }
  }, [tool]);

  const addPolygon = () => {
    setTool('draw');
    setCurrentPoints([]);
    setSelectedId(null);
  };

  const deletePolygon = () => {
    if (selectedId) {
      const updated = polygons.filter(p => p.id !== selectedId);
      setPolygons(updated);
      setSelectedId(null);
      syncToBackend(updated);
      if (apiAvailable) {
        api.deletePolygon(selectedId).catch(() => {});
      }
    }
  };

  const finishDrawing = () => {
    if (currentPoints.length >= 3) {
      const newPolygon: Polygon = {
        id: generateId(),
        points: [...currentPoints],
        fill: currentColor,
        stroke: darkenColor(currentColor, 30),
        strokeWidth: 2,
        opacity: currentOpacity,
      };
      const updated = [...polygons, newPolygon];
      setPolygons(updated);
      setSelectedId(newPolygon.id);
      setCurrentPoints([]);
      setTool('select');
      syncToBackend(updated);
    }
  };

  const cancelDrawing = () => {
    setCurrentPoints([]);
    setTool('select');
  };

  const updatePolygonColor = (color: string) => {
    setCurrentColor(color);
    if (selectedId) {
      setPolygons(prev => {
        const updated = prev.map(p => {
          if (p.id !== selectedId) return p;
          return { ...p, fill: color, stroke: darkenColor(color, 30) };
        });
        syncToBackend(updated);
        return updated;
      });
    }
  };

  const updatePolygonOpacity = (opacity: number) => {
    setCurrentOpacity(opacity);
    if (selectedId) {
      setPolygons(prev => {
        const updated = prev.map(p => {
          if (p.id !== selectedId) return p;
          return { ...p, opacity };
        });
        syncToBackend(updated);
        return updated;
      });
    }
  };

  const bringToFront = () => {
    if (selectedId) {
      setPolygons(prev => {
        const idx = prev.findIndex(p => p.id === selectedId);
        if (idx === -1) return prev;
        const polygon = prev[idx];
        const rest = prev.filter((_, i) => i !== idx);
        const updated = [...rest, polygon];
        syncToBackend(updated);
        return updated;
      });
    }
  };

  const sendToBack = () => {
    if (selectedId) {
      setPolygons(prev => {
        const idx = prev.findIndex(p => p.id === selectedId);
        if (idx === -1) return prev;
        const polygon = prev[idx];
        const rest = prev.filter((_, i) => i !== idx);
        const updated = [polygon, ...rest];
        syncToBackend(updated);
        return updated;
      });
    }
  };

  const clearAll = () => {
    setPolygons([]);
    setSelectedId(null);
    setCurrentPoints([]);
    setTool('select');
    if (apiAvailable) {
      api.deleteAllPolygons().catch(() => {});
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tool === 'draw') cancelDrawing();
        setSelectedId(null);
      }
      if (e.key === 'Enter' && tool === 'draw') finishDrawing();
      if (e.key === 'Delete' && selectedId && tool !== 'draw') deletePolygon();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tool, selectedId, currentPoints, currentColor, currentOpacity]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      {/* Canvas area */}
      <div className="flex-1 relative">
        <Canvas
          svgRef={svgRef}
          polygons={polygons}
          currentPoints={currentPoints}
          selectedId={selectedId}
          tool={tool}
          currentColor={currentColor}
          currentOpacity={currentOpacity}
          onCanvasClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onPointMouseDown={handlePointMouseDown}
          onPolygonClick={handlePolygonClick}
        />

        {/* Таблица фигур (левый верхний угол) */}
        {showTable && polygons.length > 0 && (
          <PolygonTable
            polygons={polygons}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onClose={() => setShowTable(false)}
          />
        )}

        {/* Кнопка показа таблицы */}
        {!showTable && polygons.length > 0 && (
          <button
            onClick={() => setShowTable(true)}
            className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-white shadow-sm transition-colors"
          >
            📊 Показать таблицу фигур
          </button>
        )}

        {/* Индикатор сохранения */}
        {saving && (
          <div className="absolute top-3 right-3 bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg flex items-center gap-2">
            <span className="animate-spin">⏳</span> Сохранение...
          </div>
        )}

        {/* Статус API */}
        {!apiAvailable && (
          <div className="absolute bottom-12 left-3 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-1.5 rounded-lg text-xs">
            ⚠️ API недоступен — работа в оффлайн-режиме
          </div>
        )}

        {/* Status bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 px-4 py-2 text-sm text-gray-600 flex items-center gap-4">
          <span>Режим: <strong>{getToolLabel(tool)}</strong></span>
          {tool === 'draw' && (
            <span>Точек: <strong>{currentPoints.length}</strong> {currentPoints.length >= 3 && '(Enter — завершить, Esc — отмена)'}</span>
          )}
          {selectedPolygon && (
            <span>Выбран: <strong>#{selectedPolygon.points.length}</strong> (точек)</span>
          )}
          <span className="ml-auto">Фигур: <strong>{polygons.length}</strong></span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shadow-lg">
        <Toolbar
          tool={tool}
          setTool={setTool}
          selectedId={selectedId}
          selectedPolygon={selectedPolygon}
          onAddPolygon={addPolygon}
          onDeletePolygon={deletePolygon}
          onFinishDrawing={finishDrawing}
          onCancelDrawing={cancelDrawing}
          currentPoints={currentPoints}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onClearAll={clearAll}
          currentColor={selectedPolygon?.fill || currentColor}
          currentOpacity={selectedPolygon?.opacity ?? currentOpacity}
          onColorClick={() => setShowColorPicker(!showColorPicker)}
          onOpacityChange={updatePolygonOpacity}
          showColorPicker={showColorPicker}
          updatePolygonColor={updatePolygonColor}
          onShowStats={() => setShowStats(true)}
          onToggleTable={() => setShowTable(!showTable)}
          showTable={showTable}
        />
      </div>

      {/* Модальное окно статистики */}
      {showStats && (
        <StatsModal onClose={() => setShowStats(false)} />
      )}
    </div>
  );
}

function getToolLabel(tool: Tool): string {
  switch (tool) {
    case 'select': return 'Выбор';
    case 'draw': return 'Рисование';
    case 'move-point': return 'Перемещение точек';
    case 'add-point': return 'Добавление точек';
    case 'delete-point': return 'Удаление точек';
  }
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
  const b = Math.max(0, (num & 0x0000FF) - amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
