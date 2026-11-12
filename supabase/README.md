# Preparación de sincronización compartida

**Estado: preparada; no conectada ni activada.** La página publicada sigue usando almacenamiento local. Este SQL no se ha ejecutado contra una base remota.

La interfaz puede permanecer en GitHub Pages. Supabase proveería Postgres, autenticación y un canal de actualizaciones. El acceso inicial al dashboard continuaría sin contraseña; el personal autorizado accedería a las funciones compartidas mediante un enlace enviado por correo. La contraseña de ISBM conservaría su función de abrir ese apartado.

## Información necesaria

1. Un proyecto Supabase que pertenezca al usuario, con su plan y región elegidos en Supabase.
2. La URL pública del proyecto y su clave **publishable** (o la clave legacy **anon**). Son identificadores de cliente; la protección de los registros se aplica con RLS. Nunca publicar service_role, secret keys, contraseña de Postgres ni cadenas de conexión.
3. Los correos de las personas autorizadas. Los roles propuestos son viewer, editor y admin.

## Esquema propuesto

`shared-database.sql` prepara una lista de acceso por correo verificado, el registro de identificadores de los 364 medicamentos/presentaciones existentes y verificaciones con historial de solo inserción. También registra las 446 sucursales y valida por clave foránea cada referencia. Las reglas de seguimiento permanecerían locales hasta definir y comprobar su edición compartida.

Las políticas RLS requieren una sesión autenticada y un correo incluido en el equipo. La clave pública por sí sola no concede acceso. El autor real se guarda con auth.uid(); el texto «Verificado por» continúa siendo la referencia de la consulta. No se utiliza la contraseña de ISBM como credencial de base de datos.

## Pendientes antes de activar

- Aplicar y verificar el esquema en un proyecto Supabase accesible; configurar los correos del equipo desde el SQL Editor, sin abrir escrituras anónimas. Mantener la confirmación de correo habilitada en Supabase Auth.
- Comprobar las políticas con usuarios de roles distintos y con una sesión sin acceso.
- Configurar envío de enlaces por correo y URL de retorno para https://loshtpaht.github.io/FarmaNexo-SV/.
- Implementar el cliente de sincronización, manejo de errores, reconexión y actualización entre dos navegadores independientes.
- Importar los registros locales con una acción explícita y comprobación de duplicados por ID. El agente no tiene acceso a los registros guardados en el navegador del usuario.
- Decidir cómo compartir y controlar las reglas globales, y comprobar la separación del catálogo ISBM.

No cambiar la etiqueta «Datos en este navegador» ni anunciar sincronización hasta superar las pruebas con la base real.
