# Empires-War — reglas para agentes de programación

Lee este archivo antes de editar. Usa solo las Skills relevantes. `architectural-refactor` queda **archivada/inactiva por defecto** y solo se reactiva para una refactorización explícitamente aprobada; las reglas de Preact/UI se aplican desde `rts-performance-benchmarking`. Aplica también `.agents/skills/empires-war-development/SKILL.md` cuando implementes, corrijas o revises código.

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
- `.agents/skills/savegame-integrity-determinism/SKILL.md`: IndexedDB, esquemas y determinismo.
- `.agents/skills/game-art-pipeline-license-audit/SKILL.md`: atlas, animaciones, procedencia y licencias.

La integración de PR está incluida en `rts-delivery-orchestrator`; la verificación de combate y producción, en `empires-war-development`. Hay doce Skills activas y una archivada (`architectural-refactor`). Las Skills son instrucciones, no comprobaciones automáticas. Solo registrar un beneficio cuando haya pruebas, métricas o hallazgos verificables.

## Orquestación de entregas complejas
Activar `.agents/skills/rts-delivery-orchestrator/SKILL.md` para tareas que cruzan arte, simulación, UI, pruebas o integración. Mantener `docs/DELIVERY_LEDGER.md` como registro de subcasos y evidencias, sin sustituir `docs/REQUIREMENTS_MATRIX.md` como fuente de requisitos.

## Especialistas RTS (solo según tarea)
- `.agents/skills/rts-ai-strategy-engineer/SKILL.md`: IA enemiga, exploración y dificultad sin trampas.
- `.agents/skills/rts-pathfinding-army-movement/SKILL.md`: rutas, vados, grupos y formaciones.
- `.agents/skills/rts-economy-production-engineer/SKILL.md`: recolección, depósitos, granjas, población y producción.
- `.agents/skills/rts-combat-balance-engineer/SKILL.md`: reglas de daño, alcance y balance militar.
- `.agents/skills/rts-world-generation-fog/SKILL.md`: mapas, semillas, visibilidad y niebla.
- `.agents/skills/rts-release-regression-guardian/SKILL.md`: pruebas de candidata y aprobación de publicación.

La Skill independiente `preact-web-performance` se consolidó en `rts-performance-benchmarking`; los controles de PR siguen en la orquestadora y la verificación genérica de combate sigue en Core Development, mientras `rts-combat-balance-engineer` cubre específicamente reglas y balance. Activar un máximo razonable de Skills por tarea; no cargar todas por defecto.
