import React from 'react';
import { Tool, Polygon, Point } from '../types';

const DEFAULT_COLORS = [
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#FFFF00', '#ADFF2F',
  '#00FF00', '#00CED1', '#0000FF', '#4B0082', '#8B00FF', '#FF00FF',
  '#FF69B4', '#FFFFFF', '#808080', '#000000', '#8B4513', '#006400',
];

interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  selectedId: string | null;
  selectedPolygon: Polygon | null;
  onAddPolygon: () => void;
  onDeletePolygon: () => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  currentPoints: Point[];
  onBringToFront: () => void;
  onSendToBack: () => void;
  onClearAll: () => void;
  currentColor: string;
  currentOpacity: number;
  onColorClick: () => void;
  onOpacityChange: (opacity: number) => void;
  showColorPicker: boolean;
  updatePolygonColor: (color: string) => void;
  onShowStats: () => void;
  onToggleTable: () => void;
  showTable: boolean;
}

export default function Toolbar({
  tool,
  setTool,
  selectedId,
  selectedPolygon,
  onAddPolygon,
  onDeletePolygon,
  onFinishDrawing,
  onCancelDrawing,
  currentPoints,
  onBringToFront,
  onSendToBack,
  onClearAll,
  currentColor,
  currentOpacity,
  onColorClick,
  onOpacityChange,
  showColorPicker,
  updatePolygonColor,
  onShowStats,
  onToggleTable,
  showTable,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-1 p-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-lg font-bold text-gray-800">🔷 Редактор многоугольников</h1>
        <p className="text-xs text-gray-500 mt-1">Создавайте и редактируйте многоугольники</p>
      </div>

      <hr className="border-gray-200 my-2" />

      {/* Drawing section */}
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Фигуры</h2>
        <div className="flex flex-col gap-1.5">
          {tool === 'draw' ? (
            <>
              <button
                onClick={onFinishDrawing}
                disabled={currentPoints.length < 3}
                className="w-full px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                ✓ Завершить ({currentPoints.length} точек)
              </button>
              <button
                onClick={onCancelDrawing}
                className="w-full px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                ✕ Отменить
              </button>
            </>
          ) : (
            <button
              onClick={onAddPolygon}
              className="w-full px-3 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span> Добавить многоугольник
            </button>
          )}
          <button
            onClick={onDeletePolygon}
            disabled={!selectedId || tool === 'draw'}
            className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            🗑 Удалить фигуру
          </button>
        </div>
      </div>

      <hr className="border-gray-200 my-2" />

      {/* Tools section */}
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Инструменты</h2>
        <div className="grid grid-cols-1 gap-1.5">
          <ToolButton
            active={tool === 'select'}
            onClick={() => setTool('select')}
            icon="🖱"
            label="Выбор"
            disabled={tool === 'draw'}
          />
          <ToolButton
            active={tool === 'move-point'}
            onClick={() => setTool('move-point')}
            icon="✋"
            label="Переместить точку"
            disabled={!selectedId || tool === 'draw'}
          />
          <ToolButton
            active={tool === 'add-point'}
            onClick={() => setTool('add-point')}
            icon="➕"
            label="Добавить точку"
            disabled={!selectedId || tool === 'draw'}
          />
          <ToolButton
            active={tool === 'delete-point'}
            onClick={() => setTool('delete-point')}
            icon="✂️"
            label="Удалить точку"
            disabled={!selectedId || tool === 'draw'}
          />
        </div>
      </div>

      <hr className="border-gray-200 my-2" />

      {/* Color section */}
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Цвет</h2>
        <button
          onClick={onColorClick}
          className="w-full px-3 py-2.5 rounded-lg text-sm font-medium border-2 border-gray-200 hover:border-gray-400 transition-colors flex items-center gap-3"
        >
          <div
            className="w-6 h-6 rounded-full border border-gray-300 shadow-inner"
            style={{ backgroundColor: currentColor }}
          />
          <span className="text-gray-700">Выбрать цвет</span>
          <span className="ml-auto text-xs text-gray-400 font-mono">{currentColor}</span>
        </button>
        
        {/* Inline Color Picker */}
        {showColorPicker && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {DEFAULT_COLORS.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    updatePolygonColor(color);
                  }}
                  className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${
                    currentColor === color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">HEX:</span>
              <input
                type="text"
                value={currentColor.replace('#', '')}
                onChange={(e) => {
                  const val = e.target.value.replace('#', '');
                  if (/^[0-9a-fA-F]{0,6}$/.test(val)) {
                    updatePolygonColor(`#${val}`);
                  }
                }}
                className="flex-1 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:border-blue-400 uppercase"
                maxLength={6}
              />
            </div>
          </div>
        )}
      </div>

      {/* Opacity section */}
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Прозрачность</h2>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={currentOpacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-xs text-gray-500 w-10 text-right">{Math.round(currentOpacity * 100)}%</span>
        </div>
      </div>

      <hr className="border-gray-200 my-2" />

      {/* Layer order */}
      {selectedId && (
        <>
          <div className="mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Порядок слоёв</h2>
            <div className="flex gap-1.5">
              <button
                onClick={onBringToFront}
                className="flex-1 px-2 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
              >
                ↑ На передний
              </button>
              <button
                onClick={onSendToBack}
                className="flex-1 px-2 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
              >
                ↓ На задний
              </button>
            </div>
          </div>
          <hr className="border-gray-200 my-2" />
        </>
      )}

      {/* Info section */}
      {selectedPolygon && (
        <div className="mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Информация</h2>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Точек:</span>
              <span className="font-medium">{selectedPolygon.points.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Цвет:</span>
              <span className="font-mono">{selectedPolygon.fill}</span>
            </div>
            <div className="flex justify-between">
              <span>Прозрачность:</span>
              <span className="font-medium">{Math.round(selectedPolygon.opacity * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats and Table buttons */}
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Аналитика</h2>
        <div className="flex gap-1.5">
          <button
            onClick={onToggleTable}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
          >
            {showTable ? '📊 Скрыть таблицу' : '📊 Таблица'}
          </button>
          <button
            onClick={onShowStats}
            className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors"
          >
            📈 Статистика
          </button>
        </div>
      </div>

      {/* Clear all */}
      <div className="mt-auto pt-3">
        <button
          onClick={onClearAll}
          className="w-full px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          🧹 Очистить всё
        </button>
      </div>

      {/* Help */}
      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700 font-medium mb-1">💡 Подсказки:</p>
        <ul className="text-xs text-blue-600 space-y-0.5">
          <li>• Кликайте для добавления точек</li>
          <li>• Двойной клик или Enter — завершить</li>
          <li>• Esc — отмена рисования</li>
          <li>• Delete — удалить фигуру</li>
        </ul>
      </div>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
        active
          ? 'bg-blue-500 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
