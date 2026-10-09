# Guardado en la nube (Bloque 1, rama `feat/cloud-save-auth`, PR #3)

Estado: **implementado y probado contra Supabase real; NO fusionado ni publicado.** Antes de publicar faltan dos cosas que dependen del usuario (ver «Pendiente»).

## Cómo funciona

- **Dos copias.** Cada guardado se escribe primero en el dispositivo (IndexedDB) y después se sube a la nube (Supabase, función `save_empire`). Solo se muestra «Guardado en la nube (revisión N)» cuando la nube devuelve la revisión nueva.
- **Sin sesión.** El progreso se guarda solo en el dispositivo y se recupera al volver a abrir. Nunca se anuncia la nube.
- **Inicio de sesión.** Puede ser con enlace o con código del correo:
  - si la cuenta no tiene imperios, el progreso actual se sube como «Imperio 1»;
  - si tiene imperios y no se ha jugado nada, se carga el más reciente;
  - si tiene imperios y además hay progreso sin cuenta, se pregunta antes de reemplazarlo.
- **Autoguardado.** Se hace cada 30 s, al pasar a segundo plano (`visibilitychange`/`pagehide`) y al volver la conexión. Safari puede cerrar la pestaña antes de terminar la subida. En ese caso la copia del dispositivo se sube al volver a abrir el juego. No se promete que Safari complete operaciones en segundo plano.
- **Fallos de red.** Se reintenta a los 5, 15, 30, 60 y 120 s, y al detectar el evento `online`. Si el primer contacto con la nube falla, la conexión se recupera sola (antes se quedaba bloqueada).
- **Conflictos.** Si otro dispositivo guardó una revisión más nueva, no se sobrescribe nada. El autoguardado se detiene y el menú ofrece dos opciones: «Usar la versión de la nube» o «Guardar la mía como imperio nuevo».
- **Varios imperios.** Antes de cambiar de imperio, crear uno nuevo o cerrar sesión, se guarda el imperio actual. Si no se puede guardar, no se cambia.
- **Cuentas separadas.** Al cerrar sesión o cambiar de cuenta, el mundo se reinicia y la copia local queda asociada a su usuario.

### Regla §3.8 (pausa durante el guardado)

El guardado manual congela el mundo durante toda la escritura, tanto la local como la de la nube. Después reanuda la partida, o la deja en pausa si ya lo estaba.

**Interpretación pendiente de aprobación:** en el autoguardado, el mundo se congela solo mientras se toma la instantánea y se escribe en el dispositivo (milisegundos). La subida usa esa copia fija, así el juego no se detiene cada 30 s esperando a la red.

## Pruebas

### Pruebas unitarias con dobles (simuladas, no Supabase)

`tests/saveManager.test.ts` tiene 16 casos: conflictos, reintentos, Safari cerrado sin red, invitado que luego inicia sesión, cambio de cuenta, imperio dañado, etc. En total hay 57 pruebas y todas pasan en CI.

### Prueba real contra Supabase

El workflow `.github/workflows/cloud-e2e.yml` (ejecución 38003761773, SUPERADA) se ejecutó con dos usuarios temporales, que ya están borrados. Usó WebKit con perfil de iPhone y Chromium.

1. Sesión real y primer imperio creado (revisión 1).
2. Mundo modificado y guardado: la revisión 2 tiene en la nube la misma huella que el mundo.
3. Recarga: la sesión se conserva y el estado restaurado es idéntico.
4. Otro dispositivo sin datos locales recupera el mismo imperio desde la nube.
5. Sin red, el guardado no se confirma. Al volver la red se sube la revisión 3 con el estado correcto.
6. El autoguardado sube la revisión 4 con el estado actual.
7. Conflicto: el otro dispositivo, que seguía en la revisión 2, no sobrescribe la 4 y guarda su versión como imperio nuevo.
8. El cambio entre imperios carga el estado correcto.
9. Aislamiento: la cuenta B no ve, no lee y no modifica los imperios de A (lectura: 0 filas; `save_empire`: rechazado con EW409; escritura directa: 0 filas).
10. El cierre de sesión funciona.

Fallos reales que encontró esta prueba y que ya están corregidos:

- La huella del mundo dependía del orden de las claves, y `jsonb` las reordena. Por eso otro dispositivo no podía cargar el imperio.
- El conflicto usaba el código 40001, que supabase-js reintenta en bucle. Ahora usa el código propio `EW409` (migración `save_empire_conflict_code_not_retryable`).

## Seguridad (auditoría)

- **RLS activo.** Cada usuario solo lee sus filas (verificado con una cuenta ajena).
- **`save_empire`.** Es SECURITY DEFINER con `search_path = ''`. Exige `auth.uid()`, comprueba propiedad, tamaño (2 MiB) y revisión, y no la puede ejecutar `anon`. Supabase mantiene **1 advertencia** por esta función, de forma intencional.
- **Pendiente de aprobación (riesgo abierto).** Las tablas aún permiten escritura directa al dueño: la prueba real cambió el título de su propia fila sin pasar por `save_empire`. Por esa vía un usuario solo puede alterar sus propias partidas, sin control de revisión. La migración `restrict_direct_writes_to_save_rpc` (quitar INSERT/UPDATE/DELETE/TRUNCATE directos y dejar solo SELECT) quedó «cancelada» dos veces; necesita confirmación del usuario.
- **Historial.** `game_save_history` guarda cada revisión completa y crece sin límite. Conviene podarlo (por ejemplo, conservar las últimas 20 por imperio) antes de jugar mucho.

## Pendiente

1. Aprobar la migración de permisos.
2. Configuración del panel de Supabase (no se puede leer con las herramientas de esta sesión):
   - URL Configuration: Site URL y Redirect URL = `https://zc4m5vzgbp-netizen.github.io/Empires-War/`.
   - Plantilla «Magic Link»: añadir `{{ .Token }}` para que llegue el código.
   - El SMTP por defecto de Supabase tiene un límite muy bajo de correos por hora y puede enviar solo a miembros del equipo del proyecto.
3. Prueba final del usuario en iPhone.
4. Fusionar el PR #3 y publicar.
