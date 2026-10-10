# Adopción y validación de Skills — PR #10

## Alcance y evidencia (2026-10-10)

Las siguientes instrucciones fueron copiadas desde el PR #9 a la rama independiente `release/claude-visual-main-candidate`:
- `AGENTS.md`: contrato de trabajo de agentes y separación de ramas.
- `.agents/skills/empires-war-development/SKILL.md`: depuración, pruebas y revisión de cambios.
- `.agents/skills/architectural-refactor/SKILL.md`: refactorización aprobada y por etapas.
- `.agents/skills/preact-web-performance/SKILL.md`: revisión y medición de rendimiento de Preact.

**Comprobación estática efectuada:** se leyó el contenido de las tres Skills, `AGENTS.md`, `package.json` y la matriz de requisitos. Se verificó que los comandos citados existen en `package.json` (`typecheck`, `test`, `build`, `verify:dist`, `smoke:browser`). Se detectó una inconsistencia: la Skill original refería una matriz auxiliar de calidad, mientras el proyecto ya mantiene `docs/REQUIREMENTS_MATRIX.md`. Se corrigieron las referencias en `AGENTS.md` y en la Skill de desarrollo para mantener esa matriz como fuente de verdad.

## Ejercicio real y límites

- **Depuración / Empires-War:** se inspeccionó el problema VIS-07: el panel de selección intercepta toques sobre minas en móvil. Se preparó una corrección aislada de interfaz (panel plegable) en este PR. La CI anterior a esa corrección pasó; la corrección misma requiere validación en WebKit y en iPhone físico antes de marcar VIS-07 resuelto.
- **Architectural Refactor:** se revisó el alcance de la corrección VIS-07. No requiere refactorización arquitectónica, por lo que la Skill indica **no activar** el procedimiento pesado ni introducir cambios estructurales. No hay una refactorización aprobada para probar ejecución completa.
- **Preact Web Performance:** se comprobó que el cambio está acotado a Preact/CSS y no introduce dependencias React/Next.js. **No se han medido** latencia, rerenders ni tamaño de bundle antes/después; no se declara optimización demostrada.
- **Adopción por agentes:** los archivos están disponibles en esta rama. No se ha comprobado que Claude Code u otro agente los descubra y siga automáticamente; la lectura y aplicación explícitas deben verificarse en la próxima tarea del agente.

## Próxima aceptación

1. CI de PR #10 verde tras los commits de Skills y panel plegable.
2. Prueba de navegador específica que pliegue el panel, confirme que el toque de piedra llega al mapa y que el aldeano deposita piedra.
3. Verificación visual y táctil en Safari real del usuario.
4. Para una refactorización o un benchmark futuro, registrar métricas y resultados reales, sin inventarlos.

No se ha fusionado a `main`, ni desplegado una versión principal, ni modificado `feat/military-art`.
