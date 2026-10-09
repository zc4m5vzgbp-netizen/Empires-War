import type * as Phaser from 'phaser';
import { TerrainKind } from '../content/terrain.ts';
import { TILE_H, TILE_W } from './iso.ts';

// Arte provisional original, generado por código (sin archivos de terceros).
// Se sustituirá por sprites propios sin tocar la simulación.
const PALETTE: Record<TerrainKind, readonly [number, number]> = {
  [TerrainKind.Grass]: [0x5f8a46, 0x58823f],
  [TerrainKind.Dirt]: [0x9a7a52, 0x92724b],
  [TerrainKind.Water]: [0x2f6690, 0x2b5f86],
  [TerrainKind.Forest]: [0x3f6236, 0x3a5b31],
};
const EDGE_LIGHT = 0xffffff;
const EDGE_DARK = 0x000000;

export const TILE_VARIANTS = 2;
export const tileKey = (kind: number, variant: number) => `tile-${kind}-${variant}`;
export const TREE_KEY = 'tree';

// El rombo se dibuja 2 px más grande que la casilla para que no se vean juntas entre casillas.
const PAD = 1;
const TEX_W = TILE_W + PAD * 2;
const TEX_H = TILE_H + PAD * 2;

type Pt = { x: number; y: number };

/** Traza un polígono con la API de rutas de Graphics (válida en Phaser 4). */
function tracePolygon(g: Phaser.GameObjects.Graphics, pts: readonly Pt[]): void {
  const [first, ...rest] = pts;
  if (!first) return;
  g.beginPath();
  g.moveTo(first.x, first.y);
  for (const p of rest) g.lineTo(p.x, p.y);
  g.closePath();
}

/** Esquinas del rombo: arriba, derecha, abajo, izquierda. */
function diamond(inset = 0): [Pt, Pt, Pt, Pt] {
  const cx = TEX_W / 2;
  const cy = TEX_H / 2;
  const hw = TEX_W / 2 - inset;
  const hh = TEX_H / 2 - inset / 2;
  return [
    { x: cx, y: cy - hh },
    { x: cx + hw, y: cy },
    { x: cx, y: cy + hh },
    { x: cx - hw, y: cy },
  ];
}

export function createProvisionalTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.setVisible(false);

  for (const kind of Object.values(TerrainKind)) {
    for (let v = 0; v < TILE_VARIANTS; v++) {
      g.clear();
      g.fillStyle(PALETTE[kind][v] ?? 0xff00ff, 1);
      tracePolygon(g, diamond());
      g.fillPath();
      // Borde superior iluminado e inferior sombreado: da volumen sin texturas externas.
      const [top, right, bottom, left] = diamond(1);
      g.lineStyle(1, EDGE_LIGHT, 0.08);
      g.lineBetween(left.x, left.y, top.x, top.y);
      g.lineBetween(top.x, top.y, right.x, right.y);
      g.lineStyle(1, EDGE_DARK, 0.12);
      g.lineBetween(left.x, left.y, bottom.x, bottom.y);
      g.lineBetween(bottom.x, bottom.y, right.x, right.y);
      if (kind === TerrainKind.Water) {
        g.lineStyle(1, EDGE_LIGHT, 0.18);
        g.lineBetween(TEX_W * 0.38, TEX_H * 0.45, TEX_W * 0.5 + v * 4, TEX_H * 0.45);
        g.lineBetween(TEX_W * 0.5, TEX_H * 0.62, TEX_W * 0.62 - v * 4, TEX_H * 0.62);
      }
      g.generateTexture(tileKey(kind, v), TEX_W, TEX_H);
    }
  }

  // Árbol provisional: tronco y copa.
  g.clear();
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(32, 74, 34, 12);
  g.fillStyle(0x5b3d24, 1);
  g.fillRect(29, 50, 6, 24);
  g.fillStyle(0x2e5229, 1);
  g.fillEllipse(32, 40, 40, 44);
  g.fillStyle(0x3d6b35, 1);
  g.fillEllipse(26, 32, 22, 22);
  g.generateTexture(TREE_KEY, 64, 82);

  g.destroy();
}
