import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CAMP_FRAMES } from '../src/render/campArt.ts';

// Atlas de campamentos (0 A.D.): contrato, anclas, escala de 2×2 casillas, sin recortes y licencia.
const ROOT = new URL('../public/assets/0ad-camps/', import.meta.url).pathname;
const atlas = JSON.parse(readFileSync(`${ROOT}atlas.json`, 'utf8')) as {
  frames: Record<string, { frame: { w: number; h: number }; pivot: { x: number; y: number } }>;
  meta: { license: string; source: string; touchesEdge: Record<string, boolean>; touchesTop: Record<string, boolean>; size: { w: number; h: number } };
};

test('contrato: campamento maderero y minero presentes', () => {
  for (const f of Object.values(CAMP_FRAMES)) assert.ok(atlas.frames[f], `falta ${f}`);
});

test('escala de huella 2×2 (rombo de 128×64 px) y ancla dentro del dibujo', () => {
  for (const f of Object.values(CAMP_FRAMES)) {
    const { frame, pivot } = atlas.frames[f]!;
    assert.ok(frame.w >= 100 && frame.w <= 190, `${f}: ancho ${frame.w}`);
    assert.ok(frame.h >= 60 && frame.h <= 170, `${f}: alto ${frame.h}`);
    assert.ok(pivot.x > 0.2 && pivot.x < 0.8 && pivot.y > 0.3 && pivot.y < 0.95, `${f}: ancla ${JSON.stringify(pivot)}`);
  }
});

test('regresión del render: ningún edificio cortado por un borde', () => {
  // El primer render del campamento minero se salía por la derecha.
  for (const k of ['lumberCamp', 'miningCamp']) {
    assert.equal(atlas.meta.touchesEdge[k], false, `${k} toca un borde`);
    assert.equal(atlas.meta.touchesTop[k], false, `${k} toca el borde superior`);
  }
});

test('atlas pequeño (carga y memoria)', () => {
  assert.ok(atlas.meta.size.w * atlas.meta.size.h <= 512 * 256, `atlas ${atlas.meta.size.w}×${atlas.meta.size.h}`);
});

test('licencia y créditos', () => {
  assert.equal(atlas.meta.license, 'CC-BY-SA-3.0');
  assert.match(atlas.meta.source, /^0ad@[0-9a-f]{40}$/);
  const c = readFileSync(`${ROOT}CREDITS.md`, 'utf8');
  assert.match(c, /Wildfire Games/);
  assert.match(c, /storehouse/);
  assert.ok(existsSync(`${ROOT}LICENSE-0AD.txt`));
});
