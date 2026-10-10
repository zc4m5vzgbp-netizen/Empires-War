import type * as Phaser from 'phaser';
import type { BuildingType } from '../content/economy.ts';
import { TILE_H, TILE_W } from './iso.ts';
import { CAMP, CAMP_DRAWN_TILES, CAMP_FRAMES } from './campArt.ts';

// Arte de terceros con licencia compatible: gráficos de Unknown Horizons (CC-BY-SA 3.0).
// Atlas generado por scripts/art/build-uh-atlas.py; créditos en public/assets/uh/CREDITS.md.
// Si el atlas no carga, el juego sigue con el arte provisional generado por código (textures.ts).

export const ART = 'uh';

export function preloadArt(scene: Phaser.Scene): void {
  const base = `${import.meta.env.BASE_URL}assets/uh/`;
  scene.load.atlas(ART, `${base}atlas.png`, `${base}atlas.json`);
}

export const artReady = (scene: Phaser.Scene) => scene.textures.exists(ART);

export const GRASS_VARIANTS = 6;
export const TREES = ['maple0', 'maple1', 'maple2', 'maple3', 'spruce0', 'spruce1', 'tupelo0', 'tupelo1', 'tupelo2', 'birch0'];

/** Edificio de la partida → fotograma del atlas y tamaño (en casillas) para el que se dibujó. */
export interface BuildingArt { frame: string; drawnSize: number; anim?: string; /** Textura (atlas); por defecto ART. */ texture?: string }
export const ART_BUILDINGS: Partial<Record<BuildingType, BuildingArt>> = {
  townCenter: { frame: 'bld/townCenter', drawnSize: 3 },
  mill: { frame: 'bld/mill/0', drawnSize: 2, anim: 'bld/mill' },
  // Campamentos de 0 A.D. (atlas propio «camp», ver campArt.ts).
  lumberCamp: { frame: CAMP_FRAMES.lumberCamp, drawnSize: CAMP_DRAWN_TILES, texture: CAMP },
  miningCamp: { frame: CAMP_FRAMES.miningCamp, drawnSize: CAMP_DRAWN_TILES, texture: CAMP },
};

/** Arte de atlas de un edificio, solo si su textura está cargada; si no, undefined (arte provisional). */
export function buildingArt(scene: Phaser.Scene, type: BuildingType): (BuildingArt & { texture: string }) | undefined {
  const a = ART_BUILDINGS[type];
  const texture = a?.texture ?? ART;
  if (!a || !scene.textures.exists(texture) || !scene.textures.get(texture).has(a.frame)) return undefined;
  return { ...a, texture };
}

/** Ancla (pies o centro de la huella) guardada en el atlas por el script de construcción. */
export function pivot(scene: Phaser.Scene, frame: string, texture = ART): { x: number; y: number } {
  const f = scene.textures.getFrame(texture, frame) as Phaser.Textures.Frame & { pivotX?: number; pivotY?: number; customPivot?: boolean };
  return f?.customPivot ? { x: f.pivotX ?? 0.5, y: f.pivotY ?? 0.5 } : { x: 0.5, y: 0.8 };
}

// Direcciones de los sprites (grados en pantalla, 0 = derecha, 90 = arriba).
export const DIRS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
export type Dir = (typeof DIRS)[number];

/** Dirección del sprite según el desplazamiento en casillas (dx, dy). */
export function dirFromTileDelta(dx: number, dy: number): Dir {
  const sx = (dx - dy) * (TILE_W / 2);
  const sy = (dx + dy) * (TILE_H / 2);
  const deg = (Math.atan2(-sy, sx) * 180) / Math.PI;
  const idx = ((Math.round(deg / 45) % 8) + 8) % 8;
  return DIRS[idx]!;
}

const UNIT_ANIMS: { prefix: string; fps: number; repeat: number }[] = [
  { prefix: 'vil/walk', fps: 8, repeat: -1 },
  { prefix: 'vil/carry', fps: 8, repeat: -1 },
  { prefix: 'sol/walk', fps: 8, repeat: -1 },
  { prefix: 'sol/attack', fps: 8, repeat: -1 },
];

/** Crea las animaciones una sola vez (las comparten todos los sprites). */
export function createArtAnimations(scene: Phaser.Scene): void {
  const anims = scene.anims;
  const names = scene.textures.get(ART).getFrameNames();
  const framesOf = (prefix: string) =>
    names
      .filter((n) => n.startsWith(`${prefix}/`))
      .sort((a, b) => Number(a.split('/').pop()) - Number(b.split('/').pop()))
      .map((frame) => ({ key: ART, frame }));
  for (const { prefix, fps, repeat } of UNIT_ANIMS) {
    for (const d of DIRS) {
      const key = `${prefix}/${d}`;
      if (!anims.exists(key)) anims.create({ key, frames: framesOf(key), frameRate: fps, repeat });
    }
  }
  if (!anims.exists('bld/mill')) anims.create({ key: 'bld/mill', frames: framesOf('bld/mill'), frameRate: 12, repeat: -1 });
}

/** Número pseudoaleatorio estable por casilla (variación de terreno sin usar el RNG de la simulación). */
export function tileNoise(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
