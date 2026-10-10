import { Polygon, Point } from './types';

const API_BASE = 'http://localhost:8000/api';

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
    const res = await fetch('http://localhost:8000/health');
    return res.ok;
  } catch {
    return false;
  }
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
