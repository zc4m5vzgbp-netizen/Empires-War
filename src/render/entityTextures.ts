import type * as Phaser from 'phaser';
import { BUILDINGS, type BuildingType } from '../content/economy.ts';
import { TILE_H, TILE_W } from './iso.ts';

// Arte provisional original de entidades, generado por código. Reemplazable sin tocar la simulación.

type Pt = { x: number; y: number };

export const PLAYER_COLOR = 0x2f63c9;
const PLAYER_COLOR_DARK = 0x214a99;

export const VILLAGER_KEY = 'villager';
/** Punto del sprite del aldeano que coincide con sus pies. */
export const VILLAGER_ORIGIN = { x: 0.5, y: 36 / 40 };
/** Altura (px a zoom 1) del centro del cuerpo sobre los pies; se usa para tocar al aldeano. */
export const VILLAGER_BODY_OFFSET = 16;
export const RING_KEY = 'selection-ring';
export const CARRY_FOOD_KEY = 'carry-food';
export const BUSH_KEY = 'berry-bush';
export const BUSH_ORIGIN = { x: 0.5, y: 30 / 36 };
export const MARKER_KEY = 'move-marker';

export const buildingKey = (type: BuildingType) => `building-${type}`;
export const foundationKey = (size: number) => `foundation-${size}`;
export const footprintKey = (size: number, valid: boolean) => `footprint-${size}-${valid ? 'ok' : 'bad'}`;
export const outlineKey = (size: number) => `outline-${size}`;

/** Origen de cada textura de edificio: el centro de su base coincide con el centro de la huella. */
export const BUILDING_ORIGIN: Partial<Record<BuildingType, Pt>> = {};
// Altura aproximada de las paredes para aceptar toques sobre el edificio (cubre el arte del atlas, más alto).
export const BUILDING_WALL: Record<BuildingType, number> = { townCenter: 80, mill: 56 };

function polygon(g: Phaser.GameObjects.Graphics, pts: readonly Pt[], color: number, alpha = 1): void {
  const [first, ...rest] = pts;
  if (!first) return;
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(first.x, first.y);
  for (const p of rest) g.lineTo(p.x, p.y);
  g.closePath();
  g.fillPath();
}

function outline(g: Phaser.GameObjects.Graphics, pts: readonly Pt[], color: number, width: number, alpha = 1): void {
  const [first, ...rest] = pts;
  if (!first) return;
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(first.x, first.y);
  for (const p of rest) g.lineTo(p.x, p.y);
  g.closePath();
  g.strokePath();
}

/** Rombo de una huella de `size` casillas centrado en (cx, cy). */
function footprintDiamond(size: number, cx: number, cy: number, inset = 0): [Pt, Pt, Pt, Pt] {
  const hw = (size * TILE_W) / 2 - inset;
  const hh = (size * TILE_H) / 2 - inset / 2;
  return [
    { x: cx, y: cy - hh },
    { x: cx + hw, y: cy },
    { x: cx, y: cy + hh },
    { x: cx - hw, y: cy },
  ];
}

interface BoxStyle {
  wallLeft: number;
  wallRight: number;
  roofBack: number;
  roofLeft: number;
  roofRight: number;
  roofHeightRatio: number;
}

function drawBuilding(g: Phaser.GameObjects.Graphics, type: BuildingType, style: BoxStyle): void {
  const size = BUILDINGS[type].size;
  const wall = BUILDING_WALL[type];
  const hw = (size * TILE_W) / 2;
  const hh = (size * TILE_H) / 2;
  const apex = hh * style.roofHeightRatio;
  const W = Math.ceil(2 * hw + 4);
  const H = Math.ceil(2 * hh + wall + apex + 4);
  const cx = W / 2;
  const baseCy = H - hh - 2;
  const [top, right, bottom, left] = footprintDiamond(size, cx, baseCy);
  const up = (p: Pt) => ({ x: p.x, y: p.y - wall });
  const peak = { x: cx, y: baseCy - wall - apex };

  g.clear();
  polygon(g, [left, bottom, up(bottom), up(left)], style.wallLeft);
  polygon(g, [bottom, right, up(right), up(bottom)], style.wallRight);
  polygon(g, [up(left), up(top), peak], style.roofBack);
  polygon(g, [up(top), up(right), peak], style.roofBack);
  polygon(g, [up(left), up(bottom), peak], style.roofLeft);
  polygon(g, [up(bottom), up(right), peak], style.roofRight);
  // Puerta en la pared derecha.
  const doorW = 10 + size * 2;
  const t = 0.5;
  const dx = bottom.x + (right.x - bottom.x) * t;
  const dy = bottom.y + (right.y - bottom.y) * t;
  polygon(g, [
    { x: dx - doorW / 2, y: dy + doorW / 4 },
    { x: dx + doorW / 2, y: dy - doorW / 4 },
    { x: dx + doorW / 2, y: dy - doorW / 4 - wall * 0.55 },
    { x: dx - doorW / 2, y: dy + doorW / 4 - wall * 0.55 },
  ], 0x2b1d12);
  outline(g, [left, bottom, right, up(right), peak, up(left)], 0x000000, 1, 0.25);
  if (type === 'mill') {
    // Aspas del molino.
    g.lineStyle(3, 0xe8dcc0, 1);
    const hub = { x: cx, y: baseCy - wall - apex * 0.45 };
    g.lineBetween(hub.x - 22, hub.y - 22, hub.x + 22, hub.y + 22);
    g.lineBetween(hub.x - 22, hub.y + 22, hub.x + 22, hub.y - 22);
    g.fillStyle(0x5b3d24, 1);
    g.fillCircle(hub.x, hub.y, 4);
  }
  g.generateTexture(buildingKey(type), W, H);
  BUILDING_ORIGIN[type] = { x: 0.5, y: baseCy / H };
}

