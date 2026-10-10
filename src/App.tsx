import { useState, useRef, useCallback, useEffect } from 'react';
import { Polygon, Point, Tool } from './types';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import PolygonTable from './components/PolygonTable';
import StatsModal from './components/StatsModal';
import ZoomControls from './components/ZoomControls';
import * as api from './api';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

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
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [draggingPoint, setDraggingPoint] = useState<{ polygonId: string; pointIndex: number } | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Pan & Zoom state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1200, h: 800 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });
  const [zoom, setZoom] = useState(1);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPolygon = polygons.find(p => p.id === selectedId) || null;

  // Check API availability
  useEffect(() => {
    api.checkHealth().then(setApiAvailable);
  }, []);

  // Load polygons from DB
  useEffect(() => {
    if (apiAvailable) {
      api.fetchPolygons()
        .then(setPolygons)
        .catch(() => {
          // Игнорируем ошибки загрузки
        });
    }
  }, [apiAvailable]);

  // Track visit (fire and forget)
  useEffect(() => {
    if (apiAvailable) {
      // Не ждём результат, чтобы не блокировать загрузку
      api.trackVisit();
    }
  }, [apiAvailable]);

  // Close sidebar on desktop, open on mobile initial
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
      } else {
        setShowSidebar(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getSvgPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Convert screen coordinates to SVG coordinates
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    const scale = Math.max(scaleX, scaleY);
    
    return {
      x: viewBox.x + (clientX - rect.left) * scale,
      y: viewBox.y + (clientY - rect.top) * scale,
    };
  }, [viewBox]);

  // Debounced sync to backend
  const syncTimeoutRef = useRef<number | null>(null);
  const syncToBackend = useCallback((updatedPolygons: Polygon[]) => {
    if (!apiAvailable) return;
    
    // Очищаем предыдущий таймер
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    // Устанавливаем новый таймер (debounce 1 секунда)
    syncTimeoutRef.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const existing = await api.fetchPolygons();
        const existingIds = new Set(existing.map(p => p.id));
        const newIds = new Set(updatedPolygons.map(p => p.id));

        // Удаляем лишние
        for (const p of existing) {
          if (!newIds.has(p.id)) {
            await api.deletePolygon(p.id).catch(() => {});
          }
        }

        // Создаём или обновляем
        for (const p of updatedPolygons) {
          if (existingIds.has(p.id)) {
            await api.updatePolygon(p.id, {
              fill: p.fill,
              stroke: p.stroke,
              strokeWidth: p.strokeWidth,
              opacity: p.opacity,
            }).catch(() => {});
            await api.replacePoints(p.id, p.points).catch(() => {});
          } else {
            await api.createPolygon(p).catch(() => {});
          }
        }
      } catch {
        // Игнорируем ошибки синхронизации
      } finally {
        setSaving(false);
      }
    }, 1000);
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

  // Pan handlers
  const handlePanStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    setIsPanning(true);
    setPanStart({ x: clientX, y: clientY, vx: viewBox.x, vy: viewBox.y });
  }, [viewBox]);

  const handlePanMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isPanning) return;
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    
    const dx = (clientX - panStart.x) * (viewBox.w / rect.width);
    const dy = (clientY - panStart.y) * (viewBox.h / rect.height);
    
    setViewBox(prev => ({
      ...prev,
      x: panStart.vx - dx,
      y: panStart.vy - dy,
    }));
  }, [isPanning, panStart, viewBox.w, viewBox.h]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom handlers
  const handleZoom = useCallback((delta: number) => {
    // Инвертируем: колёсико вверх (delta < 0) = приближение (увеличение)
    const factor = delta < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.1, Math.min(10, zoom * factor));
    
    const centerX = viewBox.x + viewBox.w / 2;
    const centerY = viewBox.y + viewBox.h / 2;
    
    const newW = 1200 / newZoom;
    const newH = 800 / newZoom;
    
    setViewBox({
      x: centerX - newW / 2,
      y: centerY - newH / 2,
      w: newW,
      h: newH,
    });
    setZoom(newZoom);
  }, [zoom, viewBox]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Убираем preventDefault чтобы избежать ошибки passive event listener
    handleZoom(e.deltaY);
  }, [handleZoom]);

  const resetView = useCallback(() => {
    setViewBox({ x: 0, y: 0, w: 1200, h: 800 });
    setZoom(1);
  }, []);

  const fitToContent = useCallback(() => {
    if (polygons.length === 0) {
      resetView();
      return;
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    polygons.forEach(p => {
      p.points.forEach(pt => {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      });
    });
    
    const padding = 50;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;
    
    setViewBox({
      x: minX - padding,
      y: minY - padding,
      w,
      h,
    });
    setZoom(1200 / w);
  }, [polygons, resetView]);

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
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 relative">
      {/* Canvas area */}
      <div className="flex-1 relative" ref={containerRef}>
        <div 
          className="w-full h-full"
          onWheel={handleWheel}
        >
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
            viewBox={viewBox}
            isPanning={isPanning}
            onPanStart={handlePanStart}
            onPanMove={handlePanMove}
            onPanEnd={handlePanEnd}
          />
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="md:hidden absolute top-3 right-3 z-30 bg-white border border-gray-200 rounded-lg p-2 shadow-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {showSidebar ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Zoom controls */}
        <ZoomControls
          zoom={zoom}
          onZoomIn={() => handleZoom(-1)}
          onZoomOut={() => handleZoom(1)}
          onReset={resetView}
          onFit={fitToContent}
        />

        {/* Polygon table */}
        {showTable && polygons.length > 0 && (
          <PolygonTable
            polygons={polygons}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onClose={() => setShowTable(false)}
          />
        )}

        {!showTable && polygons.length > 0 && (
          <button
            onClick={() => setShowTable(true)}
            className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-white shadow-sm transition-colors"
          >
            📊 Таблица
          </button>
        )}

        {/* Saving indicator */}
        {saving && (
          <div className="absolute top-3 right-16 md:right-3 bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg flex items-center gap-2">
            <span className="animate-spin">⏳</span> Сохранение...
          </div>
        )}

        {/* API status */}
        {!apiAvailable && (
          <div className="absolute bottom-12 left-3 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-1.5 rounded-lg text-xs">
            ⚠️ API недоступен
          </div>
        )}

        {/* Status bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 px-4 py-2 text-sm text-gray-600 flex items-center gap-4">
          <span className="hidden sm:inline">Режим: <strong>{getToolLabel(tool)}</strong></span>
          {tool === 'draw' && (
            <span>Точек: <strong>{currentPoints.length}</strong></span>
          )}
          {selectedPolygon && (
            <span>Выбран: <strong>{selectedPolygon.points.length}</strong> т.</span>
          )}
          <span className="ml-auto">Фигур: <strong>{polygons.length}</strong></span>
          <span className="hidden sm:inline text-gray-400">| Масштаб: <strong>{Math.round(zoom * 100)}%</strong></span>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {showSidebar && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 md:z-auto
        w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shadow-lg
        h-full
        transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${showSidebar ? 'right-0' : 'right-0 md:right-auto'}
      `}>
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
          onClose={() => setShowSidebar(false)}
        />
      </div>

      {/* Stats modal */}
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
