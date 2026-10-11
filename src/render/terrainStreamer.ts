import type * as Phaser from 'phaser';
import { TerrainKind } from '../content/terrain.ts';
import { terrainAt, type WorldMap } from '../simulation/world.ts';
import { ART, GRASS_VARIANTS, TREES, pivot, tileNoise } from './art.ts';
import { tileToWorld } from './iso.ts';
import { CHUNK_TEXTURE, chunkGrid, chunksInView, planStream, terrainLevel, type ChunkGrid, type ChunkInfo, type ViewRect } from './terrainChunks.ts';
import { groundFrame } from './terrainArt.ts';

// Suelo y árboles por bloques visibles (sustituye al pintado completo del mapa en texturas).
// - Solo existen texturas de suelo para los bloques cerca de la cámara; al alejarse se reutilizan (grupo limitado).
// - Con zoom bajo los bloques se pintan a media resolución y se dibujan al doble de tamaño (misma imagen en pantalla).
// - Los árboles se crean desde un grupo de imágenes reutilizables solo en los bloques cercanos.
// El aspecto es el mismo que antes: mismos fotogramas, mismo orden de pintado dentro de cada bloque y entre bloques.

/** Bloques pintados como máximo por fotograma al mover la cámara (los visibles del primer fotograma se pintan todos). */
const PAINT_BUDGET = 4;
/** Margen (px de mundo) de precarga y de retención alrededor de la vista. */
const PRELOAD_MARGIN = 256;
const KEEP_MARGIN = 640;
/** Texturas libres que se guardan para reutilizar, por nivel; el resto se destruyen y liberan su memoria. */
const MAX_FREE = 12;
const DEPTH_BASE = -1e6;

interface ActiveChunk {
  rt: Phaser.GameObjects.RenderTexture;
  level: 0 | 1;
}

interface TreeDesc {
  x: number;
  y: number;
  frame: string;
  ox: number;
  oy: number;
}

