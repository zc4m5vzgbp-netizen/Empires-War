import * as Phaser from 'phaser';
import { ENGINE } from '../content/config.ts';
import { BUILDINGS } from '../content/economy.ts';
import { TerrainKind } from '../content/terrain.ts';
import type { Controller } from '../input/controller.ts';
import { advanceClock, createFixedClock, type FixedClock } from '../simulation/clock.ts';
import type { Tile } from '../simulation/types.ts';
import { entityList, stepWorld, terrainAt, type WorldState } from '../simulation/world.ts';
import type { HudStore } from '../ui/store.ts';
import { canAfford, getStockpile } from '../simulation/economy.ts';
import { PLAYER_ID } from '../content/economy.ts';
import type { CameraModel } from './cameraModel.ts';
import { BUILDING_ORIGIN, MARKER_KEY, buildingKey, createEntityTextures, footprintKey } from './entityTextures.ts';
import { EntityView, type PrevPositions } from './entityView.ts';
import { tileToWorld } from './iso.ts';
import { TILE_VARIANTS, TREE_KEY, createProvisionalTextures, tileKey } from './textures.ts';
import { ART, ART_BUILDINGS, GRASS_VARIANTS, TREES, artReady, createArtAnimations, pivot, preloadArt, tileNoise } from './art.ts';
import { addGallery } from './gallery.ts';
import { groundFrame } from './terrainArt.ts';

export interface GameSceneDeps {
  world: WorldState;
  camera: CameraModel;
  hud: HudStore;
  controller: Controller;
  /** Llamado una vez por frame con el tiempo transcurrido (s), p. ej. para el teclado. */
  onFrame(dtSeconds: number): void;
}

const STATS_INTERVAL_MS = 500;
const HUD_INTERVAL_MS = 100;
const MARKER_MS = 700;

// Escena principal del Bloque 1: terreno, entidades, vista previa de construcción y medición.
export class GameScene extends Phaser.Scene {
  private readonly deps: GameSceneDeps;
  readonly clock: FixedClock = createFixedClock(ENGINE.tickRate, ENGINE.maxTicksPerFrame);
  private entities: EntityView | null = null;
  private readonly prev: PrevPositions = new Map();
  private ghost: Phaser.GameObjects.Image | null = null;
  private ghostFootprint: Phaser.GameObjects.Image | null = null;
  private marker: Phaser.GameObjects.Image | null = null;
  private markerMs = 0;
  private readonly terrainPainters: (() => void)[] = [];
  private frames = 0;
  private ticks = 0;
  private stepTotalMs = 0;
  private statsElapsedMs = 0;
  private hudElapsedMs = 0;

  constructor(deps: GameSceneDeps) {
    super({ key: 'game-scene' });
    this.deps = deps;
  }

  preload(): void {
    preloadArt(this);
  }

  create(): void {
    createProvisionalTextures(this);
    createEntityTextures(this);
    const art = artReady(this);
    if (art) createArtAnimations(this);
    if (art) this.drawArtTerrain();
    else this.drawTerrain();
    if (art && new URLSearchParams(location.search).has('galeria')) addGallery(this);
    this.entities = new EntityView(this, art);
    this.ghostFootprint = this.add.image(0, 0, footprintKey(2, true)).setVisible(false).setDepth(1e6);
    this.ghost = this.add.image(0, 0, buildingKey('mill')).setVisible(false).setAlpha(0.55).setDepth(1e6 + 1);
    this.marker = this.add.image(0, 0, MARKER_KEY).setVisible(false).setDepth(1e6 - 1);
    this.applyCamera();
    this.publishHud();
  }

