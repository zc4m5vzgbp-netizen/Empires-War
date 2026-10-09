import { RESOURCE_LABELS, RESOURCE_TYPES, type ResourceType, type Stockpile } from '../content/economy.ts';
import type { WorldState } from './world.ts';

// Reglas de la reserva común del imperio. Única fuente: la interfaz solo consulta estas funciones.

export function getStockpile(world: WorldState, playerId: number): Stockpile {
  const player = world.players[playerId];
  if (!player) throw new Error(`Jugador ${playerId} inexistente`);
  return player.stockpile;
}

/** Recursos que faltan para pagar un coste (vacío si alcanza). */
export function missingFor(stockpile: Stockpile, cost: Partial<Stockpile>): Partial<Stockpile> {
  const missing: Partial<Stockpile> = {};
  for (const r of RESOURCE_TYPES) {
    const need = cost[r] ?? 0;
    if (need > stockpile[r]) missing[r] = need - stockpile[r];
  }
  return missing;
}

export function canAfford(stockpile: Stockpile, cost: Partial<Stockpile>): boolean {
  return Object.keys(missingFor(stockpile, cost)).length === 0;
}

export function describeMissing(missing: Partial<Stockpile>): string {
  return RESOURCE_TYPES.filter((r) => missing[r])
    .map((r) => `${missing[r]} de ${RESOURCE_LABELS[r].toLowerCase()}`)
    .join(', ');
}

/** Descuenta un coste de la reserva común. Devuelve false (sin tocar nada) si no alcanza. */
export function pay(world: WorldState, playerId: number, cost: Partial<Stockpile>): boolean {
  const stockpile = getStockpile(world, playerId);
  if (!canAfford(stockpile, cost)) return false;
  for (const r of RESOURCE_TYPES) stockpile[r] -= cost[r] ?? 0;
  return true;
}

/** Suma a la reserva común lo que un aldeano entrega en un depósito. */
export function deposit(world: WorldState, playerId: number, resource: ResourceType, amount: number): void {
  getStockpile(world, playerId)[resource] += amount;
}
