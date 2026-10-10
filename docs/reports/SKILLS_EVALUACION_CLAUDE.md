# Evaluación de las Skills del PR #10 desde el trabajo de Claude (arte militar, PR #11)

Fuente: `AGENTS.md` y `.agents/skills/*/SKILL.md` de `release/claude-visual-main-candidate` (commit 03d1b14), leídos sin cambiar de rama.
Método: comparar cada regla con lo que hice en el PR #11, que se terminó **antes** de leer las Skills, y ejecutar las comprobaciones que piden.

## empires-war-development (aplicable: sí)

| Regla | ¿Se cumplía antes de leerla? | Verificación ejecutada |
|---|---|---|
| Seguir la cadena toque → picking → controlador → comando → simulación | Sí: el diagnóstico de la piedra (VIS-07) siguió exactamente esa cadena | Scripts de picking y simulación + paso 4b de la prueba de navegador |
| Prueba de regresión que falle antes del arreglo | **Parcial**: 2 de 3 regresiones del arte militar se vieron fallar (tamaño entre animaciones, figura cortada); la de «andar estático» se escribió después de corregir y nunca se vio fallar | `tests/military-art.test.ts` contra el atlas defectuoso |
| Ejecutar typecheck, test, build y verify:dist | Solo `npm test` local (no hay dependencias npm en la sesión); el resto, en GitHub Actions | CI «Comprobar y publicar»: verde |
| Compatibilidad de ramas | **No lo había comprobado con el PR #10** | `git merge-tree` PR #11 + PR #10: sin conflictos. En la fusión local: 49/49 pruebas |
| Licencias y créditos | Sí | `tests/military-art.test.ts` (licencia, créditos, fichero de licencia) |
| Esperas fijas en pruebas | 1 espera fija de 1,5 s antes de leer los FPS de la galería (medición, no condición) | Revisión del código |

Beneficio observado: la lista de revisión del PR me hizo comprobar la compatibilidad con el PR #10. No había fallo, pero antes no estaba verificado. La regla «que falle antes» destapó que una de mis regresiones no estaba demostrada.

## preact-web-performance (aplicable: en parte; el PR #11 casi no toca Preact)

| Regla | Verificación ejecutada | Resultado |
|---|---|---|
| Carga: no importar sistemas grandes si la pantalla no los necesita | Paso nuevo en la prueba de navegador: registra las peticiones de red | La partida normal **no** descarga `assets/0ad/` en WebKit ni en Chromium. La galería sí descarga el atlas |
| Medir el tamaño antes y después | Comparación de los JS compilados de las vistas previas del PR #8 (ce1b2e0) y del PR #11 (3343dfa) | +1,9 KB sin comprimir, +0,6 KB con gzip. Incluye también cambios del PR #7, así que es una cota superior. El atlas de 1,6 MB solo se descarga con la galería |
| No mezclar con el rendimiento de Phaser | — | Correcto: el coste del render militar no está medido en iPhone |

## architectural-refactor (aplicable: no)

La propia Skill dice no activarla para añadir sprites o mecánicas nuevas. No hubo ninguna refactorización: no se aplicó ni se creó `docs/refactors/`.

## Conclusión medible

- 2 hallazgos reales al aplicar las Skills:
  - la compatibilidad con el PR #10 no estaba comprobada (ahora sí, sin conflictos);
  - 1 regresión no demostrada.
- 1 verificación nueva y permanente: la carga perezosa del arte militar, en la prueba de navegador.
- Sin efecto medible todavía en tiempo, tokens ni errores evitados: hacen falta más tareas para compararlo.
