# FarmaNexo SV

Dashboard de farmacias con mapa, verificaciones de existencias, historial, semáforo configurable y catálogos separados. [Abrir en GitHub Pages](https://loshtpaht.github.io/FarmaNexo-SV/).

## Acceso

**El dashboard no solicita contraseña. Solo el apartado Medicamentos ISBM está protegido.** Las sucursales, las fases 1 y 2 y el resto de la navegación permanecen disponibles. La contraseña anterior se conserva para ISBM. No se guarda en el repositorio ni en el navegador. Al recargar o pulsar Bloquear ISBM se cierra únicamente su acceso.

El catálogo ISBM se publica como un paquete AES-256-GCM, con PBKDF2-SHA256 de 600000 iteraciones y una sal aleatoria de 32 bytes. Las opciones ISBM para consultas se habilitan al desbloquear ese apartado. Los registros anteriores se conservan al recargar; mientras ISBM está bloqueado se muestra un nombre genérico para esos medicamentos.

El catálogo de ISBM está cifrado en la página, mientras que las verificaciones de existencias se comparten en Supabase. El repositorio público y su historial contienen los datos fuente del catálogo. Las verificaciones y sus respaldos no se cifran con la contraseña de ISBM.

## Fuentes y conciliación

- Directorio: 446 sucursales únicas, 343 activas, importadas de [la hoja compartida](https://docs.google.com/spreadsheets/d/10Ko3nX_pYL2DHlkLcBniA7ugsgY9HCOv/edit) el 12 de noviembre de 2026.
- Tarifas: archivo adjunto `TARIFAS MEDICAMENTOS-IMAGENES -LABORATORIOS ROLL OUT 12112025 v2.xlsx`, únicamente su hoja **Medicamentos**: 162 filas de primera fase, 78 de segunda y 119 destinadas a ISBM según la clasificación original.
- Complemento: los 109 registros de `109 Medicamentos ISBM.xlsx` pertenecen a ISBM, como indicó el usuario. Se conservan su número, código, composición, presentación y unidad.

| Apartado | Registros |
|---|---:|
| Primera fase | 162 |
| Segunda fase | 78 |
| ISBM | 124 presentaciones, correspondientes a 121 códigos |

ISBM: 119 filas de tarifas + 109 del complemento − 104 coincidencias consolidadas = 124 registros. Se normalizan ceros iniciales para comparar códigos; DOXAZOCINA (169/00000169) y FENITOINA (174/00000174) se concilian sin cambiar los identificadores antiguos. Las descripciones alternativas y las referencias a filas fuente se conservan para búsqueda y auditoría.

Se mantienen tres pares separados para confirmar diferencias de forma o envase: CALCIPOTRIOL + BETAMETASONA (gel/crema), DOMPERIDONA (suspensión oral/inyectable según la fuente), e INSULINA CRISTALINA (frasco 10 ml/pluma 3 ml). La discrepancia se señala; no se presupone equivalencia clínica. BETAMETASONA + ÁCIDO SALICÍLICO conserva una nota adicional porque tarifas dice loción/crema y el complemento especifica loción.

AMIODARONA y LETROZOL aparecen en segunda fase en tarifas y en el complemento ISBM. Se conservan en sus apartados independientes con identificadores distintos, sin reclasificar las filas originales. Los 109 identificadores existentes se mantienen para preservar las verificaciones guardadas.

El estado Activo/Inactivo se conserva tal como está en el archivo; no indica existencias en una sucursal. Las tarifas rollout con IVA se muestran cuando son numéricas; un dato ausente no se convierte a cero. Se conserva también el valor piloto en la procedencia. Las otras hojas del libro (imágenes, laboratorios, atenciones y auxiliares) no se agregan al catálogo de medicamentos.

Los datos son instantáneas; no hay sincronización automática con Google Sheets o DoctorSV. La presentación comercial y disponibilidad se registran por consulta, sin inventar existencias. Inspiración territorial: [Atlas](https://triggerspar07.github.io/Division-Territorial-de-Farmacias/).

## Seguimiento

| Existencias reportadas | Amarillo | Rojo |
|---|---|---|
| Pocas: 1 a 5 | Inmediatamente | Al día siguiente |
| Normales: 6 a 19, o cantidad no informada | A los 2 días | A los 3 días |
| Altas: 20 o más | A los 3 días | A los 4 días |
| Sin existencias | Al día siguiente | A los 2 días |
| No confirmado | Inmediatamente | A los 3 días |

Reglas configurables en fechas de El Salvador. Los plazos son recordatorios de consulta, no predicciones de consumo ni garantía de disponibilidad. La última consulta de cada par sucursal/medicamento define el seguimiento, conservando el historial. Las variantes tienen identificadores separados.

**Todas las personas que abren la página pueden actualizar existencias sin iniciar sesión.** El cliente se conecta automáticamente a Supabase. Cada actualización crea una verificación nueva con cantidad, nombre indicado por la persona, fecha y método. El historial previo se conserva. Realtime distribuye los cambios y hay una comprobación adicional cada 15 segundos mientras la página está visible.

La acción **Actualizar** abre el medicamento y cantidad actuales para registrar el nuevo recuento. Los nombres de visitantes son declarados por ellos; no se presentan como identidades verificadas. Los identificadores de cuenta y correos de administración no son públicos.

Las reglas globales y la creación de nuevos medicamentos del catálogo se reservan a la administración. Esto no limita la edición pública de cantidades. El acceso de administración usa enlaces personales de un solo uso y no bloquea la entrada al dashboard. No depende de SMTP ni de redirecciones de correo: el administrador genera el enlace desde Opciones y lo entrega a la persona indicada.

Los registros antiguos de localStorage permanecen intactos. **Opciones → Copiar verificaciones locales a la página** los incorpora explícitamente, sin duplicar identificadores ni reemplazar las reglas compartidas. Exporta respaldos JSON con frecuencia. No hay notificaciones con la página cerrada.


## Desarrollo

El sitio usa el SDK Supabase 2.119.0 vendorizado bajo licencia MIT. Las pruebas de base de datos usan PGlite como dependencia de desarrollo. GitHub Actions instala las dependencias, ejecuta las pruebas y publica dist al cambiar main.

```sh
npm ci
npm test
npm run build
python -m http.server 8000 --directory dist
```

`public/` contiene la interfaz abierta y los catálogos de primera/segunda fase. `private/` contiene las fuentes normalizadas ISBM y el informe de conciliación; es una separación del empaquetado, no una restricción de lectura del repositorio público. `sealed/isbm.json` es el único paquete ISBM que se publica en Pages.

Para regenerar los catálogos con Python y openpyxl:

```sh
python scripts/import-catalogs.py /ruta/al/archivo-de-tarifas.xlsx
node scripts/seal.mjs
npm test
npm run build
```

`seal.mjs` recibe por stdin una línea JSON con el campo password, mínimo 24 caracteres. Usa una terminal con eco deshabilitado o una herramienta de secretos. El script cifra solo los datos ISBM. El build verifica que el paquete corresponde a las fuentes ISBM actuales y no publica la carpeta private.

Mapa: Leaflet 1.9.4 y OpenStreetMap con atribuciones. Tipografías: Google Fonts. Los enlaces a WhatsApp no confirman que el teléfono admita ese canal.

## Existencias ERP

La vista **Existencias ERP** consulta directamente el corte publicado en Supabase: **96.192 saldos, 461 centros y 232 artículos**. Fuente: [reporte de existencias compartido](https://docs.google.com/spreadsheets/d/1XS-kz-zTfH9U8Bcu9HdQvXJbwuBo6jpeTMn9Yu7CuUo/edit?gid=859034083). La pestaña `ReporteExistencias_I20_20261117` indica corte del **17 de noviembre de 2026**, sin hora; la importación se realizó el 18 de noviembre UTC (17 en El Salvador). Esto es una instantánea del archivo; las verificaciones posteriores del equipo sí se comparten en tiempo real.

Los 232 artículos coinciden por código exacto o alias P2H, normalizando ceros iniciales, con los catálogos existentes. Se conservan las clasificaciones ISBM/fases; un artículo con dos referencias de catálogo no se suma dos veces. Cada par centro/artículo tiene un solo saldo en el archivo. Las unidades se explican junto al empaque original: TAB tabletas, INH inhaladores, FRA frascos, TUB tubos, AMP ampollas, VIA viales, SOB sobres, TAR tarros, TTO tratamientos y PZA piezas. Si solo aparece `/ 1`, se muestra «unidad no especificada en el ERP». No se deducen cantidades por caja.

Se importaron **95.344 positivos, 301 ceros y 547 negativos**. Los negativos mantienen su signo y requieren revisión. La suma de control (65.468.867) se utiliza exclusivamente para comprobar integridad; no se presenta como un total de unidades entre medicamentos y empaques distintos.

Hay **374 centros vinculados** al directorio (250 nombres normalizados exactos y 124 prefijos únicos truncados por la fuente, siempre dentro de la misma cadena y con correspondencia uno a uno). Los **87 pendientes** incluyen centros logísticos, sucursales nuevas y nombres ambiguos. Todos sus saldos siguen visibles; no se inventan ubicaciones ni vínculos. La conciliación está en [docs/erp-centers-20261117.csv](docs/erp-centers-20261117.csv) y las cifras de control en [docs/erp-import-20261117.json](docs/erp-import-20261117.json).

La vista incluye búsqueda, filtros, paginación en servidor, unidades completas, tarjetas en móvil y exportación CSV de la página consultada. Las fichas de sucursal muestran un acceso a sus saldos. Al seleccionar un medicamento en el directorio/mapa se usa su saldo ERP como referencia, salvo que haya una consulta del mismo día o posterior. La falta de una fila no se interpreta como saldo cero.

**Actualizar** conserva el reporte original y registra una verificación nueva mediante el flujo público existente. La cantidad ERP se muestra como referencia; quien consulta debe confirmar la cantidad y la unidad antes de guardar. El historial conserva las consultas antiguas. La contraseña ISBM continúa protegiendo su apartado.

Para preparar una futura importación, descarga el XLSX y ejecuta `python scripts/prepare-erp.py /ruta/reporte.xlsx /ruta/salida` con openpyxl instalado. El script valida columnas, unicidad, cantidades enteras y correspondencias de artículos. La carga privilegiada debe crear un corte en estado `staging`, insertar centros/artículos/saldos, comparar todas las filas y controles, y publicar atómicamente solo después de verificar. El SQL inicial está en `supabase/erp-inventory.sql`; ya está aplicado y no debe repetirse en producción. El importador temporal utilizado para esta carga quedó cerrado y no se publica ninguna credencial administrativa.
