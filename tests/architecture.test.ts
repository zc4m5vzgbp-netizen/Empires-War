import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const ROOT = new URL('..', import.meta.url).pathname;

function filesIn(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...filesIn(rel));
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

test('Arquitectura: existen los módulos separados que exige el documento maestro', () => {
  for (const dir of ['simulation', 'content', 'render', 'ui', 'input', 'persistence']) {
    assert.ok(filesIn(join('src', dir)).length > 0, `src/${dir} está vacío`);
  }
});

test('Arquitectura: simulación y contenido no dependen de Phaser, Preact, render, ui ni del navegador', () => {
  const forbidden = [/from ['"]phaser['"]/, /from ['"]preact/, /\.\.\/render\//, /\.\.\/ui\//, /\.\.\/input\//, /\bwindow\./, /\bdocument\./, /Math\.random/];
  for (const file of [...filesIn('src/simulation'), ...filesIn('src/content'), 'src/persistence/saveFormat.ts']) {
    const code = readFileSync(join(ROOT, file), 'utf8');
    for (const pattern of forbidden) assert.ok(!pattern.test(code), `${file} contiene ${pattern}`);
  }
});

test('Publicación: el juego se sirve bajo /Empires-War/ y sin rutas absolutas a la raíz', () => {
  const vite = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
  assert.match(vite, /BASE_PATH = '\/Empires-War\/'/);
  assert.match(vite, /base: BASE_PATH/);
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const absolute = [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map((m) => m[1]);
  // La única ruta absoluta permitida es la entrada de Vite, que se reescribe con la base al compilar.
  assert.deepEqual(absolute, ['/src/main.ts']);
});

test('Contenido: todo dato declara procedencia y estado', () => {
  for (const file of filesIn('src/content')) {
    const code = readFileSync(join(ROOT, file), 'utf8');
    if (/: .*Sourced|extends Sourced/.test(code)) assert.match(code, /PROVISIONAL_BLOCK0|sourceVersion/, file);
  }
});
