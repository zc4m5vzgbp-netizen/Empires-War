# Auditoría de integración — 2026-10-11 (fase inicial)

## Alcance y fuente

Comparación directa de referencias GitHub contra `main` después de fusionar el PR #22 (`462c23b4147d6ab9f78dc3582d01e2e4b8a9194d`). Los números son diferencias de commits y archivos **respecto de main**, no métricas de calidad, ni pruebas funcionales. Este documento es un inventario inicial de ramas conocidas, **no una auditoría exhaustiva de todos los PR abiertos**.

| Rama | Commits por delante | Commits por detrás | Archivos diferentes | Estado frente a main |
|---|---:|---:|---:|---|
| `feat/villager-gameplay-integration` | 36 | 1 | 34 | diverged |
| `feat/economy-camps-functional` | 66 | 1 | 50 | diverged |
| `feat/economy-camps-art` | 53 | 1 | 54 | diverged |
| `feat/villager-task-art` | 45 | 1 | 46 | diverged |
| `analysis/consolidacion-2026-10-10` | 106 | 1 | 79 | diverged |
| `chore/rts-specialist-skills-v2` | 56 | 1 | 43 | diverged |

**Observación:** el commit documental del PR #22 está en `main`, pero aún no en estas ramas. No fusionar una rama divergente a ciegas.

## Estado de documentación

- PR #22: **fusionado** a `main`, solo `docs/DECISIONS.md` y `docs/REQUIREMENTS_MATRIX.md` (+29 líneas), tras CI 140 correcto.
- PR #21: borrador anterior basado en `feat/economy-camps-functional`. Su contenido documental H-1 a H-4 ya fue incorporado por #22; **no fusionarlo como vía de documentación** sin reconciliar. La rama base #19 contiene trabajo funcional distinto.
- `docs/MASTER_DESIGN.md` v2.0 es copia histórica literal; las decisiones D-006 a D-009 tienen precedencia.

## Bloqueos de fusión funcional identificados en la consolidación de Claude

1. **Render:** estrategia de texturas del mapa con riesgo de memoria desproporcionada a 224×224 y 480×480; las cifras previas son estimaciones, no mediciones de iPhone físico. Responsable: Claude en rama independiente.
2. **Interacción:** selección táctil en sprites superpuestos, especialmente campamentos y Centro Urbano; falta caracterización con prueba activa.
3. **Simulación:** máximos de ticks elevados en navegación de aldeanos y escenarios sin acceso; requiere presupuesto de cómputo y pruebas de determinismo. Responsable: ChatGPT.
4. **Paridad visual:** atlas de aldeanos/campamentos, anclajes, licencias, colores de imperio y pruebas de carga deben revisarse sobre el árbol de integración final.
5. **Persistencia:** regresión de guardado/carga tras incorporar nuevas entidades y arte, y prueba de ciclo completo en navegador.
6. **Dispositivo:** emulación WebKit con viewport de iPhone no equivale a prueba física de iPhone 15 Pro Max.

## Criterios antes de solicitar fusión a main

- Inventario de PR por número, objetivo, rama base, dependencias y duplicaciones, con revisión de cambios reales.
- Integración por ramas pequeñas; resolver solapamientos sin reemplazar componentes ya funcionales.
- CI verde en commit exacto: typecheck de juego y simulación, tests, build, rutas, navegador Chromium/WebKit.
- Caracterización de picking y save/load; pruebas de rendimiento de mapas y navegación, con resultados reales.
- Validación manual física de iPhone cuando sea posible; no presentar simulador como dispositivo real.
- Evidencia por requisito y revisión final de PR. Ningún cambio a `main` sin pasar estos criterios.

## Siguientes acciones

1. Completar inventario de todos los PR y clasificarlos en: listo, depende de otro, duplicado, aplazado, bloqueado.
2. Revisar las pruebas de economía, campamentos y guardado en `feat/economy-camps-functional` y preparar una rama de integración de simulación sin tocar el trabajo visual de Claude.
3. Esperar la rama independiente de Claude para evaluar render/picking/colores antes de consolidar gráficos.
4. Mantener EMP-10 abierto hasta cierre de trazabilidad; no cerrar PR de otras personas por el inventario.
