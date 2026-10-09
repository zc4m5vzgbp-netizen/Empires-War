import { distanceToRect, isAdjacentToRect, isWalkable, type Occupancy } from './grid.ts';
import type { Tile } from './types.ts';

// Búsqueda de caminos A* sobre la rejilla de casillas, 8 direcciones.
// No corta esquinas: una diagonal solo se permite si las dos casillas laterales son transitables.
// Determinista: los empates se resuelven siempre en el mismo orden.

const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;
const SQRT2 = Math.SQRT2;

/** Distancia octil: coste mínimo entre dos casillas con movimiento en 8 direcciones. */
export function octile(dx: number, dy: number): number {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  return Math.max(ax, ay) + (SQRT2 - 1) * Math.min(ax, ay);
}

class MinHeap {
  private items: { node: number; f: number; h: number; seq: number }[] = [];
  get size() {
    return this.items.length;
  }
  private less(a: number, b: number) {
    const x = this.items[a]!;
    const y = this.items[b]!;
    return x.f !== y.f ? x.f < y.f : x.h !== y.h ? x.h < y.h : x.seq < y.seq;
  }
  private swap(a: number, b: number) {
    const t = this.items[a]!;
    this.items[a] = this.items[b]!;
    this.items[b] = t;
  }
  push(item: { node: number; f: number; h: number; seq: number }) {
    this.items.push(item);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop() {
    const top = this.items[0]!;
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.less(l, m)) m = l;
        if (r < this.items.length && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
}

/**
 * A* genérico. Devuelve las casillas a recorrer (sin incluir la de salida) o null si no hay camino.
 * La casilla de salida se considera transitable aunque esté ocupada.
 */
export function findPath(
  occ: Occupancy,
  start: Tile,
  isGoal: (x: number, y: number) => boolean,
  heuristic: (x: number, y: number) => number,
): Tile[] | null {
  const { width, height } = occ;
  if (isGoal(start.x, start.y)) return [];
  const startNode = start.y * width + start.x;
  const g = new Float64Array(width * height).fill(Infinity);
  const parent = new Int32Array(width * height).fill(-1);
  const closed = new Uint8Array(width * height);
  const open = new MinHeap();
  let seq = 0;
  g[startNode] = 0;
  const h0 = heuristic(start.x, start.y);
  open.push({ node: startNode, f: h0, h: h0, seq: seq++ });

  while (open.size > 0) {
    const { node } = open.pop();
    if (closed[node]) continue;
    closed[node] = 1;
    const x = node % width;
    const y = (node - x) / width;
    if (isGoal(x, y)) {
      const path: Tile[] = [];
      let n = node;
      while (n !== startNode) {
        path.push({ x: n % width, y: Math.floor(n / width) });
        n = parent[n]!;
      }
      return path.reverse();
    }
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!isWalkable(occ, nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!isWalkable(occ, x + dx, y) || !isWalkable(occ, x, y + dy))) continue;
      const next = ny * width + nx;
      if (closed[next]) continue;
      const cost = g[node]! + (dx !== 0 && dy !== 0 ? SQRT2 : 1);
      if (cost < g[next]!) {
        g[next] = cost;
        parent[next] = node;
        const h = heuristic(nx, ny);
        open.push({ node: next, f: cost + h, h, seq: seq++ });
      }
    }
  }
  return null;
}

/** Casilla transitable más cercana a (x, y), recorriendo anillos en orden fijo. */
export function nearestWalkable(occ: Occupancy, x: number, y: number, maxRadius = 12): Tile | null {
  if (isWalkable(occ, x, y)) return { x, y };
  for (let r = 1; r <= maxRadius; r++) {
    let best: Tile | null = null;
    let bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (!isWalkable(occ, x + dx, y + dy)) continue;
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          best = { x: x + dx, y: y + dy };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/** Camino hasta una casilla concreta (o la transitable más cercana si está ocupada). */
export function pathToTile(occ: Occupancy, from: Tile, target: Tile): Tile[] | null {
  const goal = nearestWalkable(occ, target.x, target.y);
  if (!goal) return null;
  return findPath(
    occ,
    from,
    (x, y) => x === goal.x && y === goal.y,
    (x, y) => octile(goal.x - x, goal.y - y),
  );
}

/** Camino hasta cualquier casilla transitable pegada a un rectángulo (recurso o edificio). */
export function pathToAdjacent(occ: Occupancy, from: Tile, rect: { x: number; y: number; w: number; h: number }): Tile[] | null {
  return findPath(
    occ,
    from,
    (x, y) => isAdjacentToRect(x, y, rect),
    (x, y) => Math.max(0, distanceToRect(x, y, rect) - SQRT2),
  );
}
