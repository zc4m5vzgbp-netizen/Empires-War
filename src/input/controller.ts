import { BUILDINGS, PLAYER_ID, RESOURCE_LABELS, VILLAGER, type BuildingType } from '../content/economy.ts';
import { screenToWorld, type CameraModel } from '../render/cameraModel.ts';
import { worldToTile } from '../render/iso.ts';
import { pickAt, villagersInRect, type Pick } from '../render/picking.ts';
import { issueCommand, type Command, type CommandResult } from '../simulation/commands.ts';
import { constructionRatio } from '../simulation/construction.ts';
import { canAfford, describeMissing, getStockpile, missingFor } from '../simulation/economy.ts';
import { canPlaceBuilding } from '../simulation/placement.ts';
import type { EntityId, Tile, Villager } from '../simulation/types.ts';
import { getEntity, terrainAt, type WorldState } from '../simulation/world.ts';
import { TERRAIN_DEFS } from '../content/terrain.ts';

// Traduce toques y clics en selección y órdenes. Las reglas viven en la simulación:
// aquí solo se elige qué orden enviar y se muestra el resultado.

export interface SelectionSummary {
  kind: 'none' | 'villagers' | 'building' | 'resource' | 'tile';
  title: string;
  lines: string[];
  /** Acción «Construir Molino» disponible (hay aldeanos seleccionados). */
  canOrderBuild: boolean;
}

export interface PlacementSummary {
  name: string;
  hasTile: boolean;
  valid: boolean;
  reason: string | null;
}

export interface ControllerEvents {
  toast(text: string, kind?: 'info' | 'error'): void;
  marker(tile: Tile): void;
}

