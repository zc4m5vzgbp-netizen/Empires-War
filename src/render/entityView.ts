import type * as Phaser from 'phaser';
import { BERRY_BUSH, BUILDINGS } from '../content/economy.ts';
import { constructionRatio } from '../simulation/construction.ts';
import type { Building, Entity, EntityId } from '../simulation/types.ts';
import { entityList, type WorldState } from '../simulation/world.ts';
import {
  BUILDING_ORIGIN,
  BUSH_KEY,
  BUSH_ORIGIN,
  CARRY_FOOD_KEY,
  RING_KEY,
  VILLAGER_KEY,
  VILLAGER_ORIGIN,
  buildingKey,
  foundationKey,
  outlineKey,
} from './entityTextures.ts';
import { TILE_H, tileToWorld } from './iso.ts';

// Dibuja las entidades a partir del estado. Solo lee la simulación; nunca la modifica.

interface View {
  kind: Entity['kind'];
  main: Phaser.GameObjects.Image;
  ring?: Phaser.GameObjects.Image;
  carry?: Phaser.GameObjects.Image;
  foundation?: Phaser.GameObjects.Image;
  complete?: boolean;
}

export type PrevPositions = Map<EntityId, { x: number; y: number }>;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function buildingCenter(b: Building): { x: number; y: number } {
  const size = BUILDINGS[b.type].size;
  return tileToWorld(b.x + (size - 1) / 2, b.y + (size - 1) / 2);
}

export class EntityView {
  private readonly views = new Map<EntityId, View>();
  private readonly bars: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.bars = scene.add.graphics().setDepth(1e7);
  }

  /** Borra todo (p. ej. al cargar una partida); se recrea en el siguiente sync. */
  reset(): void {
    for (const v of this.views.values()) this.destroyView(v);
    this.views.clear();
    this.bars.clear();
  }

  private destroyView(v: View): void {
    v.main.destroy();
    v.ring?.destroy();
    v.carry?.destroy();
    v.foundation?.destroy();
  }

  private create(e: Entity): View {
    const add = this.scene.add;
    if (e.kind === 'villager') {
      return {
        kind: e.kind,
        main: add.image(0, 0, VILLAGER_KEY).setOrigin(VILLAGER_ORIGIN.x, VILLAGER_ORIGIN.y),
        ring: add.image(0, 0, RING_KEY).setVisible(false),
        carry: add.image(0, 0, CARRY_FOOD_KEY).setVisible(false),
      };
    }
    if (e.kind === 'resource') {
      return {
        kind: e.kind,
        main: add.image(0, 0, BUSH_KEY).setOrigin(BUSH_ORIGIN.x, BUSH_ORIGIN.y),
        ring: add.image(0, 0, outlineKey(1)).setVisible(false),
      };
    }
    const size = BUILDINGS[e.type].size;
    const origin = BUILDING_ORIGIN[e.type] ?? { x: 0.5, y: 0.8 };
    return {
      kind: e.kind,
      main: add.image(0, 0, buildingKey(e.type)).setOrigin(origin.x, origin.y),
      foundation: add.image(0, 0, foundationKey(size)),
      ring: add.image(0, 0, outlineKey(size)).setVisible(false),
    };
  }

  sync(world: WorldState, prev: PrevPositions, alpha: number, selected: ReadonlySet<EntityId>): void {
    const seen = new Set<EntityId>();
    this.bars.clear();
    for (const e of entityList(world)) {
      seen.add(e.id);
      let view = this.views.get(e.id);
      if (!view) {
        view = this.create(e);
        this.views.set(e.id, view);
      }
      const isSelected = selected.has(e.id);

      if (e.kind === 'villager') {
        const p0 = prev.get(e.id) ?? e;
        const pos = tileToWorld(lerp(p0.x, e.x, alpha), lerp(p0.y, e.y, alpha));
        view.main.setPosition(pos.x, pos.y).setDepth(pos.y);
        view.ring?.setPosition(pos.x, pos.y).setDepth(pos.y - 0.5).setVisible(isSelected);
        view.carry
          ?.setPosition(pos.x + 9, pos.y - 20)
          .setDepth(pos.y + 0.5)
          .setVisible(e.carryAmount > 0);
      } else if (e.kind === 'resource') {
        const pos = tileToWorld(e.x, e.y);
        const fullness = Math.max(0, Math.min(1, e.amount / BERRY_BUSH.food));
        view.main.setPosition(pos.x, pos.y + 4).setDepth(pos.y + 4).setScale(0.65 + 0.35 * fullness);
        view.ring?.setPosition(pos.x, pos.y).setDepth(pos.y - 1).setVisible(isSelected);
      } else {
        const c = buildingCenter(e);
        const size = BUILDINGS[e.type].size;
        const front = c.y + (size * TILE_H) / 2;
        const ratio = e.complete ? 1 : constructionRatio(e.type, e.buildProgress);
        view.main.setPosition(c.x, c.y).setDepth(front).setAlpha(e.complete ? 1 : 0.15 + 0.6 * ratio);
        view.foundation?.setPosition(c.x, c.y).setDepth(front - 0.6).setVisible(!e.complete);
        view.ring?.setPosition(c.x, c.y).setDepth(front - 0.5).setVisible(isSelected);
        if (!e.complete) {
          // Barra de progreso de construcción.
          const w = 56;
          const x = c.x - w / 2;
          const y = c.y - 40;
          this.bars.fillStyle(0x1d150e, 0.85).fillRect(x - 1, y - 1, w + 2, 8);
          this.bars.fillStyle(0xe0b35a, 1).fillRect(x, y, w * ratio, 6);
        }
      }
    }
    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        this.destroyView(view);
        this.views.delete(id);
      }
    }
  }
}
