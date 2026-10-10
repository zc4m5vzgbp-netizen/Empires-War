---
name: architectural-refactor
description: Planificar y ejecutar refactorizaciones de Empires-War en cambios pequeños, rastreables y verificables, solo tras una evaluación arquitectónica.
---
# Refactorización arquitectónica segura — adaptación para Empires-War

Inspiración: https://github.com/petekp/agent-skills/blob/main/skills/architectural-refactor/SKILL.md (MIT, autor petekp). Adaptación propia; no se ha copiado ni ejecutado código externo.

## Cuándo activar
Al solicitar explícitamente una refactorización, resolver deuda arquitectónica o aplicar una evaluación aprobada. **No activar para arreglos pequeños**, añadir sprites o programar mecánicas nuevas.

## Antes de editar
1. Leer `AGENTS.md`, la Skill principal y la evaluación arquitectónica concreta.
2. Documentar problema, arquitectura actual, objetivo, archivos afectados y dependencias.
3. Si falta evaluación o los cambios son ambiguos, detenerse y pedir aprobación; no inventar refactorizaciones.
4. Abrir rama propia; comprobar PR dependientes, especialmente los de Claude.

## Plan persistente
Para una refactorización aprobada, crear en `docs/refactors/<nombre>/`:
- `plan.md`: pasos ordenados con criterios de entrada y salida y dependencias.
- `manifest.json`: pasos pendientes, en curso, completados o fallidos, con SHA y resultados.
- `log.md`: registro de decisiones y bloqueos.
No crear estos archivos hasta que exista una refactorización real aprobada.

## Ejecución por etapas
- Cada etapa debe ser autocontenida, comprobable y reversible.
- Ejecutar antes y después las verificaciones definidas en `package.json`; añadir prueba de regresión cuando se cambia comportamiento.
- Si una etapa falla, detener el siguiente paso, registrar evidencia y corregir o pedir decisión. No ocultar fallos ni modificar módulos fuera del alcance.
- Conservar separación entre `src/simulation`, `src/render`, `src/ui` y persistencia.
- Nunca mezclar refactorización estructural con arte militar u otras tareas paralelas.

## Entrega
Enumerar etapas terminadas, resultados ejecutados, fallos, riesgos y enlace de PR. No fusionar a `main` sin autorización.
