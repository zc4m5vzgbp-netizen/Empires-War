import { tileToWorld, worldToTile } from './iso.ts';

// Geometría y planificación del suelo por bloques visibles. Pura: sin Phaser, probada en tests/terrain-chunks.test.ts.
//
// El suelo se divide en bloques de CHUNK × CHUNK casillas. Cada bloque se pinta en su propia textura de render,
// pero SOLO mientras está cerca de la cámara: la memoria depende del tamaño de la pantalla y del zoom, no del mapa.
// Con zoom bajo se pinta a media resolución (nivel 1): a ese zoom la pantalla no puede mostrar más detalle.

export const CHUNK = 8;
/** Márgenes del dibujo de una casilla respecto a su centro (las casillas del atlas miden 64×64 con el rombo en (32, 40)). */
export const TILE_ART = { left: 32, up: 40, down: 24 } as const;
/** Ancho y alto de la textura de un bloque completo a resolución 1. Todos los bloques caben en este tamaño. */
export const CHUNK_TEXTURE = { w: CHUNK * 64, h: CHUNK * 32 + 32 } as const;

export interface ChunkInfo {
  /** Índice estable (fila por fila); también fija el orden de dibujo entre bloques, igual que el pintado completo anterior. */
  index: number;
  /** Primera casilla del bloque (incluida) y última (incluida). */
  tx0: number;
  ty0: number;
  tx1: number;
  ty1: number;
  /** Rectángulo del dibujo en coordenadas de mundo. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ChunkGrid {
  cols: number;
  rows: number;
  chunks: ChunkInfo[];
}

export function chunkGrid(width: number, height: number): ChunkGrid {
  const cols = Math.ceil(width / CHUNK);
  const rows = Math.ceil(height / CHUNK);
  const chunks: ChunkInfo[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tx0 = c * CHUNK;
      const ty0 = r * CHUNK;
      const tx1 = Math.min(tx0 + CHUNK, width) - 1;
      const ty1 = Math.min(ty0 + CHUNK, height) - 1;
      const minX = tileToWorld(tx0, ty1).x - TILE_ART.left;
      const maxX = tileToWorld(tx1, ty0).x + TILE_ART.left;
      const minY = tileToWorld(tx0, ty0).y - TILE_ART.up;
      const maxY = tileToWorld(tx1, ty1).y + TILE_ART.down;
      chunks.push({ index: r * cols + c, tx0, ty0, tx1, ty1, x: minX, y: minY, w: Math.ceil(maxX - minX), h: Math.ceil(maxY - minY) });
    }
  }
  return { cols, rows, chunks };
}

export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bloques cuyo dibujo toca el rectángulo de vista ampliado en `margin` px de mundo, del más cercano al centro al más lejano. */
export function chunksInView(grid: ChunkGrid, view: ViewRect, margin = 0): number[] {
  const x0 = view.x - margin;
  const y0 = view.y - margin;
  const x1 = view.x + view.w + margin;
  const y1 = view.y + view.h + margin;
  // Casillas de las cuatro esquinas (más el margen del dibujo): acota qué filas y columnas de bloques mirar.
  const corners = [worldToTile(x0, y0 - TILE_ART.down), worldToTile(x1, y0 - TILE_ART.down), worldToTile(x0, y1 + TILE_ART.up), worldToTile(x1, y1 + TILE_ART.up)];
  // ±3 casillas: cubre lo que el dibujo de una casilla sobresale de su rombo (32 px a los lados, 40 arriba, 24 abajo).
  const minTx = Math.min(...corners.map((t) => t.x)) - 3;
  const maxTx = Math.max(...corners.map((t) => t.x)) + 3;
  const minTy = Math.min(...corners.map((t) => t.y)) - 3;
  const maxTy = Math.max(...corners.map((t) => t.y)) + 3;
  const c0 = Math.max(0, Math.floor(minTx / CHUNK));
  const c1 = Math.min(grid.cols - 1, Math.floor(maxTx / CHUNK));
  const r0 = Math.max(0, Math.floor(minTy / CHUNK));
  const r1 = Math.min(grid.rows - 1, Math.floor(maxTy / CHUNK));
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;
  const out: { i: number; d: number }[] = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const ch = grid.chunks[r * grid.cols + c]!;
      if (ch.x + ch.w <= x0 || ch.x >= x1 || ch.y + ch.h <= y0 || ch.y >= y1) continue;
      const dx = ch.x + ch.w / 2 - cx;
      const dy = ch.y + ch.h / 2 - cy;
      out.push({ i: ch.index, d: dx * dx + dy * dy });
    }
  }
  out.sort((a, b) => a.d - b.d || a.i - b.i);
  return out.map((o) => o.i);
}

/** Nivel de detalle según el zoom, con histéresis para no cambiar de nivel en cada gesto. 0 = completo, 1 = mitad. */
export function terrainLevel(zoom: number, current: 0 | 1): 0 | 1 {
  if (current === 0) return zoom < 0.48 ? 1 : 0;
  return zoom > 0.52 ? 0 : 1;
}

export interface StreamPlan {
  /** Bloques que hay que pintar ya (dentro de la vista), en orden de prioridad. */
  paint: number[];
  /** Bloques que ya no hacen falta (fuera de la vista + margen de retención). */
  release: number[];
}

/**
 * Qué pintar y qué liberar. `wanted` = bloques en vista (+ margen de precarga); `keep` = bloques que se conservan
 * aunque ya no estén en vista (margen mayor: evita pintar y liberar el mismo bloque al mover un poco la cámara).
 * `budget` limita los bloques pintados por fotograma, salvo los que están en pantalla en el primer fotograma.
 */
export function planStream(active: ReadonlySet<number>, wanted: readonly number[], keep: ReadonlySet<number>, budget: number): StreamPlan {
  const paint: number[] = [];
  for (const i of wanted) {
    if (paint.length >= budget) break;
    if (!active.has(i)) paint.push(i);
  }
  const release: number[] = [];
  for (const i of active) if (!keep.has(i)) release.push(i);
  release.sort((a, b) => a - b);
  return { paint, release };
}