export function createController(deps: {
  world: WorldState;
  camera: CameraModel;
  viewSize(): { w: number; h: number };
  events: ControllerEvents;
}) {
  const { world, camera, events } = deps;
  let selection: EntityId[] = [];
  let placing: { building: BuildingType; tile: Tile | null } | null = null;
  /** Casilla vacía tocada para inspeccionarla (función del Bloque 0). */
  let inspected: Tile | null = null;

  const toWorld = (sx: number, sy: number) => {
    const { w, h } = deps.viewSize();
    return screenToWorld(camera, sx, sy, w, h);
  };
  const toTile = (sx: number, sy: number): Tile => {
    const p = toWorld(sx, sy);
    const t = worldToTile(p.x, p.y);
    return { x: Math.round(t.x), y: Math.round(t.y) };
  };
  const pick = (sx: number, sy: number): Pick => {
    const p = toWorld(sx, sy);
    return pickAt(world, p.x, p.y);
  };

  /** Limpia de la selección lo que ya no existe (p. ej. un arbusto agotado). */
  const liveSelection = () => {
    selection = selection.filter((id) => getEntity(world, id) !== undefined);
    return selection;
  };
  const selectedVillagers = () =>
    liveSelection().filter((id) => {
      const e = getEntity(world, id);
      return e?.kind === 'villager' && e.owner === PLAYER_ID;
    });

  const send = (cmd: Command): CommandResult => {
    const result = issueCommand(world, cmd);
    if (!result.ok) events.toast(result.reason, 'error');
    return result;
  };

  /** Orden contextual para los aldeanos seleccionados según lo que hay en el destino. */
  function contextualOrder(sx: number, sy: number): void {
    const unitIds = selectedVillagers();
    if (unitIds.length === 0) return;
    const target = pick(sx, sy);
    if (target?.kind === 'resource') {
      send({ type: 'gather', playerId: PLAYER_ID, unitIds, targetId: target.id });
      return;
    }
    if (target?.kind === 'building') {
      const b = getEntity(world, target.id);
      if (b?.kind === 'building' && b.owner === PLAYER_ID && !b.complete) {
        send({ type: 'assistBuild', playerId: PLAYER_ID, unitIds, targetId: b.id });
        return;
      }
    }
    if (target?.kind === 'villager') return;
    const tile = toTile(sx, sy);
    if (send({ type: 'move', playerId: PLAYER_ID, unitIds, x: tile.x, y: tile.y }).ok) events.marker(tile);
  }

  function placementCheck(): PlacementSummary | null {
    if (!placing) return null;
    const name = BUILDINGS[placing.building].name;
    if (!placing.tile) return { name, hasTile: false, valid: false, reason: null };
    const size = BUILDINGS[placing.building].size;
    // La casilla tocada es el centro aproximado de la huella.
    const origin = { x: placing.tile.x - Math.floor((size - 1) / 2), y: placing.tile.y - Math.floor((size - 1) / 2) };
    const check = canPlaceBuilding(world, placing.building, origin.x, origin.y);
    return { name, hasTile: true, valid: check.ok, reason: check.ok ? null : check.reason };
  }

  function placementOrigin(): Tile | null {
    if (!placing?.tile) return null;
    const size = BUILDINGS[placing.building].size;
    return { x: placing.tile.x - Math.floor((size - 1) / 2), y: placing.tile.y - Math.floor((size - 1) / 2) };
  }

  function confirmPlacement(): boolean {
    const origin = placementOrigin();
    if (!placing || !origin) return false;
    const unitIds = selectedVillagers();
    const result = send({ type: 'build', playerId: PLAYER_ID, unitIds, building: placing.building, x: origin.x, y: origin.y });
    if (result.ok) {
      events.toast(`${BUILDINGS[placing.building].name} colocado: los aldeanos empiezan a construir.`);
      placing = null;
      return true;
    }
    return false;
  }

  function describeVillager(v: Villager): string {
    const carry = v.carryAmount > 0 && v.carryType ? ` · carga ${v.carryAmount}/${VILLAGER.carryCapacity} de ${RESOURCE_LABELS[v.carryType].toLowerCase()}` : '';
    switch (v.task.type) {
      case 'idle':
        return `Sin tarea${carry}`;
      case 'move':
        return `Caminando${carry}`;
      case 'gather':
        if (v.task.phase === 'gathering') return `Recolectando bayas${carry}`;
        if (v.task.phase === 'toDropsite') return `Llevando comida al depósito${carry}`;
        return `Yendo a recolectar${carry}`;
      case 'build': {
        const site = getEntity(world, v.task.targetId);
        const name = site?.kind === 'building' ? BUILDINGS[site.type].name : 'edificio';
        return v.task.phase === 'building' ? `Construyendo ${name}` : `Yendo a construir ${name}`;
      }
    }
  }

  function summary(): SelectionSummary {
    const ids = liveSelection();
    const villagers = ids.map((id) => getEntity(world, id)).filter((e): e is Villager => e?.kind === 'villager');
    if (villagers.length > 0) {
      return {
        kind: 'villagers',
        title: villagers.length === 1 ? `Aldeano #${villagers[0]!.id}` : `${villagers.length} aldeanos`,
        lines: villagers.slice(0, 3).map((v) => (villagers.length === 1 ? describeVillager(v) : `#${v.id}: ${describeVillager(v)}`)),
        canOrderBuild: true,
      };
    }
    const e = ids.length === 1 ? getEntity(world, ids[0]!) : undefined;
    if (e?.kind === 'building') {
      const def = BUILDINGS[e.type];
      const accepts = def.accepts.map((r) => RESOURCE_LABELS[r].toLowerCase()).join(', ');
      const lines = e.complete
        ? [`Recibe: ${accepts}`, 'Edificio provisional del Bloque 1']
        : [`En construcción: ${Math.floor(constructionRatio(e.type, e.buildProgress) * 100)} %`];
      return { kind: 'building', title: def.name, lines, canOrderBuild: false };
    }
    if (e?.kind === 'resource') {
      return { kind: 'resource', title: 'Arbusto de bayas', lines: [`Quedan ${e.amount} de comida`], canOrderBuild: false };
    }
    if (inspected) {
      const kind = terrainAt(world.map, inspected.x, inspected.y);
      if (kind !== undefined) {
        const name = TERRAIN_DEFS[kind]?.name ?? 'Terreno';
        return { kind: 'tile', title: name, lines: [`Casilla ${inspected.x}, ${inspected.y} (terreno provisional)`], canOrderBuild: false };
      }
    }
    return { kind: 'none', title: '', lines: [], canOrderBuild: false };
  }

  return {
    get selection(): readonly EntityId[] {
      return liveSelection();
    },
    get placing() {
      return placing;
    },
    placementOrigin,
    placementCheck,
    summary,
    /** ¿La reserva común alcanza para el edificio? (regla de la simulación, solo consulta) */
    canAffordBuilding: (building: BuildingType) => canAfford(getStockpile(world, PLAYER_ID), BUILDINGS[building].cost),

    /** Toque o clic principal. En táctil, si hay aldeanos seleccionados, también da órdenes. */
    primaryTap(sx: number, sy: number, opts: { shift: boolean; touch: boolean }): void {
      if (placing) {
        placing.tile = toTile(sx, sy);
        if (!opts.touch) confirmPlacement(); // con ratón, el clic coloca; en táctil se confirma con botón
        return;
      }
      const target = pick(sx, sy);
      inspected = null;
      if (target?.kind === 'villager') {
        if (opts.shift) selection = selection.includes(target.id) ? selection.filter((id) => id !== target.id) : [...selection, target.id];
        else selection = [target.id];
        return;
      }
      if (opts.touch && selectedVillagers().length > 0) {
        contextualOrder(sx, sy);
        return;
      }
      selection = target ? [target.id] : [];
      if (!target) inspected = toTile(sx, sy);
    },

    /** Clic derecho: orden contextual (o cancelar la colocación). */
    secondaryTap(sx: number, sy: number): void {
      if (placing) {
        placing = null;
        return;
      }
      contextualOrder(sx, sy);
    },

    boxSelect(sx0: number, sy0: number, sx1: number, sy1: number, opts: { shift: boolean }): void {
      if (placing) return;
      const ids = villagersInRect(world, PLAYER_ID, toWorld(sx0, sy0), toWorld(sx1, sy1));
      selection = opts.shift ? [...new Set([...selectedVillagers(), ...ids])] : ids;
    },

    hover(sx: number, sy: number): void {
      if (placing) placing.tile = toTile(sx, sy);
    },

    startPlacing(building: BuildingType): void {
      if (selectedVillagers().length === 0) {
        events.toast('Selecciona primero un aldeano.', 'error');
        return;
      }
      const missing = missingFor(getStockpile(world, PLAYER_ID), BUILDINGS[building].cost);
      if (Object.keys(missing).length > 0) {
        events.toast(`Faltan ${describeMissing(missing)} para ${BUILDINGS[building].name}.`, 'error');
        return;
      }
      placing = { building, tile: null };
    },
    confirmPlacement,
    cancelPlacing(): void {
      placing = null;
    },
    deselect(): void {
      selection = [];
      inspected = null;
    },
    /** Tras cargar una partida: la selección anterior ya no tiene sentido. */
    reset(): void {
      selection = [];
      placing = null;
      inspected = null;
    },
  };
}

export type Controller = ReturnType<typeof createController>;
