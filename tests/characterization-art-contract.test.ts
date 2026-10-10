import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BUILDINGS, type BuildingType } from '../src/content/economy.ts';
import { ART, ART_BUILDINGS, DIRS, GRASS_VARIANTS, TREES } from '../src/render/art.ts';
import { CAMP } from '../src/render/campArt.ts';
import { MIL, MIL_ANIMS, MIL_UNITS, milFrame } from '../src/render/militaryArt.ts';
import { groundFrame } from '../src/render/terrainArt.ts';
import { ECO, VILLAGER_ANIMS, villagerFrame } from '../src/render/villagerArt.ts';
import { generateTestTerrain } from '../src/simulation/terrainGen.ts';

// Caracterización del contrato gráfico (análisis de consolidación, 2026-10-10): NO cambia el juego.
// Fija que cada fotograma que el código pide a un atlas existe de verdad en ese atlas. Si una migración o
// un reempaquetado rompe un nombre, esta prueba falla antes de que el jugador vea un cuadro vacío.

const ROOT = new URL('../public/assets/', import.meta.url).pathname;
const ATLAS_DIR: Record<string, string> = { [ART]: 'uh', [ECO]: '0ad-villager', [CAMP]: '0ad-camps', [MIL]: '0ad' };
const frames = (texture: string) =>
  new Set(Object.keys((JSON.parse(readFileSync(`${ROOT}${ATLAS_DIR[texture]}/atlas.json`, 'utf8')) as { frames: object }).frames));
const atlas = Object.fromEntries(Object.keys(ATLAS_DIR).map((t) => [t, frames(t)])) as Record<string, Set<string>>;
const has = (texture: string, frame: string) => assert.ok(atlas[texture]!.has(frame), `falta «${frame}» en el atlas «${texture}»`);

test('caracterización: cada edificio de la simulación tiene arte de atlas o queda en el arte de reserva a propósito', () => {
  const withArt: string[] = [];
  for (const type of Object.keys(BUILDINGS) as BuildingType[]) {
    const a = ART_BUILDINGS[type];
    if (!a) continue;
    has((a as { texture?: string }).texture ?? ART, a.frame);
    withArt.push(type);
  }
  // Estado actual (receta de integración): los cuatro edificios del juego tienen atlas.
  assert.deepEqual(withArt.sort(), ['lumberCamp', 'mill', 'miningCamp', 'townCenter']);
});

test('caracterización: recursos, árboles y aldeano UH (arte de reserva) existen en el atlas uh', () => {
  for (const t of TREES) has(ART, `tree/${t}`);
  for (const f of ['res/gold', 'res/stone', 'res/berry']) has(ART, f);
  for (const d of DIRS) for (const a of ['vil/idle', 'vil/walk', 'vil/carry', 'vil/carryidle']) has(ART, `${a}/${d}/0`);
  has(ART, 'bld/mill/0');
});

test('caracterización: todo fotograma de suelo que puede pedir el terreno generado existe', () => {
  for (const size of [48, 160]) {
    const terrain = generateTestTerrain(size, 20261009);
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= size || y >= size ? undefined : terrain[y * size + x]);
    const seen = new Set<string>();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) for (let v = 0; v < GRASS_VARIANTS; v++) seen.add(groundFrame(at, x, y, v));
    for (const f of seen) has(ART, f);
  }
});

test('caracterización: aldeana 0 A.D. (15 animaciones × 8 direcciones) y militares (2 × 4 × 8) completos', () => {
  for (const a of VILLAGER_ANIMS) for (const d of DIRS) has(ECO, villagerFrame(a, d, 0));
  for (const u of MIL_UNITS) for (const a of MIL_ANIMS) for (const d of DIRS) has(MIL, milFrame(u, a, d, 0));
  has(MIL, 'mil/barracks');
});
