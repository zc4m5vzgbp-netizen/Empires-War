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
  private frames = 0;
  private ticks = 0;
  private stepTotalMs = 0;
  private statsElapsedMs = 0;
  private hudElapsedMs = 0;

  constructor(deps: GameSceneDeps) {
    super({ key: 'game-scene' });
    this.deps = deps;
  }

  create(): void {
    createProvisionalTextures(this);
    createEntityTextures(this);
    this.drawTerrain();
    this.entities = new EntityView(this);
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
    this.ghost.setTexture(buildingKey(placing.building)).setOrigin(o.x, o.y).setPosition(c.x, c.y).setVisible(true);
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
