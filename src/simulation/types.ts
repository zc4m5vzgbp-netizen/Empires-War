import type { BuildingType, ResourceType, Stockpile } from '../content/economy.ts';

// Tipos del estado del mundo. Solo datos simples (JSON), sin funciones ni clases.
export type EntityId = number;

export interface Tile {
  x: number;
  y: number;
}

export type VillagerTask =
  | { type: 'idle' }
  | { type: 'move'; tx: number; ty: number }
  | { type: 'gather'; targetId: EntityId; phase: 'toResource' | 'gathering' | 'toDropsite'; dropsiteId: EntityId | null }
  | { type: 'build'; targetId: EntityId; phase: 'toSite' | 'building' };

export interface Villager {
  id: EntityId;
  kind: 'villager';
  owner: number;
  /** Posición en coordenadas de casilla (con decimales mientras camina). */
  x: number;
  y: number;
  /** Casillas que faltan por recorrer, en orden. */
  path: Tile[];
  task: VillagerTask;
  carryType: ResourceType | null;
  carryAmount: number;
  /** Progreso de recolección en unidades enteras (ver simulation/villager.ts). */
  gatherProgress: number;
}

export interface Building {
  id: EntityId;
  kind: 'building';
  type: BuildingType;
  owner: number;
  /** Casilla superior izquierda de la huella. */
  x: number;
  y: number;
  complete: boolean;
  /** Progreso de construcción en tercios de tick-aldeano (entero; ver simulation/construction.ts). */
  buildProgress: number;
}

export interface ResourceNode {
  id: EntityId;
  kind: 'resource';
  type: 'berryBush' | 'tree' | 'goldMine' | 'stoneMine';
  resource: ResourceType;
  x: number;
  y: number;
  amount: number;
}

export type Entity = Villager | Building | ResourceNode;

export interface PlayerState {
  name: string;
  /** Reserva común del imperio: solo cambia al depositar o al pagar. */
  stockpile: Stockpile;
}
