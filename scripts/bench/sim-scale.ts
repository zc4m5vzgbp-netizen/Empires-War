// Caracterización de escala de la simulación (análisis de consolidación, 2026-10-10).
// NO cambia el juego: solo usa las funciones públicas de src/simulation y mide tiempos.
// Uso: npx tsx scripts/bench/sim-scale.ts   (o EW_BENCH_SIZES=48,160 EW_BENCH_UNITS=50,300)
// Resultado: tabla en Markdown. CPU de la máquina que lo ejecuta; NO equivale a un iPhone.
import { BUILDINGS, PLAYER_ID } from '../../src/content/economy.ts';
import { buildOccupancy, isWalkable } from '../../src/simulation/grid.ts';
import { pathToTile } from '../../src/simulation/pathfinding.ts';
import { issueCommand } from '../../src/simulation/commands.ts';
import { addEntity, createEmptyWorld, hashWorld, newVillager, stepWorld } from '../../src/simulation/world.ts';
import type { WorldState } from '../../src/simulation/world.ts';

const sizes = (process.env.EW_BENCH_SIZES ?? '48,160,224,320,480').split(',').map(Number);
const unitCounts = (process.env.EW_BENCH_UNITS ?? '50,150,300,600').split(',').map(Number);
const TICKS = Number(process.env.EW_BENCH_TICKS ?? 100);
const RUNS = 3;
/** Anchura del anillo de recursos (casillas). 7 = denso (recursos que se encierran entre sí); 40 = disperso. */
const RING = Number(process.env.EW_BENCH_RING ?? 7);

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]!;
const pct = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))]!;
const time = (fn: () => void) => {
  const t = performance.now();
  fn();
  return performance.now() - t;
};

/** Mundo de prueba: centro urbano, N aldeanos y recursos repartidos, todos con orden de recolectar. */
function scenario(size: number, units: number, seed = 7): WorldState {
  const w = createEmptyWorld({ seed, size });
  const c = Math.floor(size / 2);
  addEntity(w, { kind: 'building', type: 'townCenter', owner: PLAYER_ID, x: c - 2, y: c - 2, complete: true, buildProgress: 0 });
  // Recursos en un anillo alrededor del centro (radio 8–14), sobre casillas transitables.
  const occ0 = buildOccupancy(w);
  const resIds: number[] = [];
  const kinds = [['tree', 'wood'], ['goldMine', 'gold'], ['stoneMine', 'stone'], ['berryBush', 'food']] as const;
  for (let i = 0; resIds.length < Math.max(8, Math.ceil(units / 4)) && i < 4000; i++) {
    const a = (i * 2.399963) % (Math.PI * 2);
    const r = 8 + (i % RING);
    const x = Math.round(c + Math.cos(a) * r);
    const y = Math.round(c + Math.sin(a) * r);
    if (!isWalkable(occ0, x, y)) continue;
    const [type, resource] = kinds[resIds.length % 4]!;
    resIds.push(addEntity(w, { kind: 'resource', type, resource, x, y, amount: 100000 } as never));
    occ0.blocked[y * size + x] = 1;
  }
  // Aldeanos en una espiral alrededor del centro urbano.
  const occ = buildOccupancy(w);
  let placed = 0;
  for (let r = 3; placed < units && r < size / 2; r++) {
    for (let dy = -r; dy <= r && placed < units; dy++) {
      for (let dx = -r; dx <= r && placed < units; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = c + dx;
        const y = c + dy;
        if (!isWalkable(occ, x, y)) continue;
        const id = addEntity(w, newVillager(x, y));
        issueCommand(w, { type: 'gather', playerId: PLAYER_ID, unitIds: [id], targetId: resIds[placed % resIds.length]! });
        placed++;
      }
    }
  }
  return w;
}

const rows: string[] = [];
rows.push('| Mapa | Unidades | Ocupación (ms) | A* esquina→esquina (ms) | Tick p50 (ms) | Tick p95 (ms) | Tick máx (ms) | Guardado JSON (KB) | Huella (ms) | Ruta A* (casillas) | Aldeanos activos |');
rows.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const size of sizes) {
  for (const units of unitCounts) {
    if (units > size * size * 0.1) continue;
    const occT: number[] = [];
    const pathT: number[] = [];
    const ticks: number[] = [];
    const saveKB: number[] = [];
    const hashT: number[] = [];
    let pathLen = -1;
    let active = 0;
    for (let run = 0; run < RUNS; run++) {
      const w = scenario(size, units, 7 + run);
      let occ = buildOccupancy(w);
      occT.push(time(() => (occ = buildOccupancy(w))));
      let p: ReturnType<typeof pathToTile> = null;
      pathT.push(time(() => (p = pathToTile(occ, { x: 1, y: 1 }, { x: size - 2, y: size - 2 }))));
      pathLen = p ? (p as unknown[]).length : -1;
      for (let t = 0; t < TICKS; t++) ticks.push(time(() => stepWorld(w)));
      saveKB.push(Math.round(JSON.stringify(w).length / 1024));
      hashT.push(time(() => hashWorld(w)));
      active = Object.values(w.entities).filter((e) => e.kind === 'villager' && e.task.type !== 'idle').length;
    }
    rows.push(`| ${size}×${size} | ${units} | ${median(occT).toFixed(2)} | ${median(pathT).toFixed(1)} | ${pct(ticks, 0.5).toFixed(2)} | ${pct(ticks, 0.95).toFixed(2)} | ${Math.max(...ticks).toFixed(1)} | ${median(saveKB)} | ${median(hashT).toFixed(1)} | ${pathLen < 0 ? 'sin ruta' : pathLen} | ${active}/${units} |`);
  }
}
console.log(`Anillo de recursos: ${RING} casillas. Simulación: ${TICKS} ticks × ${RUNS} ejecuciones por fila; presupuesto a 20 ticks/s = 50 ms por tick (sin contar render).`);
console.log(`Edificio de depósito: ${BUILDINGS.townCenter.name}. Node ${process.version}.`);
console.log(rows.join('\n'));
