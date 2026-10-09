# Diseño técnico: guardado automático en la nube (Bloque 1, corrección)

Estado: propuesta implementable; no significa que el frontend ya esté conectado. Referencia: issue #1. Decisión del usuario 2026-10-09: Google y Apple, guardado automático en la nube; Safari no es fuente de verdad.

## Infraestructura ya provisionada
- Supabase **Empires-War**, región us-east-2, project ref `swwzcrtmmsohgzuzvbec`.
- Migración aplicada `initial_private_cloud_saves`: `public.game_saves`, `public.game_save_history`, RLS habilitada, función RPC `public.save_empire`.
- Comprobación de seguridad inicial: 0 avisos. No hay credenciales secretas en este documento.

## Contrato SQL actual
- `game_saves`: id UUID, owner_id UUID, title, save_format integer, state jsonb, revision bigint, created_at, updated_at.
- `game_save_history`: snapshot inmutable por (save_id, revision), owner_id, save_format, state, saved_at. Solo SELECT autorizado al propietario; escrituras por RPC.
- `save_empire(p_id uuid, p_expected_revision bigint, p_title text, p_save_format integer, p_state jsonb)` devuelve (save_id, new_revision, saved_at). Para nueva partida: p_id=null, p_expected_revision=0. Para actualizar: id y revisión obtenidos del último guardado. Rechaza conflictos de revisión, usuarios no autenticados, formatos inválidos y payload >2 MiB. Escribe snapshot e historial en una misma transacción.
- La RPC no permite borrar ni restaurar revisiones todavía. No usar escrituras directas del cliente: authenticated solo tiene SELECT de las tablas.
- La política RLS limita lecturas al propietario y la RPC verifica auth.uid(). Nunca usar service_role en el navegador.

## Autenticación
- Supabase JS, `signInWithOAuth({provider:'google'|'apple',options:{redirectTo:'https://zc4m5vzgbp-netizen.github.io/Empires-War/'}})`.
- Configurar URLs permitidas en Supabase Auth y credenciales OAuth en Google Cloud y Apple Developer, según requisitos de cada proveedor. **No está configurado todavía**: verificar el proveedor antes de mostrarlo como operativo.
- Google y Apple pueden crear cuentas distintas. Implementar vinculación explícita de identidades con usuario autenticado y confirmación, nunca fusionar por coincidencia de correo sin validación.
- Cargar el estado del juego solo después de validar sesión y propietario; UI para estado desconectado e inicio de sesión.

## Autosave y consistencia
- Disparar por intervalo razonable y tras cambios relevantes; serializar mediante saveFormat v2 existente. Evitar solicitudes simultáneas para la misma partida (single-flight) y coalescer cambios.
- Una confirmación de guardado solo ocurre después de RPC exitosa. Mostrar estado claro: pendiente, sincronizando, guardado, sin conexión, error/conflicto.
- Al reconectar, reintentar con backoff y revisión esperada; si la revisión remota cambió, **no sobrescribir**: conservar copia local y ofrecer resolución explícita. El estado local es caché temporal y puede ser eliminado por Safari.
- Al cambiar de imperio, esperar a terminar o advertir que hay cambios sin sincronizar. No confiar en beforeunload ni en un envío garantizado al cerrar Safari.
- Mantener al menos el historial de revisiones, planificar política de retención para evitar crecimiento ilimitado. No permitir guardados >2 MiB sin rediseño y prueba de tamaño.
- Múltiples imperios: listar `game_saves` por owner_id, crear/cargar y renombrar mediante RPC; no reutilizar la misma partida accidentalmente.

## Validaciones antes de aceptación
1. Google OAuth en iPhone Safari; Apple OAuth en iPhone Safari; acceso con sesión restaurada.
2. Guardado automático sin pulsar Guardar, con indicación de confirmación remota.
3. Cerrar Safari y reabrir: se restaura estado exacto, incluso a mitad de recolección/construcción.
4. Otro dispositivo, misma cuenta: recuperar mismo imperio; diferentes cuentas no acceden entre sí.
5. Conflicto de dos dispositivos: nunca pérdida silenciosa; conservar copia y permitir elegir.
6. Offline: aviso de no sincronizado; volver online y recuperar sin duplicar ni sobrescribir.
7. Probar RLS con dos identidades, payload inválido, límite 2 MiB y rechazo de revisiones antiguas.
8. GitHub Actions typecheck, pruebas, build y smoke en verde; prueba manual iPhone real.

## Trabajo en paralelo
ChatGPT mantiene especificación/seguridad en `collab/chatgpt-review`; Claude implementa frontend en rama propia. Revisar PR antes de fusionar. Bloque 2 sigue sin autorización.
