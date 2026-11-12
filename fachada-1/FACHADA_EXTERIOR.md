# Exterior según el recorrido del video

El módulo `src/exterior-campus.js` reconstruye el entorno visible del recorrido aportado, utilizando el boceto para ordenar las zonas. El edificio original conserva exactamente su geometría y materiales: fachada, envolvente, soportes, techo, plantas, salones, escaleras interiores, ascensor y puerta de entrada. Se sustituye únicamente el antiguo entorno genérico.

## Cómo verlo en Laragon

1. Extrae el ZIP y coloca la carpeta única `fachada-1` en `C:\laragon\www`.
2. Comprueba que `FACHADA_EXTERIOR.html` e `index.php` estén directamente dentro de esa carpeta.
3. Inicia Apache y MySQL desde Laragon.
4. Abre http://localhost/fachada-1/FACHADA_EXTERIOR.html para la fachada, o http://localhost/fachada-1/login.php para el proyecto completo.

Los archivos compilados están incluidos. No necesitas Git ni Node para abrir la aplicación. Si la base `aula3d` ya existe, no la importes otra vez. La primera cuenta registrada desde localhost será administradora si la tabla de usuarios está vacía.

El visor permite ver la perspectiva, la planta y los siete puntos del recorrido. Pulsa Ctrl + F5 si el navegador conserva una versión anterior.

## Elementos reconstruidos

| Tramo del boceto | Referencia temporal | Elementos visibles incorporados |
| --- | --- | --- |
| 1–2 | 00:00–00:32 | Calle de hormigón, cruce peatonal, muro azul, escalinata amarilla, pasamanos, rampa y bordillos |
| 3–4 | 00:33–01:32 | Dos círculos verdes de seguridad, bancas oscuras, jardineras de piedra, árboles, agaves, carteles informativos, caseta técnica, cafetería, contenedor gris y portones de reja |
| 5 | 01:33–02:57 | Pabellón longitudinal de talleres, cristales oscuros, persianas azules, vereda, camiones de prácticas, conos, césped elevado, palmeras, árboles blanqueados, drenajes y gabinete de incendios |
| 6 | 03:00–03:41 | Estacionamiento, autos, furgón, círculos de seguridad, cruces peatonales, franjas amarillas y vereda adoquinada |
| 6–7 | 03:42–04:47 | Escaleras grises, rampas de dos tramos con retorno y descansos, muros azules y blancos, pasamanos, bancas, jardines y monolito rojizo sobre pedestal azul |
| 7–1 | 04:48–05:32 | Toldo azul, jardín exterior, árboles, bolsas verdes de mantenimiento, carretilla con recipientes, postes rojos y seto con flores violetas |

También se representan los pabellones colindantes del fondo de forma simplificada. No se han subido las imágenes ni el video privados al repositorio.

## Alcance de la reconstrucción

La colocación relativa sigue el boceto y las observaciones del video. Las medidas y distancias son aproximadas: no hay levantamiento topográfico, calibración de cámara ni dimensiones de referencia del exterior. Los vehículos, vegetación y mobiliario son modelos genéricos; los textos de los carteles se resumen cuando no son legibles. No es una reproducción fotogramétrica exacta ni permite verificar detalles que no aparecen en la grabación.

## Validación

```bat
npm ci
npm run check
npm run build
```

`verificar-exterior.mjs` comprueba geometría finita, cotas, continuidad del recorrido 1–7 y conservación de la puerta. Cuando el historial original está disponible, compara además las mallas y materiales del edificio y todos los espacios interiores contra el commit anterior al cambio. Las superficies inclinadas tienen altura transitable y los muebles repetidos se agrupan en instancias para reducir el trabajo de renderizado.

Las pruebas de geometría y la compilación están verificadas. La prueba interactiva WebGL del navegador no se pudo completar en el entorno de desarrollo por las restricciones de su navegador.
