/**
 * Reproducible CPU-only navigation benchmark (not a physical iPhone measurement).
 * Run: npx tsx scripts/benchmark-navigation.ts
 * Each scenario gets a fresh occupancy; no benchmark data enters WorldState.
 */
import { performance } from 'node:perf_hooks';
import { findPath, octile, pathToAdjacent, pathToTile } from '../src/simulation/pathfinding.ts';
import type { Occupancy } from '../src/simulation/grid.ts';

function makeMap(size: number, disconnected: boolean): Occupancy {
  const blocked = new Uint8Array(size * size);
  // An impenetrable vertical barrier, or a single doorway for reachable cases.
  const wall = Math.floor(size / 2);
  for (let y = 0; y < size; y++) {
    if (!disconnected && y === Math.floor(size / 2)) continue;
    blocked[y * size + wall] = 1;
  }
  return { width: size, height: size, blocked };
}

function bench(size: number, agents: number, disconnected: boolean, baseline = false): void {
  const occ = makeMap(size, disconnected);
  const start = { x: 3, y: Math.floor(size / 2) };
  const target = { x: size - 4, y: Math.floor(size / 2) };
  const durations: number[] = [];
  let reachable = 0;
  for (let i = 0; i < agents; i++) {
    const t0 = performance.now();
    // Alternate tile and building-adjacent searches to exercise both APIs.
    const path = baseline
      ? findPath(occ, start, (x, y) => x === target.x && y === target.y, (x, y) => octile(target.x - x, target.y - y))
      : i % 2 === 0
        ? pathToTile(occ, start, target)
        : pathToAdjacent(occ, start, { x: target.x, y: target.y, w: 1, h: 1 });
    durations.push(performance.now() - t0);
    if (path !== null) reachable++;
  }
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);
  const output = {
    map: `${size}x${size}`,
    agents,
    scenario: disconnected ? 'disconnected' : 'reachable',
    method: baseline ? 'raw-A-star-reference' : 'optimized',
    reachable,
    totalMs: Number(sum.toFixed(2)),
    meanMs: Number((sum / agents).toFixed(3)),
    p95Ms: Number(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]!.toFixed(3)),
    maxMs: Number(sorted[sorted.length - 1]!.toFixed(3)),
  };
  console.log(JSON.stringify(output));
}

console.log('Navigation CPU microbenchmark — Node, not iPhone; warmup and hardware affect results');
bench(48, 20, false);
bench(224, 600, true);
bench(480, 600, true);
bench(224, 30, false);
bench(480, 10, false);

// Reference on a small disconnected map only: raw A* can be very expensive at 480x480.
bench(48, 10, true, true);
bench(48, 10, true);
