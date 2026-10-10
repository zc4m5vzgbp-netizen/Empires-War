# Auditoría express de integración — 2026-10-10

Estado: **NO APROBADO PARA MAIN**. Esta auditoría distingue inspección estática de pruebas reales.

## Evidencia verificada
- PR #16, CI en verde para su propio head; PR #18, CI en verde para su propio head. No existe prueba conjunta de sus cambios.
- PR #19 define lumberCamp y miningCamp (2x2, 100 madera provisional, 35 s provisional), con depósitos específicos; usa el sistema existente de construcción, selección y almacenamiento. CI del head actualizado pendiente al redactar.
- src/render/GameScene.ts solo precarga preloadArt(this); NO precarga preloadVillagerArt ni preloadCampArt. Los atlas de aldeanos y campamentos NO están activos en la escena normal.
- src/render/campArt.ts se ha copiado como metadatos a #19, pero su atlas binario todavía NO existe en la rama #19. NO invocar preloadCampArt hasta incorporar los binarios y comprobar las rutas.
- La rama de Skills v2 (#15) tiene CI rojo heredado; AGENTS.md en #19 no contiene las Skills v2 porque las ramas divergen. No se puede afirmar que las 12 Skills estén aplicadas en esta rama.
- No hay evidencia de prueba real en iPhone 15 Pro Max, medición de FPS ni validación visual del conjunto #16 + #18 + #19.
- La lógica de depósitos en src/simulation/villager.ts revalida dueño, estado completo y aceptación del recurso; aún requiere pruebas de extremo a extremo.

## Puertas de salida obligatorias
1. CI del PR #19 verde, sin errores TS; pruebas de construcción, depósito de madera, oro y piedra, costes insuficientes y guardado/carga.
2. Integrar atlas binarios y JSON del PR #18 en rama de integración (sin modificar main ni rama Claude); precargar solo cuando estén presentes y activar las animaciones de aldeanos.
3. Verificar anclajes y profundidad 2x2, hit-testing táctil, superposición, selección y previsualización de campamentos en WebKit móvil y Chromium.
4. Revisar consistencia de economía/UI/simulación y persistencia, rendimiento y determinismo.
5. Revisar AGENTS.md y Skills en la rama final, con evidencia de aplicación por auditoría y pruebas.
6. Solo tras pruebas y aprobación explícita del usuario considerar main.

## Limitaciones
Revisión de código y CI remotos; no se ha ejecutado un juego completo en iPhone ni se ha aprobado una release.
