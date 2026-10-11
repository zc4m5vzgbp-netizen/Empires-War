# Protocolo de calidad y consolidación — Empires-War

Estado: **propuesta operativa en rama de integración; NO autoriza cambios en main**.
Fuente normativa: `docs/MASTER_DESIGN.md` v2.0, `docs/DECISIONS.md`, `docs/REQUIREMENTS_MATRIX.md`. Ante contradicción, detenerse y consultar la decisión más reciente del usuario.

## Objetivo
Consolidar la experiencia visual de Claude y las mecánicas de Empires-War en **un solo juego**, reutilizando sistemas que funcionen. No sustituir arquitectura ni migrar componentes sin una comparación técnica y pruebas de equivalencia. Congelar funcionalidades nuevas hasta cerrar los defectos de la etapa actual.

## Contrato obligatorio por requisito
Cada funcionalidad debe tener: ID estable; referencia a decisión original; comportamiento observable; dueño técnico; dependencias; rama/commit; prueba automatizada; prueba visual/táctil si corresponde; estado; evidencia; fallos abiertos.

Estados: `pendiente` → `en desarrollo` → `implementado` → `probado` → `integrado` → `aprobado`.
- **Implementado**: código presente, no necesariamente funcional.
- **Probado**: pruebas relevantes ejecutadas y resultados registrados para un commit específico.
- **Integrado**: probado con las dependencias y los recursos reales en una única rama.
- **Aprobado**: aceptación explícita del usuario. CI verde nunca implica aprobación.

## Ciclo de detección y corrección
1. Reproducir el fallo; registrar pasos, entorno, commit y evidencia. Si es viable, crear una prueba de regresión que falle antes de corregir.
2. Investigar la causa raíz, incluyendo interfaces entre simulación, render, UI, entrada y persistencia. Buscar duplicaciones y contratos contradictorios.
3. Para problemas complejos, investigar soluciones documentadas de RTS existentes y proyectos abiertos; registrar fuente, versión, licencia y adaptación. No copiar recursos comerciales ni asumir que un comportamiento de AoE II DE está verificado sin fuente.
4. Elegir la solución mínima compatible con el diseño; documentar riesgos y alternativas.
5. Corregir en rama propia. Ejecutar typecheck, pruebas unitarias, build y smoke de navegador; añadir prueba de integración cuando atraviese subsistemas.
6. Validar visualmente WebKit/Chromium en perfil móvil, pero **no** llamar a eso prueba física en iPhone. Medir FPS repetidamente con condiciones comparables; registrar límites.
7. Revisar cambios y duplicados, actualizar matriz de requisitos y registro de defectos; cerrar solo con evidencia.

## Puertas para la consolidación visual/económica actual
- [ ] CI verde para el commit integrado, no solo para PR aislados.
- [ ] Atlas corregidos de Claude cargados en partida normal; licencias y rutas verificadas.
- [ ] Animaciones de aldeanos y campamentos visibles; profundidad, huella 2×2, selección táctil y vista previa verificadas.
- [ ] Construcción, costes insuficientes y depósitos de comida, madera, oro y piedra probados en simulación real.
- [ ] Guardar y cargar partida con campamentos y tareas activas; equivalencia de estado y compatibilidad verificadas.
- [ ] Panel de iPhone usable sin bloquear mapa ni créditos; pruebas móviles y capturas.
- [ ] Pruebas de carga de atlas actualizadas sin descargar arte militar en la partida normal.
- [ ] Skills pertinentes incorporadas a la rama final y aplicadas con evidencia, no solo listadas.
- [ ] Auditorías visual y funcional conciliadas, errores importantes resueltos y menores clasificados.
- [ ] Comparación técnica de base visual Claude vs. arquitectura existente; migración incremental reversible aprobada antes de ejecutarla.
- [ ] Aprobación explícita del usuario antes de fusionar a `main`.

## Registro de defectos
Mantener una fila por defecto en el informe de integración: `ID | severidad | reproducción | causa raíz | responsable | rama/commit | prueba de regresión | estado | evidencia`. Nunca eliminar un defecto del registro solo porque desapareció un síntoma.

## Límites de automatización
GitHub Actions detecta fallos cubiertos por pruebas; **no corrige de forma fiable todos los errores por sí mismo**. Los agentes pueden investigar y proponer o aplicar cambios en ramas autorizadas, pero las decisiones de diseño, conflictos, licencias, validación en dispositivo y publicación requieren revisión humana.
