// Comprueba el resultado de la compilación: todas las rutas apuntan a /Empires-War/ y los archivos existen.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = '/Empires-War/';
const dist = new URL('../dist/', import.meta.url).pathname;
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((r) => !/^(https?:|data:|#)/.test(r));

let failed = false;
if (refs.length === 0) {
  console.error('ERROR: dist/index.html no referencia ningún archivo.');
  failed = true;
}
for (const ref of refs) {
  if (!ref.startsWith(BASE)) {
    console.error(`ERROR: ${ref} no empieza por ${BASE}`);
    failed = true;
    continue;
  }
  const file = join(dist, ref.slice(BASE.length));
  if (!existsSync(file)) {
    console.error(`ERROR: falta ${file}`);
    failed = true;
  } else {
    console.log(`OK ${ref}`);
  }
}
if (failed) process.exit(1);
console.log(`dist/ verificado: ${refs.length} referencias bajo ${BASE}`);
