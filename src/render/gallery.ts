import type * as Phaser from 'phaser';
import { ART, pivot } from './art.ts';
import { tileToWorld } from './iso.ts';

// Galería de estilo (solo con ?galeria=1): muestra arte del atlas que la partida aún no usa
// (soldados, piedra, torre, iglesia…) para evaluar la dirección artística. Es decoración:
// no crea entidades, no ocupa casillas y no toca la simulación.

const ITEMS: { frame: string; x: number; y: number; scale?: number }[] = [
  { frame: 'gal/stone', x: 14, y: 31 },
  { frame: 'gal/tower', x: 18, y: 31 },
  { frame: 'gal/church', x: 21, y: 32 },
  { frame: 'gal/tavern', x: 24, y: 33 },
  { frame: 'gal/warehouse', x: 28, y: 33 },
];

export function addGallery(scene: Phaser.Scene): void {
  for (const it of ITEMS) {
    const p = tileToWorld(it.x, it.y);
    const o = pivot(scene, it.frame);
    scene.add.image(p.x, p.y, ART, it.frame).setOrigin(o.x, o.y).setScale(it.scale ?? 1).setDepth(p.y);
  }
  // Dos grupos de soldados enfrentados con la animación de ataque cuerpo a cuerpo.
  const fighters: [number, number, number][] = [
    [16, 27, 0],
    [17, 27, 180],
    [16, 28, 0],
    [17, 28, 180],
  ];
  for (const [x, y, dir] of fighters) {
    const p = tileToWorld(x, y);
    const frame = `sol/attack/${dir}/0`;
    const o = pivot(scene, frame);
    scene.add.sprite(p.x, p.y, ART, frame).setOrigin(o.x, o.y).setDepth(p.y).play(`sol/attack/${dir}`);
  }
  for (let i = 0; i < 4; i++) {
    const p = tileToWorld(12 + i, 25);
    const frame = `sol/walk/315/0`;
    const o = pivot(scene, frame);
    scene.add.sprite(p.x, p.y, ART, frame).setOrigin(o.x, o.y).setDepth(p.y).play('sol/walk/315');
  }
}
