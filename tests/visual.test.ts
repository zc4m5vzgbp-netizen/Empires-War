import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TerrainKind } from '../src/content/terrain.ts';
import { dirFromTileDelta } from '../src/render/art.ts';
import { groundFrame } from '../src/render/terrainArt.ts';

// Direcciones comprobadas sobre los sprites de UH: 0 = derecha, 90 = arriba, 180 = izquierda, 270 = abajo (de frente).
test('el aldeano mira hacia donde camina', () => {
  assert.equal(dirFromTileDelta(1, 0), 315); // x+1: abajo-derecha en pantalla
  assert.equal(dirFromTileDelta(-1, 0), 135); // arriba-izquierda
  assert.equal(dirFromTileDelta(0, -1), 45); // arriba-derecha
  assert.equal(dirFromTileDelta(0, 1), 225); // abajo-izquierda
  assert.equal(dirFromTileDelta(1, 1), 270); // abajo (hacia la cámara)
  assert.equal(dirFromTileDelta(-1, -1), 90); // arriba (de espaldas)
  assert.equal(dirFromTileDelta(1, -1), 0); // derecha
  assert.equal(dirFromTileDelta(-1, 1), 180); // izquierda
});

const G = TerrainKind.Grass;
const D = TerrainKind.Dirt;
const W = TerrainKind.Water;
/** Mapa pequeño desde filas de texto: g = hierba, d = arena, w = agua. */
function grid(rows: string[]) {
  const k = { g: G, d: D, w: W } as Record<string, number>;
  return (x: number, y: number) => (y >= 0 && y < rows.length && x >= 0 && x < rows[y]!.length ? k[rows[y]![x]!] : undefined);
}

test('transiciones de arena con hierba', () => {
  const at = grid(['ggg', 'ddd', 'ddd']);
  assert.equal(groundFrame(at, 1, 1, 0), 'gb/straight/45'); // hierba en (1,0) = lado arriba-derecha
  assert.equal(groundFrame(at, 1, 2, 0), 'tile/dirt/0');
  const corner = grid(['gdd', 'gdd', 'ddd']);
  assert.equal(groundFrame(corner, 1, 1, 0), 'gb/straight/135'); // hierba a la izquierda en x-1
  const curveIn = grid(['ggd', 'gdd', 'ddd']);
  assert.equal(groundFrame(curveIn, 1, 1, 0), 'gb/curve_in/135'); // lados 45 y 135 → esquina superior
  const curveOut = grid(['gdd', 'ddd', 'ddd']);
  assert.equal(groundFrame(curveOut, 1, 1, 0), 'gb/curve_out/135'); // solo la diagonal superior
  const pocket = grid(['ggg', 'gdg', 'ggg']);
  assert.equal(groundFrame(pocket, 1, 1, 3), 'tile/grass/3');
});

test('orillas: agua junto a tierra', () => {
  const at = grid(['www', 'www', 'ggg']);
  assert.equal(groundFrame(at, 1, 1, 0), 'bs/straight/225');
  assert.equal(groundFrame(at, 1, 0, 0), 'tile/water/0');
  assert.equal(groundFrame(at, 1, 2, 2), 'tile/grass/2');
});
