import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

// Comprueba el atlas militar generado (scripts/art/build-0ad-atlas.py) sin navegador: que no falte ningún
// fotograma, que cada uno tenga ancla y que los créditos y la licencia acompañen al arte.
const ROOT = new URL('../public/assets/0ad/', import.meta.url).pathname;
const atlas = JSON.parse(readFileSync(`${ROOT}atlas.json`, 'utf8')) as {
  frames: Record<string, { frame: { w: number; h: number }; pivot: { x: number; y: number } }>;
  meta: { units: Record<string, Record<string, number>>; license: string; source: string };
};
const DIRS = [0, 45, 90, 135, 180, 225, 270, 315];

test('atlas militar: espadachín y arquero con quieto, andar, atacar y morir en 8 direcciones', () => {
  for (const unit of ['swordsman', 'archer']) {
    const anims = atlas.meta.units[unit];
    assert.ok(anims, `falta ${unit}`);
    for (const anim of ['idle', 'walk', 'attack', 'death']) {
      const n = anims[anim];
      assert.ok(n && n >= 1, `${unit} sin ${anim}`);
      if (anim !== 'idle') assert.ok(n >= 6, `${unit}/${anim}: animación demasiado corta (${n})`);
      for (const d of DIRS) for (let i = 0; i < n; i++) assert.ok(atlas.frames[`mil/${unit}/${anim}/${d}/${i}`], `falta mil/${unit}/${anim}/${d}/${i}`);
    }
  }
  assert.ok(atlas.frames['mil/barracks'], 'falta el cuartel');
});

test('atlas militar: anclas dentro del sprite y tamaños de juego', () => {
  for (const [k, f] of Object.entries(atlas.frames)) {
    assert.ok(f.pivot.x > 0 && f.pivot.x < 1 && f.pivot.y > 0 && f.pivot.y <= 1, `ancla fuera de ${k}`);
  }
  const s = atlas.frames['mil/swordsman/idle/270/0']!.frame;
  assert.ok(s.h >= 24 && s.h <= 80, `espadachín de ${s.h} px: fuera de la escala del juego`);
  const b = atlas.frames['mil/barracks']!.frame;
  assert.ok(b.w >= 120 && b.w <= 260, `cuartel de ${b.w} px: no encaja en 3×3 casillas`);
});

test('regresión: la animación de andar no es un fotograma repetido', () => {
  // El primer render tomaba el esqueleto equivocado y todos los fotogramas de andar salían iguales.
  const png = readFileSync(`${ROOT}atlas.png`);
  assert.ok(png.length > 0);
  for (const unit of ['swordsman', 'archer']) {
    const f0 = atlas.frames[`mil/${unit}/walk/270/0`]!.frame;
    const f4 = atlas.frames[`mil/${unit}/walk/270/4`]!.frame;
    // Tamaños idénticos por el recorte común; la diferencia se comprueba en el script de empaquetado (hash).
    assert.deepEqual([f0.w, f0.h], [f4.w, f4.h]);
  }
  assert.ok((atlas.meta as unknown as { walkDistinct?: boolean }).walkDistinct, 'los fotogramas de andar son iguales');
});

test('licencia y créditos del arte de 0 A.D.', () => {
  assert.equal(atlas.meta.license, 'CC-BY-SA-3.0');
  assert.match(atlas.meta.source, /^0ad@[0-9a-f]{40}$/);
  const credits = readFileSync(`${ROOT}CREDITS.md`, 'utf8');
  assert.match(credits, /Wildfire Games/);
  assert.match(credits, /creativecommons\.org\/licenses\/by-sa\/3\.0/);
  assert.ok(existsSync(`${ROOT}LICENSE-0AD.txt`), 'falta el texto de la licencia');
});
