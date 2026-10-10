export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  id: string;
  points: Point[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export type Tool = 'select' | 'draw' | 'move-point' | 'add-point' | 'delete-point';
