# FarmaNexo SV

Dashboard en español con mapa, directorio, catálogo ISBM, consultas, historial, semáforo configurable y respaldos. Desplegado en GitHub Pages.

## Datos incluidos

- 446 sucursales únicas; 343 activas. Los filtros permiten consultar todos los estados.
- 109 medicamentos ISBM con 109 códigos únicos y secuencia completa del 1 al 109, revisados contra el archivo proporcionado.
- Nombre genérico, composición, presentación del catálogo, tipo y unidad de medida conservados. La marca y presentación comercial se registra por consulta, por separado.
- No se incluyen existencias ficticias. Aparecer en el mapa no confirma disponibilidad.

Directorio importado el 12 de noviembre de 2026 desde [la hoja compartida](https://docs.google.com/spreadsheets/d/10Ko3nX_pYL2DHlkLcBniA7ugsgY9HCOv/edit). Catálogo: archivo `109 Medicamentos ISBM.xlsx`, correspondiente a [esta hoja](https://docs.google.com/spreadsheets/d/1GEHZB4FjPyt4lmneUyrbJ9RuHJRrSqc7/edit). Son instantáneas sin sincronización automática con Google Sheets o DoctorSV. Inspiración territorial: [Atlas](https://triggerspar07.github.io/Division-Territorial-de-Farmacias/).

## Uso

1. Busca una sucursal y registra una verificación.
2. Selecciona medicamento, disponibilidad y cantidad en la unidad del catálogo; agrega presentación comercial, canal (Llamada, WhatsApp, NERD u Otro), fecha y persona que verificó.
3. Revisa el semáforo y la sección Por revisar.
4. Exporta un respaldo JSON frecuentemente. Importarlo en otro navegador combina los historiales. CSV permite consultar los registros en una hoja de cálculo.

### Reglas iniciales, configurables

| Existencias reportadas | Amarillo | Rojo |
|---|---|---|
| Pocas: 1 a 5 unidades | Inmediatamente | Al día siguiente |
| Normales: 6 a 19 o cantidad no informada | A los 2 días | A los 3 días |
| Altas: 20 o más | A los 3 días | A los 4 días |
| Sin existencias | Al día siguiente | A los 2 días |
| No confirmado | Inmediatamente | A los 3 días |

Se usa la fecha de calendario de El Salvador. La consulta nueva conserva el historial y reemplaza la anterior para el seguimiento del par sucursal y medicamento. El estado se recalcula al abrir la página y cada minuto mientras está abierta. Los plazos son recordatorios, no estimaciones de consumo ni garantía de disponibilidad.

## Almacenamiento

GitHub Pages aloja archivos estáticos. Las verificaciones, medicamentos adicionales y reglas se guardan en localStorage del navegador y origen actuales. No existe sincronización entre usuarios o dispositivos, base de datos remota ni notificaciones con la página cerrada. Borrar los datos del navegador puede eliminar los registros. Cambiar de dominio, equipo, perfil o modo privado usa otro almacenamiento.

El repositorio contiene el directorio y catálogo iniciales; las consultas no se envían a GitHub. Los respaldos exportados sí contienen los nombres y notas que registres. Se necesita un backend para compartir cambios entre personas o dispositivos.

Mapa: Leaflet 1.9.4, OpenStreetMap con atribuciones. Fuentes: Google Fonts. Los enlaces de llamada y WhatsApp se habilitan para teléfonos de ocho dígitos; no se presupone que admitan WhatsApp.

## Desarrollo

Sin dependencias npm.

```sh
npm test
npm run build
python -m http.server 8000 --directory dist
```

GitHub Actions ejecuta las pruebas y publica únicamente los archivos cifrados en `sealed/` con cada cambio a main.

## Apartado exclusivo ISBM

Los 109 medicamentos complementarios del Excel están marcados con `collection: isbm` y se muestran solo en Medicamentos ISBM. Primera y segunda fase tienen listas independientes, inicialmente vacías porque no se han proporcionado sus catálogos. Los medicamentos adicionales antiguos se conservan como Sin clasificar; no se asignan automáticamente a ISBM. Las consultas y filtros agrupan las opciones por apartado.

La hoja de Google compartida devuelve acceso requerido al revisarla en esta actualización. Se ha comprobado el Excel adjunto completo. Según la aclaración del usuario, este archivo complementa el listado principal y puede tener coincidencias con nombres diferentes. La integración del listado principal y su conciliación quedan pendientes de recibir una copia legible; no se afirma haber comparado la versión actual de esa hoja. No se deben unir medicamentos solo por parecido del nombre: revisar código, principio activo, concentración, forma y presentación.

## Acceso con contraseña

La página publicada solicita una contraseña antes de descifrar y abrir el dashboard. AES-256-GCM protege el paquete publicado y PBKDF2-SHA256 deriva la clave con 600000 iteraciones y una sal aleatoria de 32 bytes. La contraseña no se guarda en el repositorio, el código ni el navegador. Al recargar o pulsar Bloquear vuelve a solicitarse.

GitHub Pages continúa siendo alojamiento estático: esto no es autenticación de servidor ni convierte el repositorio público en privado. El código fuente, el catálogo inicial y el historial anterior del repositorio siguen siendo públicos. Los registros personales locales y sus respaldos no se cifran con este acceso y conservan el funcionamiento anterior. Para permisos multiusuario o datos confidenciales compartidos hace falta un backend con autenticación.

Para cambiar código dentro del dashboard, vuelve a cifrar antes de publicar:

```sh
node scripts/seal.mjs
npm test
npm run build
```

`seal.mjs` recibe por stdin una línea JSON con el campo `password`, de al menos 24 caracteres. Usa una terminal con eco deshabilitado o una herramienta de secretos. El paquete cifrado se guarda en `sealed/dashboard.json`, sin contraseña. `build.mjs` comprueba que el paquete corresponde exactamente al código actual y publica solo la pantalla de acceso y el paquete cifrado. Nunca se debe copiar `public/` directamente a Pages.
