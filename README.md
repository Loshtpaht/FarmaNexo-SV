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

GitHub Actions ejecuta las pruebas y publica dist en Pages con cada cambio a main.
