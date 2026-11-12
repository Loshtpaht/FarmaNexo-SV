# Base compartida de FarmaNexo

Proyecto configurado: https://bayocygoyhoddhiekccx.supabase.co. `public/sync-config.json` contiene únicamente la URL y la clave publishable, que es pública. Las claves administrativas y contraseñas no pertenecen al navegador ni al repositorio.

## Activación

La interfaz de sincronización está implementada. Para activar la base es necesario aplicar `shared-database.sql` en este proyecto mediante una conexión administrativa de Supabase o su SQL Editor. El script crea las tablas, índices, permisos RLS, funciones de administración y publicación Realtime. Requiere la confirmación de correo en Supabase Auth. Debe ejecutarse una sola vez en una base donde aún no existan estas tablas; una repetición falla sin borrar los datos existentes.

Configurar también Site URL y Redirect URLs en Supabase Authentication:

```
https://loshtpaht.github.io/FarmaNexo-SV/
```

Los dos correos administradores autorizados por el usuario están representados mediante hashes en la función de alta inicial. Cada uno recibe su rol al iniciar una sesión con correo confirmado; no se publican sus direcciones en código. Los administradores pueden autorizar lectores, editores u otros administradores desde el botón Equipo, y bloquear personas. Se conserva al menos un administrador.

El envío de enlaces requiere configurar Supabase Auth y su servicio de correo. El proveedor de correo predeterminado de Supabase puede restringir destinatarios y frecuencia; configurar SMTP propio para las direcciones del equipo cuando el proyecto lo requiera. La aplicación no anuncia un envío exitoso si Supabase devuelve un error.

## Comportamiento

- El dashboard continúa abierto sin contraseña. Solo el apartado ISBM mantiene su contraseña independiente.
- «Conectar equipo» envía un enlace de acceso al correo que introduce la persona. Una sesión autorizada abre los datos compartidos; al salir, vuelve al conjunto local original.
- Realtime actualiza las verificaciones, medicamentos adicionales y reglas. Hay una comprobación de respaldo cada 15 segundos cuando la página está visible.
- Las consultas se insertan sin políticas de edición o borrado. El servidor registra el usuario y correo reales; «Verificado por» conserva la referencia de la llamada.
- Los lectores no guardan registros. Editores y administradores pueden agregar consultas y medicamentos adicionales. Solo administradores cambian reglas globales o permisos.
- Las reglas tienen revisión para detectar cambios simultáneos en vez de sobrescribirlos silenciosamente.
- El botón «Copiar registros locales al equipo» es explícito, deduplica por ID y conserva los originales. Nunca reemplaza las reglas compartidas por las locales.
- Un guardado compartido fallido se informa y no se presenta como guardado local exitoso. Los lotes confirmados son inmutables y pueden reintentarse sin duplicar identificadores.
- El catálogo ISBM original continúa cifrado en Pages; la base registra sus identificadores. Las consultas del equipo no se cifran con la contraseña de ISBM: se protegen mediante las cuentas y RLS.

## Verificación

`npm test` incluye ejecución del esquema en PostgreSQL embebido (PGlite), sin la sentencia de publicación Realtime, y comprueba acceso de administradores, editores, lectores, usuarios ajenos y solicitudes anónimas. También prueba la identidad del autor y las restricciones de reglas.

Se probaron tres navegadores independientes contra una API local respaldada por el mismo esquema PostgreSQL: propagación automática de consultas mediante la comprobación periódica, permisos de solo lectura, reglas compartidas y conservación/importación idempotente de los datos locales. Este ensayo no prueba la entrega de WebSocket ni el correo en el servicio Supabase remoto.

La prueba final en Supabase requiere aplicar el script, configurar Auth, entrar con los correos autorizados y comprobar la propagación real entre dos dispositivos. No se debe anunciar esa validación remota como terminada antes de hacerla.
