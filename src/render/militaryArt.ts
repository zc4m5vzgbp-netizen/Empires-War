import type * as Phaser from 'phaser';
import { DIRS } from './art.ts';

// Arte militar de 0 A.D. (Wildfire Games, CC-BY-SA 3.0), renderizado a sprites por scripts/art/zeroad.py y
// empaquetado por scripts/art/build-0ad-atlas.py. Créditos en public/assets/0ad/CREDITS.md.
// Solo se carga cuando se usa (de momento, la galería): no pesa en la partida normal.

export const MIL = 'mil';
export const MIL_UNITS = ['swordsman', 'archer'] as const;
export type MilUnit = (typeof MIL_UNITS)[number];
export const MIL_ANIMS = ['idle', 'walk', 'attack', 'death'] as const;
export type MilAnim = (typeof MIL_ANIMS)[number];

export function preloadMilitary(scene: Phaser.Scene): void {
  const base = `${import.meta.env.BASE_URL}assets/0ad/`;
  scene.load.atlas(MIL, `${base}atlas.png`, `${base}atlas.json`);
}

export const milAnimKey = (unit: MilUnit, anim: MilAnim, dir: number) => `mil/${unit}/${anim}/${dir}`;
export const milFrame = (unit: MilUnit, anim: MilAnim, dir: number, i = 0) => `mil/${unit}/${anim}/${dir}/${i}`;

/** Velocidad de cada animación (fotogramas por segundo) y si se repite. La muerte se queda en el último fotograma. */
const ANIM_SPEC: Record<MilAnim, { fps: number; repeat: number }> = {
  idle: { fps: 1, repeat: -1 },
  walk: { fps: 10, repeat: -1 },
  attack: { fps: 10, repeat: -1 },
  death: { fps: 8, repeat: 0 },
};

/** Crea las animaciones de las unidades militares. Devuelve cuántas creó (para las pruebas). */
export function createMilitaryAnimations(scene: Phaser.Scene): number {
  if (!scene.textures.exists(MIL)) return 0;
  const names = new Set(scene.textures.get(MIL).getFrameNames());
  let created = 0;
  for (const unit of MIL_UNITS) {
    for (const anim of MIL_ANIMS) {
      for (const dir of DIRS) {
        const key = milAnimKey(unit, anim, dir);
        const frames: { key: string; frame: string }[] = [];
        for (let i = 0; names.has(milFrame(unit, anim, dir, i)); i++) frames.push({ key: MIL, frame: milFrame(unit, anim, dir, i) });
        if (frames.length === 0 || scene.anims.exists(key)) continue;
        scene.anims.create({ key, frames, frameRate: ANIM_SPEC[anim].fps, repeat: ANIM_SPEC[anim].repeat });
        created++;
      }
    }
  }
  return created;
}

/** ¿Galería de estilo activada? (?galeria=1 en la dirección, o la vista previa compilada con VITE_GALERIA=1). */
export function galleryEnabled(): boolean {
  return new URLSearchParams(location.search).has('galeria') || import.meta.env.VITE_GALERIA === '1';
}
