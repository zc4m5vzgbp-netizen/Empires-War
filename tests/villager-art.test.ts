import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { VILLAGER_ANIMS } from '../src/render/villagerArt.ts';

// Atlas del aldeano por tareas (0 A.D.): contrato de nombres, fotogramas completos, anclas, tamaño y licencia.
const ROOT = new URL('../public/assets/0ad-villager/', import.meta.url).pathname;
const atlas = JSON.parse(readFileSync(`${ROOT}atlas.json`, 'utf8')) as {
  frames: Record<string, { frame: { w: number; h: number }; pivot: { x: number; y: number } }>;
  meta: {
    units: Record<string, Record<string, number>>;
    license: string;
    source: string;
    walkDistinct: boolean;
    touchesTop: Record<string, boolean>;
    figureHeights: Record<string, Record<string, number>>;
  };
};
const DIRS = [0, 45, 90, 135, 180, 225, 270, 315];

test('contrato gráfico: el atlas tiene exactamente las animaciones acordadas', () => {
  assert.deepEqual(Object.keys(atlas.meta.units.villager!).sort(), [...VILLAGER_ANIMS].sort());
});

test('cada animación tiene sus 8 direcciones y fotogramas completos', () => {
  for (const anim of VILLAGER_ANIMS) {
    const n = atlas.meta.units.villager![anim]!;
    const still = anim === 'idle' || anim.endsWith('-idle');
    assert.ok(still ? n === 1 : n >= 6, `${anim}: ${n} fotogramas`);
    for (const d of DIRS) for (let i = 0; i < n; i++) assert.ok(atlas.frames[`eco/villager/${anim}/${d}/${i}`], `falta ${anim}/${d}/${i}`);
  }
});

test('anclas válidas y figura a escala del juego', () => {
  for (const [k, f] of Object.entries(atlas.frames)) assert.ok(f.pivot.x > 0 && f.pivot.x < 1 && f.pivot.y > 0 && f.pivot.y <= 1, k);
  const h = atlas.frames['eco/villager/idle/270/0']!.frame.h;
  assert.ok(h >= 24 && h <= 90, `alto ${h}`);
});

test('regresiones del proceso de render: andar animado, sin cortes y mismo tamaño entre quieto y andar', () => {
  assert.equal(atlas.meta.walkDistinct, true);
  assert.equal(atlas.meta.touchesTop.villager, false);
  const { idle, walk } = atlas.meta.figureHeights.villager!;
  assert.ok(Math.max(idle!, walk!) / Math.min(idle!, walk!) < 1.35, `quieto ${idle} / andar ${walk}`);
});

test('las tareas no son copias de otra animación', () => {
  // El empaquetador compara el primer fotograma (dirección 270) de cada animación y anota las repetidas.
  assert.deepEqual((atlas.meta as unknown as { duplicateAnims: string[] }).duplicateAnims, []);
});

test('licencia y créditos', () => {
  assert.equal(atlas.meta.license, 'CC-BY-SA-3.0');
  assert.match(atlas.meta.source, /^0ad@[0-9a-f]{40}$/);
  const credits = readFileSync(`${ROOT}CREDITS.md`, 'utf8');
  assert.match(credits, /Wildfire Games/);
  assert.match(credits, /female_citizen/);
  assert.ok(existsSync(`${ROOT}LICENSE-0AD.txt`));
});
