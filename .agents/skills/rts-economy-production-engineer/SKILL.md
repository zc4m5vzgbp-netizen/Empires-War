---
name: rts-economy-production-engineer
description: Economía y producción sin pérdida de recursos; activar solo para cambios relevantes en Empires-War.
---
# Economía y producción sin pérdida de recursos

## Activación
Cambios a recolección, depósitos, granjas, casas, población, tecnologías, costes, colas o cancelaciones. Consultar `AGENTS.md`, `docs/REQUIREMENTS_MATRIX.md` y `docs/DELIVERY_LEDGER.md`. Coordinar entregas de varios sistemas mediante `rts-delivery-orchestrator`.

## Procedimiento específico
Trazar órdenes→ticks→inventario→depósito y pago; comprobar conservación de recursos, compatibilidad de depósitos, costes, colas, cancelaciones y límites; separar reglas confirmadas de balance provisional; no sustituir simulación por animación.

## Ejercicio de aceptación
Aldeano recoge piedra, la deposita en sitio válido y aumenta exactamente el stockpile; granja se agota y renovar consume madera; casa modifica población según regla confirmada.

## Evidencia exigida
Pruebas deterministas por regla, saldos antes/después, casos negativos, requisitos ECO y capturas táctiles cuando corresponda.

## Límites
- No marcar implementado, equilibrado ni probado sin ejecutar pruebas relevantes y conservar resultados.
- Los valores AoE II DE sin fuente y versión son provisionales, nunca afirmaciones de balance oficial.
- No tocar `main`, publicar, fusionar ni modificar ramas de Claude sin aprobación expresa.
- No duplicar las reglas generales de `empires-war-development`; esta Skill contiene solo especialización del subsistema.