export function createEntityTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.setVisible(false);

  // Aldeano: sombra, piernas, túnica del color del jugador y cabeza.
  g.clear();
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(14, 36, 18, 7);
  g.fillStyle(0x4a3524, 1);
  g.fillRect(9, 26, 4, 10);
  g.fillRect(15, 26, 4, 10);
  g.fillStyle(PLAYER_COLOR, 1);
  g.fillEllipse(14, 22, 16, 18);
  g.fillStyle(PLAYER_COLOR_DARK, 1);
  g.fillRect(7, 24, 14, 3);
  g.fillStyle(0xe2b68c, 1);
  g.fillCircle(14, 10, 5.5);
  g.fillStyle(0x6b4a2c, 1);
  g.fillEllipse(14, 6, 12, 5);
  g.generateTexture(VILLAGER_KEY, 28, 40);

  // Anillo de selección.
  g.clear();
  g.lineStyle(2, 0xfff3c4, 1);
  g.strokeEllipse(17, 8, 30, 12);
  g.generateTexture(RING_KEY, 34, 16);

  // Carga de comida.
  g.clear();
  g.fillStyle(0x7a1f2b, 1);
  g.fillCircle(5, 5, 5);
  g.fillStyle(0xd83a50, 1);
  g.fillCircle(4, 4, 3);
  g.generateTexture(CARRY_FOOD_KEY, 10, 10);

  // Arbusto de bayas.
  g.clear();
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(22, 30, 34, 10);
  g.fillStyle(0x2f5e2a, 1);
  g.fillEllipse(22, 20, 36, 22);
  g.fillStyle(0x3f7a35, 1);
  g.fillEllipse(17, 15, 20, 14);
  g.fillEllipse(28, 17, 18, 12);
  g.fillStyle(0xc8324a, 1);
  for (const [x, y] of [[12, 18], [19, 12], [26, 15], [31, 21], [22, 23], [15, 24], [28, 9]] as const) g.fillCircle(x, y, 2.6);
  g.generateTexture(BUSH_KEY, 44, 36);

  // Marcador de destino.
  g.clear();
  outline(g, footprintDiamond(1, 33, 17, 8), 0xfff3c4, 2);
  g.generateTexture(MARKER_KEY, 66, 34);

  // Edificios.
  drawBuilding(g, 'townCenter', {
    wallLeft: 0xb7a888,
    wallRight: 0x998b6f,
    roofBack: PLAYER_COLOR_DARK,
    roofLeft: PLAYER_COLOR,
    roofRight: PLAYER_COLOR_DARK,
    roofHeightRatio: 0.9,
  });
  drawBuilding(g, 'mill', {
    wallLeft: 0x8f6c45,
    wallRight: 0x735535,
    roofBack: 0x6d2c22,
    roofLeft: 0x9a4031,
    roofRight: 0x7a3226,
    roofHeightRatio: 1.1,
  });

  // Cimientos, huellas de colocación y contornos de selección por tamaño.
  for (const size of new Set(Object.values(BUILDINGS).map((b) => b.size))) {
    const W = size * TILE_W + 4;
    const H = size * TILE_H + 4;
    const pts = footprintDiamond(size, W / 2, H / 2, 1);
    g.clear();
    polygon(g, pts, 0x7a5a36, 0.75);
    outline(g, pts, 0x3d2a17, 2);
    g.lineStyle(1, 0xc9a66b, 0.6);
    for (let i = 1; i < size * 2; i++) {
      const t = i / (size * 2);
      g.lineBetween(pts[3].x + (pts[0].x - pts[3].x) * t, pts[3].y + (pts[0].y - pts[3].y) * t, pts[2].x + (pts[1].x - pts[2].x) * t, pts[2].y + (pts[1].y - pts[2].y) * t);
    }
    g.generateTexture(foundationKey(size), W, H);
    for (const valid of [true, false]) {
      g.clear();
      polygon(g, pts, valid ? 0x4caf50 : 0xd84a3a, 0.45);
      outline(g, pts, valid ? 0x9dffa0 : 0xff9a8a, 2);
      g.generateTexture(footprintKey(size, valid), W, H);
    }
    g.clear();
    outline(g, pts, 0xfff3c4, 2);
    g.generateTexture(outlineKey(size), W, H);
  }
  g.clear();
  const pts1 = footprintDiamond(1, TILE_W / 2 + 2, TILE_H / 2 + 2, 1);
  outline(g, pts1, 0xfff3c4, 2);
  g.generateTexture(outlineKey(1), TILE_W + 4, TILE_H + 4);

  g.destroy();
}
