import { useState, useRef, useCallback, useEffect } from 'react';
import { Polygon, Point, Tool } from './types';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import ColorPicker from './components/ColorPicker';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const DEFAULT_COLORS = [
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#FFFF00', '#ADFF2F',
  '#00FF00', '#00CED1', '#0000FF', '#4B0082', '#8B00FF', '#FF00FF',
  '#FF69B4', '#FFFFFF', '#808080', '#000000', '#8B4513', '#006400',
  '#191970', '#800080', '#2F4F4F', '#B22222', '#4682B4', '#DAA520',
];

export default function App() {
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [currentColor, setCurrentColor] = useState<string>('#4682B4');
  const [currentOpacity, setCurrentOpacity] = useState<number>(0.7);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [draggingPoint, setDraggingPoint] = useState<{ polygonId: string; pointIndex: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const selectedPolygon = polygons.find(p => p.id === selectedId) || null;

  const getSvgPoint = useCallback((e: React.MouseEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (tool === 'draw') {
      const point = getSvgPoint(e);
      setCurrentPoints(prev => [...prev, point]);
    } else if (tool === 'add-point' && selectedId) {
      const point = getSvgPoint(e);
      setPolygons(prev => prev.map(p => {
        if (p.id !== selectedId) return p;
        // Find the nearest edge to insert the point
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
      }));
    }
  }, [tool, selectedId, getSvgPoint]);

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
      setPolygons(prev => [...prev, newPolygon]);
      setSelectedId(newPolygon.id);
      setCurrentPoints([]);
      setTool('select');
    }
  }, [tool, currentPoints, currentColor, currentOpacity]);

  const handlePointMouseDown = useCallback((e: React.MouseEvent, polygonId: string, pointIndex: number) => {
    e.stopPropagation();
    if (tool === 'move-point') {
      setDraggingPoint({ polygonId, pointIndex });
    } else if (tool === 'delete-point') {
      setPolygons(prev => prev.map(p => {
        if (p.id !== polygonId) return p;
        if (p.points.length <= 3) return p; // Min 3 points
        const newPoints = p.points.filter((_, i) => i !== pointIndex);
        return { ...p, points: newPoints };
      }));
    }
  }, [tool]);

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
    setDraggingPoint(null);
  }, []);

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
      setPolygons(prev => prev.filter(p => p.id !== selectedId));
      setSelectedId(null);
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
      setPolygons(prev => [...prev, newPolygon]);
      setSelectedId(newPolygon.id);
      setCurrentPoints([]);
      setTool('select');
    }
  };

  const cancelDrawing = () => {
    setCurrentPoints([]);
    setTool('select');
  };

  const updatePolygonColor = (color: string) => {
    if (selectedId) {
      setPolygons(prev => prev.map(p => {
        if (p.id !== selectedId) return p;
        return { ...p, fill: color, stroke: darkenColor(color, 30) };
      }));
    }
    setCurrentColor(color);
  };

  const updatePolygonOpacity = (opacity: number) => {
    if (selectedId) {
      setPolygons(prev => prev.map(p => {
        if (p.id !== selectedId) return p;
        return { ...p, opacity };
      }));
    }
    setCurrentOpacity(opacity);
  };

  const bringToFront = () => {
    if (selectedId) {
      setPolygons(prev => {
        const idx = prev.findIndex(p => p.id === selectedId);
        if (idx === -1) return prev;
        const polygon = prev[idx];
        const rest = prev.filter((_, i) => i !== idx);
        return [...rest, polygon];
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
        return [polygon, ...rest];
      });
    }
  };

  const clearAll = () => {
    setPolygons([]);
    setSelectedId(null);
    setCurrentPoints([]);
    setTool('select');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tool === 'draw') {
          cancelDrawing();
        }
        setSelectedId(null);
      }
      if (e.key === 'Enter' && tool === 'draw') {
        finishDrawing();
      }
      if (e.key === 'Delete' && selectedId && tool !== 'draw') {
        deletePolygon();
      }
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
        />

        {/* Color Picker Panel */}
        {showColorPicker && (
          <ColorPicker
            color={selectedPolygon?.fill || currentColor}
            onColorChange={updatePolygonColor}
            presets={DEFAULT_COLORS}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </div>
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
