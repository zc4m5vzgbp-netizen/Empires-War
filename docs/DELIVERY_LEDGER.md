# Delivery Ledger — Empires-War

El ledger es el registro de trabajo pendiente y evidencias, **no una declaración de que el juego funciona**.

| ID | Resultado observable | Responsable | Rama/PR | Estado | Evidencia / siguiente acción |
| --- | --- | --- | --- | --- | --- |
| VIS-07 | Ocultar panel permite tocar piedra antes tapada | ChatGPT | PR #10 | partial | Comprobar JSX/build y smoke WebKit de selección de piedra |
| ART-VILLAGER-01 | Atlas de aldeana 0 A.D. con acciones y carga | Claude | Rama nueva pendiente de entrega | in-progress | Esperar PR, atlas, frames, licencias y pruebas |
| ECO-06.a | Recolección piedra + depósito aumenta stockpile | ChatGPT | PR #10 | partial | Prueba extremo a extremo con controles táctiles |
| ECO-06.b | Campamentos maderero/minero aceptan recursos correctos | ChatGPT | Rama funcional por crear | not-started | Definir huellas 2×2 y reglas de depósito |
| ECO-06.c | Tareas visuales conectadas a estados reales | ChatGPT | Rama de integración por crear | blocked | Depende del atlas de Claude y contrato de nombres |
| ECO-07 | Granja con estados y renovación con madera | ChatGPT | Rama funcional por crear | not-started | Definir simulación, costes y pruebas |
| ECO-09 | Casa afecta capacidad de población | ChatGPT | Rama funcional por crear | not-started | Confirmar regla AoE II DE antes de implementar |
| ECO-10 | Colas de producción y punto de reunión | ChatGPT | Rama funcional por crear | not-started | Definir edificio, coste, cancelación y cola |
| ART-MIL-01 | Arte militar galería separado de partida normal | Claude | PR #11 | partial | Integración candidata y pruebas sin descargar atlas en partida normal |

Estados válidos: `not-started`, `in-progress`, `partial`, `blocked`, `verified`. No marcar `verified` sin pruebas y resultado observable. El ledger debe actualizarse con evidencia y commit tras cada lote.

## Evaluación de la Skill
Medir en dos entregas reales: (a) número de requisitos/subcasos identificados antes y después de revisión, (b) discrepancias entre afirmaciones y pruebas, (c) regresiones evitadas, (d) tiempo adicional de proceso. Si no detecta omisiones ni mejora trazabilidad de forma útil, simplificar o retirar. **Beneficio no demostrado todavía.**
