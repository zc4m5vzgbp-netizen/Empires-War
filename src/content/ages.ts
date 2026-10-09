import type { Stockpile } from './economy.ts';

/** Progresión histórica: los costes son referencias provisionales de AoE II DE. */
export const AGE_ORDER = ['dark', 'feudal', 'castle', 'imperial'] as const;
export type Age = (typeof AGE_ORDER)[number];

export interface AgeDefinition {
  id: Age;
  name: string;
  architecture: 'early-medieval' | 'medieval' | 'fortified' | 'late-medieval';
  advanceCost: Partial<Stockpile> | null;
  advanceSeconds: number | null;
  status: 'provisional';
}

export const AGES: Record<Age, AgeDefinition> = {
  dark: { id: 'dark', name: 'Alta Edad Media', architecture: 'early-medieval', advanceCost: { food: 500 }, advanceSeconds: 130, status: 'provisional' },
  feudal: { id: 'feudal', name: 'Edad Feudal', architecture: 'medieval', advanceCost: { food: 800, gold: 200 }, advanceSeconds: 160, status: 'provisional' },
  castle: { id: 'castle', name: 'Edad de los Castillos', architecture: 'fortified', advanceCost: { food: 1000, gold: 800 }, advanceSeconds: 190, status: 'provisional' },
  imperial: { id: 'imperial', name: 'Edad Imperial', architecture: 'late-medieval', advanceCost: null, advanceSeconds: null, status: 'provisional' },
};

export function nextAge(age: Age): Age | null {
  const index = AGE_ORDER.indexOf(age);
  return AGE_ORDER[index + 1] ?? null;
}

/** Coste y tiempo corresponden a avanzar DESDE la edad actual. */
export function ageAdvance(age: Age): { next: Age; cost: Partial<Stockpile>; seconds: number } | null {
  const next = nextAge(age);
  const def = AGES[age];
  return next && def.advanceCost && def.advanceSeconds !== null
    ? { next, cost: { ...def.advanceCost }, seconds: def.advanceSeconds }
    : null;
}

/** Clave estable para elegir recursos gráficos por edad sin duplicar lógica en el renderizador. */
export function ageBuildingVisual(building: string, age: Age): string {
  if (!/^[a-z][a-zA-Z0-9]*$/.test(building)) throw new Error('Tipo de edificio inválido');
  return `building/${age}/${building}`;
}
