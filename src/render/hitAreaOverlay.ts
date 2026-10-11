import type * as Phaser from 'phaser';
import { BUILDINGS } from '../content/economy.ts';
import { entityList, type WorldState } from '../simulation/world.ts';
import { BUILDING_WALL } from './entityTextures.ts';
import { tileToWorld } from './iso.ts';

// Solo revisión visual (?test=1&areas=1): dibuja el ÁREA INTERACTIVA de cada edificio (la huella extruida hasta la
// altura de pared que usa picking.ts) encima de su dibujo, para comprobar a ojo que coincide con lo que se ve.

/** Vuelve a dibujar las áreas (se llama cada fotograma: son pocas líneas). */
export function drawHitAreas(g: Phaser.GameObjects.Graphics, world: WorldState): void {
  g.clear();
  for (const e of entityList(world)) {
    if (e.kind !== 'building') continue;
    const n = BUILDINGS[e.type].size;
    const wall = BUILDING_WALL[e.type];
    // Esquinas de la huella: arriba, derecha, abajo, izquierda (bordes exteriores de las casillas).
    const corner = (x: number, y: number) => tileToWorld(x - 0.5, y - 0.5);
    const base = [corner(e.x, e.y), corner(e.x + n, e.y), corner(e.x + n, e.y + n), corner(e.x, e.y + n)];
    const top = base.map((p) => ({ x: p.x, y: p.y - wall }));
    g.lineStyle(2, 0x00e5ff, 0.9);
    for (const ring of [base, top]) {
      g.beginPath();
      g.moveTo(ring[0]!.x, ring[0]!.y);
      for (const p of ring.slice(1)) g.lineTo(p.x, p.y);
      g.closePath();
      g.strokePath();
    }
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(base[i]!.x, base[i]!.y);
      g.lineTo(top[i]!.x, top[i]!.y);
      g.strokePath();
    }
  }
}
