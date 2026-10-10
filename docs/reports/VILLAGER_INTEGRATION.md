# Integración funcional PR #13 — estado verificable

## Alcance actual (PR #16)
- Reparado JSX inválido del panel plegable VIS-07 en `src/ui/App.tsx`.
- Importado contrato gráfico `src/render/villagerArt.ts` desde PR #13.
- Creado `src/render/villagerVisualState.ts` que traduce fases de simulación a idle/walk/chop/mine/forage/build/carry; pruebas unitarias añadidas.
- `EntityView` consume ese contrato solo si el atlas `eco` está cargado; de lo contrario conserva la imagen anterior.
- Centro táctil de aldeana ajustado a 19 px, radio existente de 20 px.

## Pendiente: no afirmar integrado
1. Incorporar los binarios originales de `public/assets/0ad-villager/atlas.png` y atlas militar desde PR #13/#11 mediante merge Git o importación de blobs preservando SHA. La API de contenido utilizada no permite copiar un PNG como texto.
2. Incorporar JSON de atlas, créditos, licencias, pruebas y módulos militares/galería en un merge revisado, sin sobrescribir cambios VIS-07 de la candidata.
3. Llamar `preloadVillagerArt` y `createVillagerAnimations` en `GameScene` solo cuando el atlas exista en la rama; sin esto el render de la partida sigue siendo el anterior.
4. Actualizar smoke: partida puede descargar exclusivamente atlas aldeana, no atlas militar. Comprobar acciones y selección en WebKit y Chromium.
5. Ejecutar `npm run check`, `npm run smoke:browser`, comprobar CI y medir memoria/carga en iPhone físico (pendiente hasta prueba real).
6. Revisar compatibilidad con cambios posteriores de Claude; no fusionar a `main` sin aprobación.

## Contrato medido por Claude
Atlas de 680 frames 64×78; ancla (0.5,0.6905), cuerpo a 19 px sobre pies, 40 px altura visual; 2.1 MB descarga y 16 MB memoria GPU aproximada. La carga de oro utiliza arte de mineral oscuro. Vestido azul fijo.

## Advertencia
Este PR todavía NO integra el atlas en la partida, no demuestra FPS de iPhone ni garantiza pruebas verdes. Las Skills son guía de revisión, no sustituyen ejecución de tests.
