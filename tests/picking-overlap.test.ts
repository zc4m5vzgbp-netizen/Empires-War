import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BUILDINGS, PLAYER_ID, type BuildingType } from '../src/content/economy.ts';
import { BUILDING_WALL } from '../src/render/entityTextures.ts';
import { tileToWorld, worldToTile } from '../src/render/iso.ts';
import { buildingHitDepth, pickAt } from '../src/render/picking.ts';
import { addEntity, createEmptyWorld } from '../src/simulation/world.ts';

// Selección entre edificios cuyos dibujos se solapan (DEF-PICK-01) y área interactiva separada del dibujo.

function town(campX: number, campY: number, type: BuildingType = 'lumberCamp') {
  const w = createEmptyWorld({ seed: 1, size: 48 });
  const tc = addEntity(w, { kind: 'building', type: 'townCenter', owner: PLAYER_ID, x: 22, y: 22, complete: true, buildProgress: 0 });
  const camp = addEntity(w, { kind: 'building', type, owner: PLAYER_ID, x: campX, y: campY, complete: true, buildProgress: 0 });
  return { w, tc, camp, c: tileToWorld(campX + 0.5, campY + 0.5) };
}

test('regresión DEF-PICK-01: el tejado de un campamento dibujado delante del Centro Urbano selecciona el campamento', () => {
  // Antes: 40 px sobre el centro devolvía el Centro Urbano (#1) porque se recorría por ID.
  for (const type of ['lumberCamp', 'miningCamp'] as const) {
    const { w, camp, c } = town(26, 26, type);
    for (const lift of [0, 12, 24, 40, 60, 72]) assert.deepEqual(pickAt(w, c.x, c.y - lift), { kind: 'building', id: camp }, `${type} ${lift} px`);
  }
});

test('un campamento detrás del Centro Urbano: donde el Centro Urbano se dibuja delante, gana el Centro Urbano', () => {
  const { w, tc, camp, c } = town(20, 20);
  assert.deepEqual(pickAt(w, c.x, c.y), { kind: 'building', id: tc });
  // Pero su parte alta, que asoma por encima del Centro Urbano, sigue seleccionando el campamento.
  assert.deepEqual(pickAt(w, c.x, c.y - 60), { kind: 'building', id: camp });
});

test('el área interactiva contiene todo lo que aceptaba la comprobación anterior (base, media pared, pared)', () => {
  for (const type of Object.keys(BUILDINGS) as BuildingType[]) {
    const size = BUILDINGS[type].size;
    const e = { type, x: 10, y: 10 };
    for (let wy = 100; wy < 900; wy += 3) {
      for (let wx = -400; wx < 400; wx += 3) {
        const old = [0, BUILDING_WALL[type] * 0.5, BUILDING_WALL[type]].some((lift) => {
          const t = worldToTile(wx, wy + lift);
          const tx = Math.round(t.x);
          const ty = Math.round(t.y);
          return tx >= e.x && tx < e.x + size && ty >= e.y && ty < e.y + size;
        });
        if (old) assert.notEqual(buildingHitDepth(e, wx, wy), null, `${type} en ${wx},${wy}`);
      }
    }
  }
});

test('el área interactiva no pasa de la altura de pared: por encima no se selecciona', () => {
  for (const type of Object.keys(BUILDINGS) as BuildingType[]) {
    const size = BUILDINGS[type].size;
    const top = tileToWorld(10, 10); // esquina superior de la huella: centro de la casilla (10,10) − 16 px
    assert.equal(buildingHitDepth({ type, x: 10, y: 10 }, top.x, top.y - 16 - BUILDING_WALL[type] - 2), null, type);
    const front = tileToWorld(10 + size - 1, 10 + size - 1);
    assert.equal(buildingHitDepth({ type, x: 10, y: 10 }, front.x, front.y + 16 + 2), null, `${type} delante`);
  }
});
