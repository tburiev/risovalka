import React, { useState, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  presets: string[];
  onClose: () => void;
}

export default function ColorPicker({ color, onColorChange, presets, onClose }: ColorPickerProps) {
  const [r, setR] = useState(0);
  const [g, setG] = useState(0);
  const [b, setB] = useState(0);
  const [hexInput, setHexInput] = useState(color);

  useEffect(() => {
    const parsed = hexToRgb(color);
    if (parsed) {
      setR(parsed.r);
      setG(parsed.g);
      setB(parsed.b);
    }
    setHexInput(color);
  }, [color]);

  const handleRgbChange = (newR: number, newG: number, newB: number) => {
    setR(newR);
    setG(newG);
    setB(newB);
    const hex = rgbToHex(newR, newG, newB);
    setHexInput(hex);
    onColorChange(hex);
  };

  const handleHexInput = (value: string) => {
    setHexInput(value);
    const cleaned = value.replace('#', '');
    if (cleaned.length === 6 && /^[0-9a-fA-F]+$/.test(cleaned)) {
      const parsed = hexToRgb(`#${cleaned}`);
      if (parsed) {
        setR(parsed.r);
        setG(parsed.g);
        setB(parsed.b);
        onColorChange(`#${cleaned.toUpperCase()}`);
      }
    }
  };

  return (
    <div className="p-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Палитра RGB</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-lg border border-gray-300 shadow-inner"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">#</span>
            <input
              type="text"
              value={hexInput.replace('#', '')}
              onChange={(e) => handleHexInput(e.target.value)}
              className="w-full px-2 py-1 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:border-blue-400 uppercase"
              maxLength={6}
            />
          </div>
        </div>
      </div>

      {/* RGB Sliders */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-red-500 w-4">R</span>
          <input
            type="range"
            min="0"
            max="255"
            value={r}
            onChange={(e) => handleRgbChange(parseInt(e.target.value), g, b)}
            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(0,${g},${b}), rgb(255,${g},${b}))`
            }}
          />
          <input
            type="number"
            min="0"
            max="255"
            value={r}
            onChange={(e) => handleRgbChange(clamp(parseInt(e.target.value) || 0), g, b)}
            className="w-12 px-1 py-0.5 text-xs text-center border border-gray-300 rounded focus:outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-green-500 w-4">G</span>
          <input
            type="range"
            min="0"
            max="255"
            value={g}
            onChange={(e) => handleRgbChange(r, parseInt(e.target.value), b)}
            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(${r},0,${b}), rgb(${r},255,${b}))`
            }}
          />
          <input
            type="number"
            min="0"
            max="255"
            value={g}
            onChange={(e) => handleRgbChange(r, clamp(parseInt(e.target.value) || 0), b)}
            className="w-12 px-1 py-0.5 text-xs text-center border border-gray-300 rounded focus:outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-blue-500 w-4">B</span>
          <input
            type="range"
            min="0"
            max="255"
            value={b}
            onChange={(e) => handleRgbChange(r, g, parseInt(e.target.value))}
            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(${r},${g},0), rgb(${r},${g},255))`
            }}
          />
          <input
            type="number"
            min="0"
            max="255"
            value={b}
            onChange={(e) => handleRgbChange(r, g, clamp(parseInt(e.target.value) || 0))}
            className="w-12 px-1 py-0.5 text-xs text-center border border-gray-300 rounded focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* Preset colors */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Быстрый выбор:</p>
        <div className="grid grid-cols-8 gap-1.5">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                const parsed = hexToRgb(preset);
                if (parsed) {
                  setR(parsed.r);
                  setG(parsed.g);
                  setB(parsed.b);
                }
                setHexInput(preset);
                onColorChange(preset);
              }}
              className={`w-7 h-7 rounded-md border-2 transition-transform hover:scale-110 ${
                color === preset ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
              style={{ backgroundColor: preset }}
              title={preset}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}
