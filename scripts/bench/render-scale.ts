// Caracterización de escala del render (análisis de consolidación, 2026-10-10). NO cambia el juego.
// Reproduce el cálculo de src/render/GameScene.ts → drawArtTerrain() (bloques de 16×16 casillas, márgenes
// LEFT 32 / UP 40 / DOWN 24) y el reparto de árboles por casilla de bosque, con el terreno real de terrainGen.
// Uso: npx tsx scripts/bench/render-scale.ts
import { TerrainKind } from '../../src/content/terrain.ts';
import { tileToWorld } from '../../src/render/iso.ts';
import { tileNoise } from '../../src/render/art.ts';
import { generateTestTerrain } from '../../src/simulation/terrainGen.ts';

const CHUNK = 16;
const LEFT = 32;
const UP = 40;
const DOWN = 24;
const sizes = (process.env.EW_BENCH_SIZES ?? '48,160,224,320,480').split(',').map(Number);

console.log('| Mapa | Bloques de suelo (RenderTexture) | Memoria de texturas del suelo (MB, RGBA) | Casillas de bosque | Imágenes de árbol | Ancho × alto del mundo (px) |');
console.log('|---|---|---|---|---|---|');
for (const size of sizes) {
  let chunks = 0;
  let bytes = 0;
  for (let cy = 0; cy < size; cy += CHUNK) {
    for (let cx = 0; cx < size; cx += CHUNK) {
      const x1 = Math.min(cx + CHUNK, size) - 1;
      const y1 = Math.min(cy + CHUNK, size) - 1;
      const w = Math.ceil(tileToWorld(x1, cy).x + LEFT - (tileToWorld(cx, y1).x - LEFT));
      const h = Math.ceil(tileToWorld(x1, y1).y + DOWN - (tileToWorld(cx, cy).y - UP));
      chunks++;
      bytes += w * h * 4;
    }
  }
  const terrain = generateTestTerrain(size, 20261009);
  let forest = 0;
  let trees = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (terrain[y * size + x] !== TerrainKind.Forest) continue;
      forest++;
      trees += tileNoise(x, y, 5) < 0.35 ? 2 : 1;
    }
  }
  const worldW = size * 64;
  const worldH = size * 32;
  console.log(`| ${size}×${size} | ${chunks} | ${(bytes / 1048576).toFixed(0)} | ${forest} | ${trees} | ${worldW} × ${worldH} |`);
}
console.log('\nLa memoria real en GPU puede ser mayor (alineación, mipmaps del navegador). Referencia: el atlas de la aldeana ocupa 16 MB.');
