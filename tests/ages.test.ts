import assert from 'node:assert/strict';
import test from 'node:test';
import { AGE_ORDER, ageAdvance, ageBuildingVisual, nextAge } from '../src/content/ages.ts';

test('cuatro edades en secuencia', () => {
  assert.equal(AGE_ORDER.length, 4);
  assert.equal(nextAge('dark'), 'feudal');
  assert.equal(nextAge('feudal'), 'castle');
  assert.equal(nextAge('castle'), 'imperial');
  assert.equal(nextAge('imperial'), null);
});

test('el coste se copia para evitar mutaciones', () => {
  const a = ageAdvance('dark');
  assert.equal(a?.cost.food, 500);
  if (a) a.cost.food = 0;
  assert.equal(ageAdvance('dark')?.cost.food, 500);
});

test('gráficos distintos para cada edad', () => {
  assert.equal(new Set(AGE_ORDER.map(age => ageBuildingVisual('townCenter', age))).size, 4);
});
