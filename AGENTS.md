# Empires-War — reglas para agentes de programación

Lee este archivo antes de editar. Según la tarea, usa las Skills en `.agents/skills/`: `architectural-refactor` para refactorizaciones aprobadas y `preact-web-performance` para rendimiento de UI. Aplica también `.agents/skills/empires-war-development/SKILL.md` cuando implementes, corrijas o revises código.

## Proyecto y límites
- RTS isométrico web inspirado en la experiencia de AoE II; código y contenido originales o con licencia compatible y atribución.
- Phaser 4 + TypeScript + Preact + Vite; simulación separada de render, entrada, interfaz y persistencia.
- El juego debe funcionar con controles táctiles en iPhone 15 Pro Max.
- No cambiar reglas aprobadas sin autorización. No inventar datos de balance de AoE: marcar provisional y citar fuente/versiones al verificarlos.
- No fusionar PR, desplegar main, modificar credenciales o tocar guardado en la nube sin autorización.
- Mantener ramas de trabajo independientes; comprobar base y PR dependientes antes de cambiar archivos compartidos.

## Contrato de entrega
1. Definir comportamiento observable y criterios de aceptación.
2. Identificar archivos y pruebas existentes antes de editar; cambio mínimo.
3. Reproducir fallos con prueba que falle ANTES de corregir (cuando sea viable).
4. Ejecutar pruebas unitarias, typecheck y build; pruebas de navegador en cambios de interfaz/tacto.
5. Indicar comandos ejecutados, resultados REALES, fallos pendientes y limitaciones. Nunca afirmar que pasó una prueba no ejecutada.
6. Mantener el estado funcional y las regresiones en `docs/REQUIREMENTS_MATRIX.md` (fuente existente del proyecto). `docs/QUALITY_MATRIX.md` es una matriz auxiliar de auditoría de Skills y no debe reemplazar ni contradecir la matriz principal.
7. Un PR por objetivo, con alcance, evidencia y riesgos. No mezclar trabajo de Claude y ChatGPT sin revisar diferencias.

## Referencias
- `.agents/skills/empires-war-development/SKILL.md` — procedimiento específico.
- `docs/REQUIREMENTS_MATRIX.md` — fuente de verdad de requisitos y evidencia.
- `docs/QUALITY_MATRIX.md` — auditoría auxiliar de calidad de agentes, si está presente.
- Inspiración de procesos: obra/superpowers, addyosmani/agent-skills, anthropics/skills. No se ejecutan scripts externos ni se importan licencias automáticamente.

## Skills especializadas (activar solo cuando correspondan)
- `.agents/skills/mobile-rts-testing/SKILL.md`: controles táctiles, HUD, cámara y WebKit.
- `.agents/skills/rts-performance-benchmarking/SKILL.md`: métricas de simulación, render y población.
- `.agents/skills/github-pr-integration-guard/SKILL.md`: compatibilidad entre PR y protección de `main`.
- `.agents/skills/savegame-integrity-determinism/SKILL.md`: IndexedDB, esquemas y determinismo.
- `.agents/skills/rts-gameplay-combat-verification/SKILL.md`: producción, combate e IA.
- `.agents/skills/game-art-pipeline-license-audit/SKILL.md`: atlas, animaciones, procedencia y licencias.

Las Skills son instrucciones, no comprobaciones automáticas. Solo registrar un beneficio cuando haya pruebas, métricas o hallazgos verificables.
