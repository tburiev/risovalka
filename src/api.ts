import { Polygon, Point } from './types';

// Динамическое определение API URL
// Для production используем Render, для localhost - локальный сервер
const API_URL = (() => {
  // Проверяем переменную окружения Vite
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Если приложение запущено на Render/Vercel, используем Render API
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }
  
  // Production: используем Render API
  // Замените на ваш реальный URL бэкенда
  return 'https://risovalka-7pnh.onrender.com/api';
})();

const API_BASE = API_URL;
const API_BASE = 'https://risovalka-7pnh.onrender.com/api';

// ============ Polygon API ============

export async function fetchPolygons(): Promise<Polygon[]> {
  const res = await fetch(`${API_BASE}/polygons`);
  if (!res.ok) throw new Error('Failed to fetch polygons');
  const data = await res.json();
  return data.polygons.map(mapApiPolygon);
}

export async function createPolygon(polygon: Polygon): Promise<Polygon> {
  const body = {
    id: polygon.id,
    fill: polygon.fill,
    stroke: polygon.stroke,
    stroke_width: polygon.strokeWidth,
    opacity: polygon.opacity,
    points: polygon.points.map((p, i) => ({ x: p.x, y: p.y, order_index: i })),
  };
  const res = await fetch(`${API_BASE}/polygons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create polygon');
  const data = await res.json();
  return mapApiPolygon(data);
}

export async function updatePolygon(id: string, updates: Partial<Polygon>): Promise<Polygon> {
  const body: Record<string, any> = {};
  if (updates.fill !== undefined) body.fill = updates.fill;
  if (updates.stroke !== undefined) body.stroke = updates.stroke;
  if (updates.strokeWidth !== undefined) body.stroke_width = updates.strokeWidth;
  if (updates.opacity !== undefined) body.opacity = updates.opacity;

  const res = await fetch(`${API_BASE}/polygons/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update polygon');
  const data = await res.json();
  return mapApiPolygon(data);
}

export async function deletePolygon(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/polygons/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete polygon');
}

export async function deleteAllPolygons(): Promise<void> {
  const res = await fetch(`${API_BASE}/polygons`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete all polygons');
}

// ============ Points API ============

export async function replacePoints(polygonId: string, points: Point[]): Promise<Polygon> {
  const body = points.map((p, i) => ({ x: p.x, y: p.y, order_index: i }));
  const res = await fetch(`${API_BASE}/polygons/${polygonId}/points`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to replace points');
  const data = await res.json();
  return mapApiPolygon(data);
}

export async function addPoint(polygonId: string, point: Point, position?: number): Promise<Polygon> {
  const url = position !== undefined
    ? `${API_BASE}/polygons/${polygonId}/points?position=${position}`
    : `${API_BASE}/polygons/${polygonId}/points`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x: point.x, y: point.y }),
  });
  if (!res.ok) throw new Error('Failed to add point');
  const data = await res.json();
  return mapApiPolygon(data);
}

export async function deletePoint(polygonId: string, pointId: number): Promise<Polygon> {
  const res = await fetch(`${API_BASE}/polygons/${polygonId}/points/${pointId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete point');
  const data = await res.json();
  return mapApiPolygon(data);
}

export async function movePoint(polygonId: string, pointId: number, x: number, y: number): Promise<void> {
  const res = await fetch(`${API_BASE}/polygons/${polygonId}/points/${pointId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x, y }),
  });
  if (!res.ok) throw new Error('Failed to move point');
}

// ============ Layer Order API ============

export async function bringToFront(polygonId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/polygons/${polygonId}/bring-to-front`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to bring to front');
}

export async function sendToBack(polygonId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/polygons/${polygonId}/send-to-back`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to send to back');
}

// ============ Health Check ============

export async function checkHealth(): Promise<boolean> {
  try {
    const baseUrl = API_BASE.replace('/api', '');
    console.log('Checking API health at:', baseUrl);
    const res = await fetch(`${baseUrl}/health`);
    console.log('Health check response:', res.status);
    return res.ok;
  } catch (err) {
    console.error('Health check failed:', err);
    return false;
  }
}

// ============ Visitor Tracking ============

export async function trackVisit(): Promise<void> {
  try {
    console.log('Tracking visit at:', `${API_BASE}/visitors/track`);
    const res = await fetch(`${API_BASE}/visitors/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('Track visit response:', res.status);
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Track visit error:', errorText);
      throw new Error(`Failed to track visit: ${res.status}`);
    }
  } catch (err) {
    console.error('Track visit exception:', err);
    throw err;
  }
}

export interface Visitor {
  id: number;
  ip_address: string;
  user_agent: string;
  browser: string;
  country: string | null;
  city: string | null;
  last_visit: string;
  visit_count: number;
}

export async function fetchVisitors(): Promise<Visitor[]> {
  const res = await fetch(`${API_BASE}/visitors`);
  if (!res.ok) throw new Error('Failed to fetch visitors');
  const data = await res.json();
  return data.visitors;
}

// ============ Helpers ============

interface ApiPolygon {
  id: string;
  fill: string;
  stroke: string;
  stroke_width: number;
  opacity: number;
  z_index: number;
  points: { id: number; x: number; y: number; order_index: number }[];
}

function mapApiPolygon(api: ApiPolygon): Polygon {
  const sortedPoints = [...api.points].sort((a, b) => a.order_index - b.order_index);
  return {
    id: api.id,
    fill: api.fill,
    stroke: api.stroke,
    strokeWidth: api.stroke_width,
    opacity: api.opacity,
    points: sortedPoints.map(p => ({ x: p.x, y: p.y })),
  };
}
