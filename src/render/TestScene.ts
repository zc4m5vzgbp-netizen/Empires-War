import * as Phaser from 'phaser';
import { ENGINE } from '../content/config.ts';
import { TERRAIN_DEFS, TerrainKind } from '../content/terrain.ts';
import { advanceClock, createFixedClock } from '../simulation/clock.ts';
import { stepWorld, terrainAt, type WorldState } from '../simulation/world.ts';
import type { HudStore } from '../ui/store.ts';
import { screenToWorld, type CameraModel } from './cameraModel.ts';
import { tileToWorld, worldToTile } from './iso.ts';
import { HIGHLIGHT_KEY, TILE_VARIANTS, TREE_KEY, createProvisionalTextures, tileKey } from './textures.ts';

export interface TestSceneDeps {
  world: WorldState;
  camera: CameraModel;
  hud: HudStore;
  /** Llamado una vez por frame con el tiempo transcurrido (s), p. ej. para el teclado. */
  onFrame(dtSeconds: number): void;
}

const STATS_INTERVAL_MS = 500;

// Escena de prueba del Bloque 0: terreno isométrico, cámara y medición. NO es gameplay.
export class TestScene extends Phaser.Scene {
  private readonly deps: TestSceneDeps;
  private readonly clock = createFixedClock(ENGINE.tickRate, ENGINE.maxTicksPerFrame);
  private highlight: Phaser.GameObjects.Image | null = null;
  private frames = 0;
  private ticks = 0;
  private stepTotalMs = 0;
  private statsElapsedMs = 0;

  constructor(deps: TestSceneDeps) {
    super({ key: 'test-scene' });
    this.deps = deps;
  }

  create(): void {
    createProvisionalTextures(this);
    this.drawTerrain();
    this.highlight = this.add.image(0, 0, HIGHLIGHT_KEY).setVisible(false).setDepth(1e6);
    this.applyCamera();
  }

  private drawTerrain(): void {
    const { map } = this.deps.world;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const kind = terrainAt(map, x, y) ?? TerrainKind.Grass;
        const pos = tileToWorld(x, y);
        const variant = (x * 7 + y * 13) % TILE_VARIANTS;
        this.add.image(pos.x, pos.y, tileKey(kind, variant)).setDepth(0);
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

  /** Toque o clic en pantalla: marca la casilla y describe su terreno. */
  inspect(sx: number, sy: number): void {
    const { width, height } = this.scale;
    const w = screenToWorld(this.deps.camera, sx, sy, width, height);
    const t = worldToTile(w.x, w.y);
    const x = Math.round(t.x);
    const y = Math.round(t.y);
    const kind = terrainAt(this.deps.world.map, x, y);
    if (kind === undefined || !this.highlight) {
      this.highlight?.setVisible(false);
      this.deps.hud.set({ info: 'Fuera del mapa.' });
      return;
    }
    const pos = tileToWorld(x, y);
    this.highlight.setPosition(pos.x, pos.y).setVisible(true);
    const name = TERRAIN_DEFS[kind]?.name ?? 'Desconocido';
    this.deps.hud.set({ info: `${name} · casilla ${x}, ${y} (terreno provisional)` });
  }

  update(_time: number, delta: number): void {
    this.deps.onFrame(delta / 1000);

    const ticks = advanceClock(this.clock, delta);
    if (ticks > 0) {
      const start = performance.now();
      for (let i = 0; i < ticks; i++) stepWorld(this.deps.world);
      this.stepTotalMs += performance.now() - start;
      this.ticks += ticks;
    }

    this.applyCamera();
    this.frames++;
    this.statsElapsedMs += delta;
    if (this.statsElapsedMs >= STATS_INTERVAL_MS) {
      const seconds = this.statsElapsedMs / 1000;
      this.deps.hud.set({
        fps: Math.round(this.frames / seconds),
        ticksPerSecond: Math.round(this.ticks / seconds),
        stepMs: this.ticks > 0 ? this.stepTotalMs / this.ticks : 0,
        tick: this.deps.world.tick,
        zoom: this.deps.camera.zoom,
      });
      this.frames = 0;
      this.ticks = 0;
      this.stepTotalMs = 0;
      this.statsElapsedMs = 0;
    }
  }
}
