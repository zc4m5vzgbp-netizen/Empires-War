import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BUILDINGS, type BuildingType } from '../src/content/economy.ts';
import { ART, ART_BUILDINGS, DIRS, GRASS_VARIANTS, TREES } from '../src/render/art.ts';
import { CAMP, CAMP_FRAMES } from '../src/render/campArt.ts';
import { groundFrame } from '../src/render/terrainArt.ts';
import { ECO, VILLAGER_ANIMS, villagerFrame } from '../src/render/villagerArt.ts';
import { generateTestTerrain } from '../src/simulation/terrainGen.ts';

// Contrato gráfico: cada fotograma que el código pide a un atlas existe en ese atlas. Incluye todo fotograma de
// suelo que el pintado por bloques puede pedir con el terreno generado (mapas de 48 y 224).

const ROOT = new URL('../public/assets/', import.meta.url).pathname;
const DIR: Record<string, string> = { [ART]: 'uh', [ECO]: '0ad-villager', [CAMP]: '0ad-camps' };
const atlas = Object.fromEntries(
  Object.entries(DIR).map(([t, d]) => [t, new Set(Object.keys((JSON.parse(readFileSync(`${ROOT}${d}/atlas.json`, 'utf8')) as { frames: object }).frames))]),
) as Record<string, Set<string>>;
const has = (texture: string, frame: string) => assert.ok(atlas[texture]!.has(frame), `falta «${frame}» en «${texture}»`);

test('edificios: cada edificio de la simulación tiene un fotograma de atlas existente', () => {
  for (const type of Object.keys(BUILDINGS) as BuildingType[]) {
    if (type in CAMP_FRAMES) has(CAMP, CAMP_FRAMES[type as keyof typeof CAMP_FRAMES]);
    else if (ART_BUILDINGS[type]) has(ART, ART_BUILDINGS[type]!.frame);
    else assert.fail(`${type} sin arte de atlas`);
  }
});

test('árboles, recursos y aldeano de reserva (UH)', () => {
  for (const t of TREES) has(ART, `tree/${t}`);
  for (const f of ['res/gold', 'res/stone', 'res/berry', 'bld/mill/0']) has(ART, f);
  for (const d of DIRS) for (const a of ['vil/idle', 'vil/walk', 'vil/carry', 'vil/carryidle']) has(ART, `${a}/${d}/0`);
});

test('suelo: todo fotograma que el terreno generado puede pedir existe', () => {
  for (const size of [48, 224]) {
    const terrain = generateTestTerrain(size, 20261009);
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= size || y >= size ? undefined : terrain[y * size + x]);
    const seen = new Set<string>();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) for (let v = 0; v < GRASS_VARIANTS; v++) seen.add(groundFrame(at, x, y, v));
    for (const f of seen) has(ART, f);
  }
});

test('aldeana 0 A.D.: 15 animaciones × 8 direcciones', () => {
  for (const a of VILLAGER_ANIMS) for (const d of DIRS) has(ECO, villagerFrame(a, d, 0));
});

test('licencias: cada atlas trae sus créditos (y el texto de la licencia de 0 A.D. en los suyos)', () => {
  for (const d of Object.values(DIR)) {
    const credits = readFileSync(`${ROOT}${d}/CREDITS.md`, 'utf8');
    assert.match(credits, /CC-BY-SA 3\.0|CC BY-SA 3\.0|Creative Commons Attribution-ShareAlike 3\.0/i, d);
    if (d.startsWith('0ad')) assert.match(readFileSync(`${ROOT}${d}/LICENSE-0AD.txt`, 'utf8'), /Creative Commons|CC-BY-SA|Attribution/i, d);
  }
});