  private drawTerrain(): void {
    const { map } = this.deps.world;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const kind = terrainAt(map, x, y) ?? TerrainKind.Grass;
        const pos = tileToWorld(x, y);
        const variant = (x * 7 + y * 13) % TILE_VARIANTS;
        this.add.image(pos.x, pos.y, tileKey(kind, variant)).setDepth(-1e6);
        if (kind === TerrainKind.Forest) {
          // Los árboles se ordenan por su base: los de delante tapan a los de detrás.
          this.add.image(pos.x, pos.y + 6, TREE_KEY).setOrigin(0.5, 0.9).setDepth(pos.y + 6);
        }
      }
    }
  }

  /**
   * Terreno con el arte del atlas. El suelo es estático: se pinta una sola vez en texturas por bloques
   * de 16×16 casillas, así cada frame dibuja unas pocas imágenes grandes en lugar de miles de casillas.
   * Los árboles siguen siendo imágenes sueltas para ordenarse en profundidad con las unidades.
   */
  private drawArtTerrain(): void {
    const { map } = this.deps.world;
    // Si iOS descarta el contexto WebGL (p. ej. en segundo plano), las texturas pintadas se pierden: se repintan.
    this.renderer.on('restorewebgl', () => {
      for (const paint of this.terrainPainters) paint();
    });
    const CHUNK = 16;
    const at = (x: number, y: number) => terrainAt(map, x, y);
    const frameFor = (_kind: number, x: number, y: number) => groundFrame(at, x, y, Math.floor(tileNoise(x, y) * GRASS_VARIANTS));
    // Las casillas del atlas miden 64×64; el centro del rombo está entre las filas 41 y 47 según el terreno.
    const LEFT = 32;
    const UP = 48;
    const DOWN = 24;
    for (let cy = 0; cy < map.height; cy += CHUNK) {
      for (let cx = 0; cx < map.width; cx += CHUNK) {
        const x1 = Math.min(cx + CHUNK, map.width) - 1;
        const y1 = Math.min(cy + CHUNK, map.height) - 1;
        const minX = tileToWorld(cx, y1).x - LEFT;
        const maxX = tileToWorld(x1, cy).x + LEFT;
        const minY = tileToWorld(cx, cy).y - UP;
        const maxY = tileToWorld(x1, y1).y + DOWN;
        const rt = this.add.renderTexture(minX, minY, Math.ceil(maxX - minX), Math.ceil(maxY - minY)).setOrigin(0, 0).setDepth(-1e6);
        const paint = () => {
          rt.clear();
          for (let y = cy; y <= y1; y++) {
            for (let x = cx; x <= x1; x++) {
              const kind = terrainAt(map, x, y) ?? TerrainKind.Grass;
              const pos = tileToWorld(x, y);
              const frame = frameFor(kind, x, y);
              const o = pivot(this, frame);
              rt.stamp(ART, frame, pos.x - minX, pos.y - minY, { originX: o.x, originY: o.y });
            }
          }
          rt.render();
        };
        paint();
        this.terrainPainters.push(paint);
      }
    }
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (terrainAt(map, x, y) !== TerrainKind.Forest) continue;
        const pos = tileToWorld(x, y);
        // Un árbol por casilla y a veces un segundo, con desplazamiento estable: bosque denso sin sobrecargar.
        const count = tileNoise(x, y, 5) < 0.35 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const tree = TREES[Math.floor(tileNoise(x, y, i + 1) * TREES.length)]!;
          const jx = (tileNoise(x, y, i + 7) - 0.5) * (count === 2 ? 22 : 10);
          const jy = (count === 2 ? (i === 0 ? -5 : 5) : 0) + (tileNoise(x, y, i + 11) - 0.5) * 4;
          const t = pivot(this, `tree/${tree}`);
          this.add.image(pos.x + jx, pos.y + jy, ART, `tree/${tree}`).setOrigin(t.x, t.y).setDepth(pos.y + jy);
        }
      }
    }
  }

  /** Copia el modelo de cámara a la cámara de Phaser. */
  private applyCamera(): void {
    const cam = this.cameras.main;
    cam.setZoom(this.deps.camera.zoom);
    cam.centerOn(this.deps.camera.cx, this.deps.camera.cy);
  }

  showMarker(tile: Tile): void {
    if (!this.marker) return;
    const p = tileToWorld(tile.x, tile.y);
    this.marker.setPosition(p.x, p.y).setVisible(true).setAlpha(1);
    this.markerMs = MARKER_MS;
  }

  /** Tras cargar una partida: se descartan los sprites y las posiciones anteriores. */
  onWorldReplaced(): void {
    this.prev.clear();
    this.entities?.reset();
    this.clock.accumulatorMs = 0;
    this.publishHud();
  }

  private updateGhost(): void {
    const ctrl = this.deps.controller;
    const placing = ctrl.placing;
    const origin = ctrl.placementOrigin();
    if (!placing || !origin || !this.ghost || !this.ghostFootprint) {
      this.ghost?.setVisible(false);
      this.ghostFootprint?.setVisible(false);
      return;
    }
    const size = BUILDINGS[placing.building].size;
    const check = ctrl.placementCheck();
    const c = tileToWorld(origin.x + (size - 1) / 2, origin.y + (size - 1) / 2);
    const o = BUILDING_ORIGIN[placing.building] ?? { x: 0.5, y: 0.8 };
    this.ghostFootprint.setTexture(footprintKey(size, check?.valid ?? false)).setPosition(c.x, c.y).setVisible(true);
    if (artReady(this)) {
      const a = ART_BUILDINGS[placing.building];
      const p = pivot(this, a.frame);
      this.ghost.setTexture(ART, a.frame).setOrigin(p.x, p.y).setScale(size / a.drawnSize);
    } else {
      this.ghost.setTexture(buildingKey(placing.building)).setOrigin(o.x, o.y).setScale(1);
    }
    this.ghost.setPosition(c.x, c.y).setVisible(true);
  }

  publishHud(): void {
    const { world, controller, hud } = this.deps;
    hud.set({
      stockpile: { ...getStockpile(world, PLAYER_ID) },
      selection: controller.summary(),
      placement: controller.placementCheck(),
      canAffordMill: canAfford(getStockpile(world, PLAYER_ID), BUILDINGS.mill.cost),
      paused: this.clock.paused,
      tick: world.tick,
    });
  }

  update(_time: number, delta: number): void {
    const { world } = this.deps;
    this.deps.onFrame(delta / 1000);

    const ticks = advanceClock(this.clock, delta);
    if (ticks > 0) {
      const start = performance.now();
      for (let i = 0; i < ticks; i++) {
        // Posiciones antes del tick, para suavizar el movimiento entre ticks.
        for (const e of entityList(world)) if (e.kind === 'villager') this.prev.set(e.id, { x: e.x, y: e.y });
        stepWorld(world);
      }
      this.stepTotalMs += performance.now() - start;
      this.ticks += ticks;
    }
    const alpha = this.clock.paused ? 1 : Math.min(1, this.clock.accumulatorMs / (1000 / this.clock.tickRate));

    this.applyCamera();
    this.entities?.sync(world, this.prev, alpha, new Set(this.deps.controller.selection));
    this.updateGhost();
    if (this.marker && this.markerMs > 0) {
      this.markerMs -= delta;
      this.marker.setAlpha(Math.max(0, this.markerMs / MARKER_MS)).setVisible(this.markerMs > 0);
    }

    this.hudElapsedMs += delta;
    if (this.hudElapsedMs >= HUD_INTERVAL_MS) {
      this.hudElapsedMs = 0;
      this.publishHud();
    }
    this.frames++;
    this.statsElapsedMs += delta;
    if (this.statsElapsedMs >= STATS_INTERVAL_MS) {
      const seconds = this.statsElapsedMs / 1000;
      this.deps.hud.set({
        fps: Math.round(this.frames / seconds),
        ticksPerSecond: Math.round(this.ticks / seconds),
        stepMs: this.ticks > 0 ? this.stepTotalMs / this.ticks : 0,
        zoom: this.deps.camera.zoom,
      });
      this.frames = 0;
      this.ticks = 0;
      this.stepTotalMs = 0;
      this.statsElapsedMs = 0;
    }
  }
}
