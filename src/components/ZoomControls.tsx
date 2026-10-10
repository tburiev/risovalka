interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
}

export default function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset, onFit }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-14 left-3 flex flex-col gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <button
        onClick={onZoomIn}
        className="px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-lg font-bold"
        title="Увеличить (+)"
      >
        +
      </button>
      <div className="px-2 py-1 text-xs text-center text-gray-500 border-y border-gray-100 font-mono">
        {Math.round(zoom * 100)}%
      </div>
      <button
        onClick={onZoomOut}
        className="px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-lg font-bold"
        title="Уменьшить (-)"
      >
        −
      </button>
      <button
        onClick={onReset}
        className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 transition-colors text-xs border-t border-gray-100"
        title="Сбросить вид"
      >
        ⟲
      </button>
      <button
        onClick={onFit}
        className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 transition-colors text-xs border-t border-gray-100"
        title="Вместить всё"
      >
        ⛶
      </button>
    </div>
  );
}
