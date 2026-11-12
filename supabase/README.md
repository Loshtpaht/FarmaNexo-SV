# Supabase: edición pública de existencias

Proyecto activo: `bayocygoyhoddhiekccx`. La página conserva únicamente la URL y la clave **publishable** pública en sync-config.json. Las claves administrativas permanecen en los servicios de Supabase.

## Acceso e interacción

- Todas las personas que abren la página ven la misma base y pueden registrar una cantidad nueva, sin cuenta ni inicio de sesión.
- No existen usuarios de solo lectura para las existencias. Las cuentas que tenían ese permiso también pueden registrar recuentos en el modo público.
- La columna de cantidad se actualiza mediante un registro nuevo: no se permite editar ni borrar el historial anterior desde el cliente.
- Cada registro conserva nombre declarado, método, fecha, cantidad y un identificador de navegador. El nombre de un visitante no se considera identidad autenticada.
- El catálogo ISBM continúa solicitando su contraseña. La edición pública no elimina ese acceso de la interfaz.
- Realtime distribuye los cambios y una consulta periódica cada 15 segundos cubre desconexiones del canal mientras la página está visible. Un fallo de guardado se informa; no se presenta como un guardado local exitoso.
- Los registros locales anteriores no se copian automáticamente. La acción Opciones → Copiar verificaciones locales a la página conserva los originales y omite IDs repetidos.

## Administración opcional

Solo las reglas globales, los medicamentos adicionales del catálogo y los accesos de administración requieren una sesión autorizada. Esto no es un requisito para actualizar existencias.

La función Edge `farmanexo-team-access` permite a un administrador generar enlaces personales de un solo uso, que se intercambian mediante Supabase Auth verifyOtp. El enlace se limpia de la dirección del navegador después del intercambio y la sesión se conserva en ese navegador. Cada enlace sirve una vez; puede generarse otro para un nuevo dispositivo o si ha caducado. No se envían correos automáticamente ni se depende del Site URL/SMTP del proyecto.

La función valida cada JWT con Auth getUser y comprueba el rol real en la base antes de usar las capacidades administrativas del servidor. La verificación JWT del gateway está desactivada porque la función realiza esa autenticación explícitamente. La clave service_role nunca se devuelve al cliente. Solo el origen de la página publicada recibe permiso CORS.

Los helpers con privilegios están en `farmanexo_private`, con search_path vacío, comprobaciones del llamador y permisos restringidos. Las funciones RPC públicas son SECURITY INVOKER. Las direcciones de administración no están publicadas en código: los dos accesos iniciales autorizados se identifican mediante hashes y los correos reales se guardan solo en la base privada.

## Tablas y permisos

- 446 identificadores de sucursal y 364 registros de medicamentos/presentaciones, con claves foráneas para validar referencias.
- Verificaciones públicas con restricciones de cantidad, disponibilidad, fecha, canal y texto. Los correos y UUID de cuentas tienen privilegios de columna separados y no se entregan a visitantes.
- Reglas con revisión para detectar cambios concurrentes. Solo administradores pueden cambiarlas.
- RLS en todas las tablas, incluida la tabla privada de administración. Las políticas públicas de inventario son intencionales por solicitud del propietario.

El esquema inicial está en shared-database.sql. La ampliación de edición pública está en public-inventory.sql. Se aplicaron mediante migraciones administradas de Supabase; no volver a ejecutar estos scripts sobre las tablas existentes.

## Verificación

`npm test` ejecuta el esquema en PostgreSQL embebido (PGlite) y comprueba el alta inicial, permisos privados y el modo final de edición pública: visitantes anónimos pueden leer y añadir recuentos; las columnas de cuentas, el borrado de historial y el cambio de reglas siguen protegidos.

También se comprobó el flujo real de Supabase desde navegadores independientes: escritura por API, distribución Realtime, enlaces personales de un uso y separación de ISBM. Las cuentas y los recuentos temporales de prueba se retiran antes de la entrega.

Los índices nuevos pueden aparecer temporalmente como [índices sin uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) mientras la base comienza a utilizarse. El proveedor recomienda [protección frente a contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); la aplicación utiliza enlaces de acceso y no contraseñas de cuentas.
