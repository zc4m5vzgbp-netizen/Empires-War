import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SAVE_FORMAT_VERSION, decodeSave, encodeSave } from '../src/persistence/saveFormat.ts';
import { createWorld, hashWorld, stepWorld } from '../src/simulation/world.ts';

const makeWorld = () => {
  const w = createWorld({ seed: 99, size: 24 });
  for (let i = 0; i < 37; i++) stepWorld(w);
  return w;
};

test('Guardado: guardar y cargar devuelve un estado idéntico', () => {
  const w = makeWorld();
  const result = decodeSave(encodeSave(w, '2026-10-09T00:00:00.000Z'));
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.deepEqual(result.save.world, w);
  assert.equal(hashWorld(result.save.world), hashWorld(w));
  assert.equal(result.save.formatVersion, SAVE_FORMAT_VERSION);
});

test('Guardado: tras cargar, la simulación continúa igual que sin guardar', () => {
  const original = makeWorld();
  const result = decodeSave(encodeSave(original, 'x'));
  assert.ok(result.ok);
  if (!result.ok) return;
  const loaded = result.save.world;
  for (let i = 0; i < 1000; i++) {
    stepWorld(original);
    stepWorld(loaded);
  }
  assert.equal(hashWorld(loaded), hashWorld(original));
});

test('Guardado: rechaza archivos dañados, ajenos o de otra versión', () => {
  const text = encodeSave(makeWorld(), 'x');
  const tampered = JSON.parse(text);
  tampered.world.tick += 1;
  assert.equal(decodeSave(JSON.stringify(tampered)).ok, false);

  const otherVersion = JSON.parse(text);
  otherVersion.formatVersion = 999;
  assert.equal(decodeSave(JSON.stringify(otherVersion)).ok, false);

  assert.equal(decodeSave('{"format":"otro-juego"}').ok, false);
  assert.equal(decodeSave('no es json').ok, false);
});

test('la huella no depende del orden de las claves (la nube jsonb las reordena)', () => {
  const w = createWorld({ seed: 7, size: 32 });
  for (let i = 0; i < 30; i++) stepWorld(w);
  const reorder = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(reorder);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v).reverse()) out[k] = reorder((v as Record<string, unknown>)[k]);
      return out;
    }
    return v;
  };
  const text = encodeSave(w, '2026-10-09T00:00:00Z');
  const shuffled = JSON.stringify(reorder(JSON.parse(text)));
  assert.notEqual(shuffled, text);
  const r = decodeSave(shuffled);
  assert.ok(r.ok, r.ok ? '' : r.error);
  assert.equal(hashWorld(r.save.world), hashWorld(w));
});
