import type * as Phaser from 'phaser';
import { DIRS } from './art.ts';

// Aldeano con animaciones por tarea, de 0 A.D. (Wildfire Games, CC-BY-SA 3.0): ciudadana celta.
// Atlas: public/assets/0ad-villager/ (scripts/art/zeroad.py + build-0ad-atlas.py). Créditos en su CREDITS.md.
//
// CONTRATO GRÁFICO (acordado con ChatGPT): nombres de animación. La traducción desde los estados de la simulación
// (gather + árbol → chop, etc.) la hace la integración, no este módulo.
// Fotogramas: eco/villager/<anim>/<dir>/<i>   ·   animaciones de Phaser: eco/villager/<anim>/<dir>

export const ECO = 'eco';
export const VILLAGER_ANIMS = [
  'idle',
  'walk',
  'chop',
  'mine',
  'forage',
  'farm',
  'build',
  'carry/wood',
  'carry/stone',
  'carry/gold',
  'carry/food',
  'carry/wood-idle',
  'carry/stone-idle',
  'carry/gold-idle',
  'carry/food-idle',
] as const;
export type VillagerAnim = (typeof VILLAGER_ANIMS)[number];

export function preloadVillagerArt(scene: Phaser.Scene): void {
  const base = `${import.meta.env.BASE_URL}assets/0ad-villager/`;
  scene.load.atlas(ECO, `${base}atlas.png`, `${base}atlas.json`);
}

export const villagerAnimKey = (anim: VillagerAnim, dir: number) => `eco/villager/${anim}/${dir}`;
export const villagerFrame = (anim: VillagerAnim, dir: number, i = 0) => `eco/villager/${anim}/${dir}/${i}`;

/** fps de cada animación: los trabajos van algo más lentos que el paso. Las «-idle» y «idle» son un fotograma. */
const FPS: Partial<Record<VillagerAnim, number>> = { walk: 10, chop: 8, mine: 8, forage: 7, farm: 7, build: 8 };

/** Crea las animaciones (8 direcciones cada una). Devuelve cuántas creó. */
export function createVillagerAnimations(scene: Phaser.Scene): number {
  if (!scene.textures.exists(ECO)) return 0;
  const names = new Set(scene.textures.get(ECO).getFrameNames());
  let created = 0;
  for (const anim of VILLAGER_ANIMS) {
    for (const dir of DIRS) {
      const key = villagerAnimKey(anim, dir);
      const frames: { key: string; frame: string }[] = [];
      for (let i = 0; names.has(villagerFrame(anim, dir, i)); i++) frames.push({ key: ECO, frame: villagerFrame(anim, dir, i) });
      if (!frames.length || scene.anims.exists(key)) continue;
      scene.anims.create({ key, frames, frameRate: FPS[anim] ?? (anim.startsWith('carry/') && !anim.endsWith('-idle') ? 10 : 1), repeat: -1 });
      created++;
    }
  }
  return created;
}

export function countVillagerAnimations(scene: Phaser.Scene): number {
  let n = 0;
  for (const anim of VILLAGER_ANIMS) for (const dir of DIRS) if (scene.anims.exists(villagerAnimKey(anim, dir))) n++;
  return n;
}
