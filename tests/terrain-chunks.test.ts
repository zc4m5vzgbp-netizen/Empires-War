import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tileToWorld } from '../src/render/iso.ts';
import { CHUNK, CHUNK_TEXTURE, TILE_ART, chunkGrid, chunksInView, planStream, terrainLevel } from '../src/render/terrainChunks.ts';

// Suelo por bloques visibles: geometría, culling sin huecos, plan de pintado y cota de memoria.

test('los bloques cubren cada casilla exactamente una vez y caben en la textura de bloque', () => {
  for (const [w, h] of [[48, 48], [50, 37], [160, 160]] as const) {
    const g = chunkGrid(w, h);
    const seen = new Uint8Array(w * h);
    for (const c of g.chunks) {
      assert.ok(c.w <= CHUNK_TEXTURE.w && c.h <= CHUNK_TEXTURE.h, `bloque ${c.index}: ${c.w}×${c.h}`);
      for (let y = c.ty0; y <= c.ty1; y++) for (let x = c.tx0; x <= c.tx1; x++) seen[y * w + x]!++;
    }
    assert.ok(seen.every((n) => n === 1));
  }
});

test('culling sin huecos: toda casilla cuyo dibujo toca la vista está en un bloque devuelto, y no sobra ninguno', () => {
  // Los rectángulos de bloque son más grandes que su rombo; un bloque cuyo rectángulo roza la vista pero ninguna de
  // sus casillas la toca puede omitirse (no deja hueco). Se comprueba a nivel de casilla, con 200 vistas al azar.
  const W = 160;
  const g = chunkGrid(W, W);
  let rnd = 12345;
  const rand = () => ((rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let k = 0; k < 200; k++) {
    const view = { x: (rand() - 0.6) * W * 40, y: rand() * W * 32, w: 200 + rand() * 4000, h: 200 + rand() * 3000 };
    const margin = rand() * 300;
    const got = new Set(chunksInView(g, view, margin));
    const x0 = view.x - margin;
    const y0 = view.y - margin;
    const x1 = view.x + view.w + margin;
    const y1 = view.y + view.h + margin;
    const needed = new Set<number>();
    for (let y = 0; y < W; y++) {
      for (let x = 0; x < W; x++) {
        const p = tileToWorld(x, y);
        if (p.x + TILE_ART.left > x0 && p.x - TILE_ART.left < x1 && p.y + TILE_ART.down > y0 && p.y - TILE_ART.up < y1) {
          needed.add(Math.floor(y / CHUNK) * g.cols + Math.floor(x / CHUNK));
        }
      }
    }
    for (const i of needed) assert.ok(got.has(i), `vista ${k}: falta el bloque ${i}`);
    for (const i of got) {
      const c = g.chunks[i]!;
      assert.ok(!(c.x + c.w <= x0 || c.x >= x1 || c.y + c.h <= y0 || c.y >= y1), `vista ${k}: bloque ${i} fuera de la vista`);
    }
  }
});

test('plan de pintado: respeta el presupuesto por fotograma y libera lo que sale del margen', () => {
  const active = new Set([1, 2, 3]);
  const plan = planStream(active, [2, 4, 5, 6, 7], new Set([2, 3, 4, 5, 6, 7]), 2);
  assert.deepEqual(plan.paint, [4, 5]);
  assert.deepEqual(plan.release, [1]);
});

test('nivel de detalle con histéresis', () => {
  assert.equal(terrainLevel(0.8, 0), 0);
  assert.equal(terrainLevel(0.5, 0), 0);
  assert.equal(terrainLevel(0.47, 0), 1);
  assert.equal(terrainLevel(0.5, 1), 1);
  assert.equal(terrainLevel(0.53, 1), 0);
});

test('cota de memoria del suelo: no depende del tamaño del mapa', () => {
  // Bytes de los bloques en vista + margen de precarga (1 bloque) en el peor caso, para 160 y 480.
  const worst = (size: number, vw: number, vh: number, zoom: number) => {
    const g = chunkGrid(size, size);
    const level = terrainLevel(zoom, zoom < 0.5 ? 1 : 0);
    const bytesPer = (CHUNK_TEXTURE.w * CHUNK_TEXTURE.h * 4) / (level ? 4 : 1);
    let max = 0;
    for (let i = 0; i < 60; i++) {
      const t = i / 59;
      const c = tileToWorld(size * t, size * (1 - t * 0.7));
      const view = { x: c.x - vw / zoom / 2, y: c.y - vh / zoom / 2, w: vw / zoom, h: vh / zoom };
      max = Math.max(max, chunksInView(g, view, CHUNK * 32).length);
    }
    return (max * bytesPer) / 1048576;
  };
  for (const [vw, vh, zooms] of [[430, 932, [0.35, 0.8, 2.5]], [1280, 800, [0.35, 1.1]]] as const) {
    for (const z of zooms) {
      const small = worst(160, vw, vh, z);
      const big = worst(480, vw, vh, z);
      assert.ok(big <= small * 1.25 + 1, `${vw}×${vh} zoom ${z}: 160 → ${small.toFixed(1)} MB, 480 → ${big.toFixed(1)} MB`);
      assert.ok(big < 64, `${vw}×${vh} zoom ${z}: ${big.toFixed(1)} MB`);
    }
  }
});
