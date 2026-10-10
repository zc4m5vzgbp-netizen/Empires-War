import type * as Phaser from 'phaser';
import { ART, pivot } from './art.ts';
import { tileToWorld } from './iso.ts';
import { MIL, type MilUnit, milAnimKey, milFrame } from './militaryArt.ts';
import { ECO, type VillagerAnim, villagerAnimKey, villagerFrame } from './villagerArt.ts';
import { CAMP, CAMP_FRAMES } from './campArt.ts';

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
  if (scene.textures.exists(ECO)) addVillagerTasks(scene);
  if (scene.textures.exists(CAMP)) addCamps(scene);
  if (scene.textures.exists(MIL)) {
    addMilitary(scene);
    return;
  }
  // Sin el atlas militar: marcadores de Unknown Horizons (no tiene soldados propios).
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

/** Prototipo militar de 0 A.D.: cuartel, espadachines contra arqueros, una marcha y una muerte en bucle. */
function addMilitary(scene: Phaser.Scene): void {
  const put = (unit: MilUnit, x: number, y: number, anim: 'idle' | 'walk' | 'attack' | 'death', dir: number) => {
    const p = tileToWorld(x, y);
    const frame = milFrame(unit, anim, dir, 0);
    const o = pivot(scene, frame, MIL);
    const s = scene.add.sprite(p.x, p.y, MIL, frame).setOrigin(o.x, o.y).setDepth(p.y);
    if (anim === 'death') {
      // La muerte termina en el suelo; se repite cada 3 s para poder verla.
      s.play(milAnimKey(unit, anim, dir));
      scene.time.addEvent({ delay: 3000, loop: true, callback: () => s.play(milAnimKey(unit, anim, dir)) });
    } else s.play(milAnimKey(unit, anim, dir));
    return s;
  };
  const b = tileToWorld(11, 30);
  const bo = pivot(scene, 'mil/barracks', MIL);
  scene.add.image(b.x, b.y, MIL, 'mil/barracks').setOrigin(bo.x, bo.y).setDepth(b.y + 48);
  // Combate cuerpo a cuerpo: espadachines (mirando a la derecha) contra arqueros (mirando a la izquierda).
  put('swordsman', 14, 27, 'attack', 0);
  put('swordsman', 14, 28, 'attack', 0);
  put('archer', 16, 25, 'attack', 180);
  put('archer', 17, 26, 'attack', 225);
  // Marcha en las 8 direcciones (una unidad por dirección) y una muerte de cada tipo.
  [0, 45, 90, 135, 180, 225, 270, 315].forEach((dir, i) => put(i % 2 ? 'archer' : 'swordsman', 21 + i, 26, 'walk', dir));
  put('swordsman', 22, 29, 'death', 270);
  put('archer', 24, 29, 'death', 270);
  put('swordsman', 26, 29, 'idle', 270);
  put('archer', 27, 29, 'idle', 270);
}

/** Aldeanas de 0 A.D. haciendo cada tarea del contrato gráfico, en fila, mirando hacia la cámara (270°). */
function addVillagerTasks(scene: Phaser.Scene): void {
  const row: VillagerAnim[] = ['idle', 'walk', 'chop', 'mine', 'forage', 'farm', 'build', 'carry/wood', 'carry/stone', 'carry/gold', 'carry/food'];
  row.forEach((anim, i) => {
    const p = tileToWorld(8 + i, 21 + (i % 2));
    const frame = villagerFrame(anim, 270, 0);
    const o = pivot(scene, frame, ECO);
    scene.add.sprite(p.x, p.y, ECO, frame).setOrigin(o.x, o.y).setDepth(p.y).play(villagerAnimKey(anim, 270));
  });
}

/** Campamentos maderero y minero (huella 2×2; el ancla es el centro de la huella). */
function addCamps(scene: Phaser.Scene): void {
  const place = (frame: string, x: number, y: number) => {
    // Centro de una huella 2×2 con esquina en (x, y).
    const p = tileToWorld(x + 0.5, y + 0.5);
    const o = pivot(scene, frame, CAMP);
    scene.add.image(p.x, p.y, CAMP, frame).setOrigin(o.x, o.y).setDepth(p.y + 32);
  };
  place(CAMP_FRAMES.lumberCamp, 6, 18);
  place(CAMP_FRAMES.miningCamp, 10, 17);
}
