# Auditoría inicial de integración y código — Empires-War

Fecha: 2026-10-10. Alcance inspeccionado: PR #10, #13, #15, #16, CI de GitHub y módulos App, GameScene, EntityView, villagerArt, villagerVisualState, picking y entityTextures. **No es una auditoría exhaustiva del repositorio**.

## Hallazgos confirmados

| ID | Severidad | Evidencia | Acción |
| --- | --- | --- | --- |
| AUD-01 | Bloqueante | CI PR #10 (run 38060100661) y PR #15 (run 38068545799) falla en `src/ui/App.tsx:88` por JSX inválido. | Portar arreglo probado desde PR #16, no mezclar cambios sin pruebas. |
| AUD-02 | Alta | `GameScene.preload` solo llama `preloadArt`; no llama `preloadVillagerArt`. `GameScene.create` no llama `createVillagerAnimations`. | El nuevo `EntityView` solo muestra arte ECO si el atlas existe; actualmente la partida nunca lo carga. Integrar binarios originales antes de activar. |
| AUD-03 | Media | `EntityView` conserva `CARRY_FOOD_KEY` como accesorio de fallback y añade ruta ECO condicional. | No borrar fallback hasta validar carga, animaciones y degradación sin red. Cuando ECO esté operativo, verificar que no haya accesorio duplicado. |
| AUD-04 | Media | `VILLAGER_BODY_OFFSET` cambió globalmente de 16 a 19 en PR #16, aunque la imagen fallback sigue siendo Unknown Horizons. | Usar offset dependiente del atlas activo o aceptar diferencia táctil con prueba explícita; preservar selección por recuadro. |
| AUD-05 | Alta | PR #13 CI verde pero está basado en PR #11, no en PR #10/#16; PR #15 hereda candidata con CI rojo. | Integrar por ramas con comparación de diferencias, revisar `App.tsx` y render, nunca asumir integración por CI de una rama aislada. |
| AUD-06 | Alta | En PR #16 existe contrato visual y pruebas, pero atlas binario y créditos aún no están importados. | No declarar aldeana integrada ni medir FPS hasta cargar atlas y ejecutar WebKit real. |

## Riesgos todavía NO verificados
- Lógica de transición `gather`→`toDropsite` y animación bajo interpolación de ticks; se requieren pruebas de navegador.
- `villagerVisualAction` no incluye granjas reales porque la simulación todavía no implementa tareas de granja; `farm` queda reservado, no eliminar.
- Rendimiento GPU de atlas ECO 2048×2048 en iPhone físico.
- Guardado/carga tras incorporar nuevos tipos de edificio.
- Código muerto en módulos no inspeccionados. No se ha ejecutado analizador estático ni suite completa local.

## Política de limpieza segura
1. Congelar base y medir `npm run check` y smoke WebKit/Chromium.
2. Para cada candidato a eliminación, buscar referencias directas/dinámicas, pruebas y usos en galería/fallback/guardado.
3. Retirar una sola responsabilidad por commit con prueba de regresión, no eliminar por apariencia.
4. Documentar evidencia antes/después y revertir si hay regresión.
5. Mantener `main` y ramas Claude intactas hasta aprobación explícita.

## Dependencias
PR #10 candidata → PR #16 arreglo/contrato parcial → rama de auditoría. PR #13 arte requiere PR #11. PR #12 → #14 → #15 son documentos/Skills, no corrigen compilación.
