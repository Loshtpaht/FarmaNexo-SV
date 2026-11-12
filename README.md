# FarmaNexo SV

Dashboard de farmacias con mapa, verificaciones de existencias, historial, semáforo configurable y catálogos separados. [Abrir en GitHub Pages](https://loshtpaht.github.io/FarmaNexo-SV/).

## Acceso

**El dashboard no solicita contraseña. Solo el apartado Medicamentos ISBM está protegido.** Las sucursales, las fases 1 y 2 y el resto de la navegación permanecen disponibles. La contraseña anterior se conserva para ISBM. No se guarda en el repositorio ni en el navegador. Al recargar o pulsar Bloquear ISBM se cierra únicamente su acceso.

El catálogo ISBM se publica como un paquete AES-256-GCM, con PBKDF2-SHA256 de 600000 iteraciones y una sal aleatoria de 32 bytes. Las opciones ISBM para consultas se habilitan al desbloquear ese apartado. Los registros anteriores se conservan al recargar; mientras ISBM está bloqueado se muestra un nombre genérico para esos medicamentos.

Esta protección no convierte GitHub Pages en un servidor con autenticación. El repositorio público y su historial contienen los datos fuente; los registros locales y sus respaldos no se cifran. Para permisos multiusuario o información confidencial compartida se necesita un backend.

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

Los registros, medicamentos adicionales y reglas se guardan en localStorage del navegador y origen actuales. No hay sincronización entre usuarios/dispositivos ni avisos con la página cerrada. Exporta respaldos JSON frecuentemente; importarlos combina historiales. CSV permite revisar las consultas en hojas de cálculo. Borrar los datos del navegador puede eliminar los registros.

## Desarrollo

El sitio y sus pruebas Node no requieren dependencias npm. GitHub Actions prueba y publica dist al cambiar main.

```sh
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
