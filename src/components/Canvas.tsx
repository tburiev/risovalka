import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Polygon, Point, Tool } from '../types';

interface CanvasProps {
  svgRef: React.RefObject<SVGSVGElement>;
  polygons: Polygon[];
  currentPoints: Point[];
  selectedId: string | null;
  tool: Tool;
  currentColor: string;
  currentOpacity: number;
  onCanvasClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onPointMouseDown: (e: React.MouseEvent, polygonId: string, pointIndex: number) => void;
  onPolygonClick: (e: React.MouseEvent, polygonId: string) => void;
  // Pan & Zoom
  viewBox: { x: number; y: number; w: number; h: number };
  isPanning: boolean;
  onPanStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onPanMove: (e: React.MouseEvent | React.TouchEvent) => void;
  onPanEnd: () => void;
}

export default function Canvas({
  svgRef,
  polygons,
  currentPoints,
  selectedId,
  tool,
  currentColor,
  currentOpacity,
  onCanvasClick,
  onDoubleClick,
  onMouseMove,
  onMouseUp,
  onPointMouseDown,
  onPolygonClick,
  viewBox,
  isPanning,
  onPanStart,
  onPanMove,
  onPanEnd,
}: CanvasProps) {
  const getPointsString = (points: Point[]): string => {
    return points.map(p => `${p.x},${p.y}`).join(' ');
  };

  const getCursorStyle = (): string => {
    if (isPanning) return 'grabbing';
    switch (tool) {
      case 'draw': return 'crosshair';
      case 'select': return 'default';
      case 'move-point': return 'move';
      case 'add-point': return 'cell';
      case 'delete-point': return 'not-allowed';
      default: return 'default';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Средняя кнопка мыши или Space+клик = pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      onPanStart(e);
      return;
    }
    // Правая кнопка = pan
    if (e.button === 2) {
      onPanStart(e);
      return;
    }
    onCanvasClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      onPanMove(e);
      return;
    }
    onMouseMove(e);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      onPanEnd();
      return;
    }
    onMouseUp();
  };

  // Touch events для мобильных
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Два пальца = pan
      onPanStart(e);
    } else if (e.touches.length === 1 && tool === 'select') {
      // Один палец в режиме выбора = pan
      onPanStart(e);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning || e.touches.length === 2) {
      onPanMove(e);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isPanning) {
      onPanEnd();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <svg
      ref={svgRef}
      className="w-full h-full bg-white"
      style={{ cursor: getCursorStyle(), touchAction: 'none' }}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      preserveAspectRatio="xMidYMid meet"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={onDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      {/* Grid pattern */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5" />
        </pattern>
        <pattern id="grid-large" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e5e5e5" strokeWidth="1" />
        </pattern>
      </defs>
      
      {/* Background with grid */}
      <rect x={viewBox.x - 10000} y={viewBox.y - 10000} width={viewBox.w + 20000} height={viewBox.h + 20000} fill="url(#grid)" />
      <rect x={viewBox.x - 10000} y={viewBox.y - 10000} width={viewBox.w + 20000} height={viewBox.h + 20000} fill="url(#grid-large)" />

      {/* Origin marker */}
      <line x1="-20" y1="0" x2="20" y2="0" stroke="#d1d5db" strokeWidth="1" />
      <line x1="0" y1="-20" x2="0" y2="20" stroke="#d1d5db" strokeWidth="1" />

      {/* Existing polygons */}
      {polygons.map(polygon => (
        <g key={polygon.id}>
          <polygon
            points={getPointsString(polygon.points)}
            fill={polygon.fill}
            fillOpacity={polygon.opacity}
            stroke={polygon.id === selectedId ? '#2563eb' : polygon.stroke}
            strokeWidth={polygon.id === selectedId ? 3 : polygon.strokeWidth}
            strokeDasharray={polygon.id === selectedId ? '5,5' : 'none'}
            onClick={(e) => onPolygonClick(e, polygon.id)}
            style={{ cursor: tool === 'select' ? 'pointer' : getCursorStyle() }}
          />
          {/* Vertex points for selected polygon */}
          {polygon.id === selectedId && (tool === 'move-point' || tool === 'delete-point') && (
            polygon.points.map((point, idx) => (
              <circle
                key={idx}
                cx={point.x}
                cy={point.y}
                r={tool === 'delete-point' ? 8 : 6}
                fill={tool === 'delete-point' ? '#ef4444' : '#2563eb'}
                stroke="white"
                strokeWidth={2}
                style={{ cursor: tool === 'delete-point' ? 'not-allowed' : 'grab' }}
                onMouseDown={(e) => onPointMouseDown(e, polygon.id, idx)}
              />
            ))
          )}
          {/* Vertex labels */}
          {polygon.id === selectedId && (tool === 'move-point' || tool === 'delete-point') && (
            polygon.points.map((point, idx) => (
              <text
                key={`label-${idx}`}
                x={point.x}
                y={point.y - 12}
                textAnchor="middle"
                fontSize="10"
                fill="#374151"
                className="pointer-events-none select-none"
              >
                {idx + 1}
              </text>
            ))
          )}
        </g>
      ))}

      {/* Current drawing polygon */}
      {currentPoints.length > 0 && (
        <g>
          {currentPoints.length >= 2 && (
            <polyline
              points={getPointsString(currentPoints)}
              fill="none"
              stroke={currentColor}
              strokeWidth={2}
              strokeDasharray="4,4"
              opacity={0.8}
            />
          )}
          {currentPoints.map((point, idx) => (
            <g key={idx}>
              <circle
                cx={point.x}
                cy={point.y}
                r={5}
                fill={currentColor}
                stroke="white"
                strokeWidth={2}
              />
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#374151"
                className="pointer-events-none select-none"
              >
                {idx + 1}
              </text>
            </g>
          ))}
          {currentPoints.length >= 3 && (
            <line
              x1={currentPoints[currentPoints.length - 1].x}
              y1={currentPoints[currentPoints.length - 1].y}
              x2={currentPoints[0].x}
              y2={currentPoints[0].y}
              stroke={currentColor}
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.4}
            />
          )}
        </g>
      )}

      {/* Preview polygon fill */}
      {currentPoints.length >= 3 && (
        <polygon
          points={getPointsString(currentPoints)}
          fill={currentColor}
          fillOpacity={currentOpacity * 0.3}
          stroke="none"
          className="pointer-events-none"
        />
      )}
    </svg>
  );
}
