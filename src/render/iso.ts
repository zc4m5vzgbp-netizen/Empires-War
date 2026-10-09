// Proyección isométrica 2:1. Matemática pura, sin Phaser, para poder probarla.
export const TILE_W = 64;
export const TILE_H = 32;

/** Centro de la casilla (x, y) en coordenadas de mundo dibujado (píxeles a zoom 1). */
export function tileToWorld(x: number, y: number): { x: number; y: number } {
  return {
    x: (x - y) * (TILE_W / 2),
    y: (x + y) * (TILE_H / 2) + TILE_H / 2,
  };
}

/** Inversa de tileToWorld: devuelve coordenadas de casilla con decimales. */
export function worldToTile(px: number, py: number): { x: number; y: number } {
  const a = px / (TILE_W / 2);
  const b = (py - TILE_H / 2) / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** Rectángulo que contiene el rombo del mapa completo. */
export function mapBounds(width: number, height: number): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: -height * (TILE_W / 2),
    maxX: width * (TILE_W / 2),
    minY: 0,
    maxY: (width + height) * (TILE_H / 2),
  };
}
