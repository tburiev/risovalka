import { Polygon } from '../types';

interface PolygonTableProps {
  polygons: Polygon[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function calculateArea(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

function calculatePerimeter(points: { x: number; y: number }[]): number {
  if (points.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

export default function PolygonTable({ polygons, selectedId, onSelect, onClose }: PolygonTableProps) {
  return (
    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg max-w-[calc(100vw-6rem)] md:max-w-md max-h-80 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">📊 Фигуры</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>
      <div className="overflow-auto max-h-64">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">#</th>
              <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Цвет</th>
              <th className="px-2 py-1.5 text-right text-gray-500 font-medium hidden sm:table-cell">Площадь</th>
              <th className="px-2 py-1.5 text-right text-gray-500 font-medium hidden sm:table-cell">Периметр</th>
              <th className="px-2 py-1.5 text-right text-gray-500 font-medium">Точек</th>
            </tr>
          </thead>
          <tbody>
            {polygons.map((polygon, idx) => {
              const area = calculateArea(polygon.points);
              const perimeter = calculatePerimeter(polygon.points);
              const isSelected = polygon.id === selectedId;
              return (
                <tr
                  key={polygon.id}
                  onClick={() => onSelect(polygon.id)}
                  className={`cursor-pointer border-t border-gray-100 transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-2 py-1.5 text-gray-600">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: polygon.fill }}
                      />
                      <span className="text-gray-500 font-mono text-[10px] hidden sm:inline">{polygon.fill}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-700 font-mono hidden sm:table-cell">{area.toFixed(0)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-700 font-mono hidden sm:table-cell">{perimeter.toFixed(0)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-700">{polygon.points.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