export class TerrainStreamer {
  readonly grid: ChunkGrid;
  private readonly active = new Map<number, ActiveChunk>();
  private readonly free: Phaser.GameObjects.RenderTexture[][] = [[], []];
  private level: 0 | 1 = 0;
  private first = true;
  private readonly trees: TreeDesc[][] = [];
  private readonly treeViews = new Map<number, Phaser.GameObjects.Image[]>();
  private readonly freeTrees: Phaser.GameObjects.Image[] = [];
  private treePool = 0;
  private paintedTotal = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: WorldMap,
  ) {
    this.grid = chunkGrid(map.width, map.height);
    this.indexTrees();
    // iOS puede descartar el contexto WebGL (segundo plano): las texturas pintadas se pierden y se repintan.
    scene.renderer.on('restorewebgl', () => {
      for (const [i, a] of this.active) this.paint(a.rt, this.grid.chunks[i]!, a.level);
    });
  }

  /** Mismo reparto de árboles que el pintado anterior (1 o 2 por casilla de bosque, desplazamiento estable). */
  private indexTrees(): void {
    const { map, grid } = this;
    for (const ch of grid.chunks) {
      const list: TreeDesc[] = [];
      for (let y = ch.ty0; y <= ch.ty1; y++) {
        for (let x = ch.tx0; x <= ch.tx1; x++) {
          if (terrainAt(map, x, y) !== TerrainKind.Forest) continue;
          const pos = tileToWorld(x, y);
          const count = tileNoise(x, y, 5) < 0.35 ? 2 : 1;
          for (let i = 0; i < count; i++) {
            const tree = TREES[Math.floor(tileNoise(x, y, i + 1) * TREES.length)]!;
            const jx = (tileNoise(x, y, i + 7) - 0.5) * (count === 2 ? 22 : 10);
            const jy = (count === 2 ? (i === 0 ? -5 : 5) : 0) + (tileNoise(x, y, i + 11) - 0.5) * 4;
            const t = pivot(this.scene, `tree/${tree}`);
            list.push({ x: pos.x + jx, y: pos.y + jy, frame: `tree/${tree}`, ox: t.x, oy: t.y });
          }
        }
      }
      this.trees[ch.index] = list;
    }
  }

  /** Llamar una vez por fotograma con el rectángulo visible (coordenadas de mundo) y el zoom actual. */
  update(view: ViewRect, zoom: number): void {
    this.level = terrainLevel(zoom, this.level);
    const onScreen = chunksInView(this.grid, view, 0);
    const wanted = chunksInView(this.grid, view, PRELOAD_MARGIN);
    const keep = new Set(chunksInView(this.grid, view, KEEP_MARGIN));
    // Bloques activos pintados con otro nivel de detalle: se repintan (sin quitarlos hasta tener el nuevo).
    const stale = new Set<number>();
    for (const [i, a] of this.active) if (a.level !== this.level && keep.has(i)) stale.add(i);
    const activeOk = new Set<number>();
    for (const i of this.active.keys()) if (!stale.has(i)) activeOk.add(i);
    const budget = this.first ? onScreen.length + PAINT_BUDGET : PAINT_BUDGET;
    const plan = planStream(activeOk, this.first ? onScreen : wanted, keep, budget);
    for (const i of plan.release) if (!stale.has(i)) this.releaseChunk(i);
    for (const i of plan.paint) this.acquireChunk(i);
    // Árboles: presentes en los bloques de precarga, retirados fuera del margen de retención.
    for (const i of wanted) if (!this.treeViews.has(i)) this.showTrees(i);
    for (const i of [...this.treeViews.keys()]) if (!keep.has(i)) this.hideTrees(i);
    this.first = false;
  }

  private acquireChunk(i: number): void {
    const ch = this.grid.chunks[i]!;
    const level = this.level;
    const s = level ? 0.5 : 1;
    const rt =
      this.free[level]!.pop() ??
      this.scene.add.renderTexture(0, 0, Math.ceil(CHUNK_TEXTURE.w * s), Math.ceil(CHUNK_TEXTURE.h * s)).setOrigin(0, 0);
    rt.setPosition(ch.x, ch.y).setScale(1 / s).setDepth(DEPTH_BASE + ch.index * 1e-4).setVisible(true);
    this.paint(rt, ch, level);
    const old = this.active.get(i);
    if (old) this.recycle(old);
    this.active.set(i, { rt, level });
  }

  private releaseChunk(i: number): void {
    const a = this.active.get(i);
    if (!a) return;
    this.active.delete(i);
    this.recycle(a);
  }

  private recycle(a: ActiveChunk): void {
    a.rt.setVisible(false);
    const pool = this.free[a.level]!;
    if (pool.length < MAX_FREE) pool.push(a.rt);
    else a.rt.destroy();
  }

  private paint(rt: Phaser.GameObjects.RenderTexture, ch: ChunkInfo, level: 0 | 1): void {
    const s = level ? 0.5 : 1;
    const at = (x: number, y: number) => terrainAt(this.map, x, y);
    rt.clear();
    for (let y = ch.ty0; y <= ch.ty1; y++) {
      for (let x = ch.tx0; x <= ch.tx1; x++) {
        const pos = tileToWorld(x, y);
        const frame = groundFrame(at, x, y, Math.floor(tileNoise(x, y) * GRASS_VARIANTS));
        const o = pivot(this.scene, frame);
        rt.stamp(ART, frame, (pos.x - ch.x) * s, (pos.y - ch.y) * s, { originX: o.x, originY: o.y, scale: s });
      }
    }
    rt.render();
    this.paintedTotal++;
  }

  private showTrees(i: number): void {
    const views: Phaser.GameObjects.Image[] = [];
    for (const t of this.trees[i] ?? []) {
      let img = this.freeTrees.pop();
      if (!img) {
        img = this.scene.add.image(0, 0, ART, t.frame);
        this.treePool++;
      }
      img.setTexture(ART, t.frame).setOrigin(t.ox, t.oy).setPosition(t.x, t.y).setDepth(t.y).setVisible(true);
      views.push(img);
    }
    this.treeViews.set(i, views);
  }

  private hideTrees(i: number): void {
    for (const img of this.treeViews.get(i) ?? []) {
      img.setVisible(false);
      this.freeTrees.push(img);
    }
    this.treeViews.delete(i);
  }

  /** Para medición y pruebas (gancho ?test=1). */
  stats() {
    let bytes = 0;
    const all = [...[...this.active.values()].map((a) => a.rt), ...this.free[0]!, ...this.free[1]!];
    for (const rt of all) bytes += rt.width * rt.height * 4;
    let treesShown = 0;
    for (const v of this.treeViews.values()) treesShown += v.length;
    return {
      level: this.level,
      chunks: this.grid.chunks.length,
      activeChunks: this.active.size,
      freeChunks: this.free[0]!.length + this.free[1]!.length,
      chunkTextureMB: Math.round((bytes / 1048576) * 10) / 10,
      treesTotal: this.trees.reduce((n, l) => n + l.length, 0),
      treesShown,
      treePool: this.treePool,
      paintedTotal: this.paintedTotal,
    };
  }
}
