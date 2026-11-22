# Pirámide SENATI V12 — ocho pisos, tragaluz libre y recorrido multijugador

## Distribución actualizada

V12 conserva la abertura central del edificio como un vacío vertical libre. No se colocan dentro del tragaluz escaleras, ascensores, columnas, núcleo de hormigón, pasarelas ni paños de vidrio que lo tapen.

- **Tragaluz central:** el vacío queda libre de escaleras, ascensores, columnas, núcleo de hormigón y pasarelas. Las losas respetan la abertura, las barandas van solo en el perímetro y en la cubierta se conserva únicamente un lucernario traslúcido.
- **Dos escaleras:** una a cada extremo lateral del edificio, junto a las zonas de salones. Cada núcleo tiene 2,8 m de ancho nominal en la maqueta para representar el paso de dos personas lado a lado.
- **Dos ascensores:** agrupados en el mismo lateral, juntos a la zona de salones y fuera del tragaluz.
- **Ocho pisos:** las escaleras conectan niveles consecutivos. Los ascensores tienen cabina móvil y puertas por planta; se usa E para abrir y volver a pulsar E para entrar y viajar al siguiente piso.
- **Primera persona:** WASD para caminar, Shift para correr, ratón para mirar y E para interactuar.
- **Multijugador:** muestra a los otros participantes como avatares con nombre, sincroniza posición, orientación y piso mediante PHP/MySQL y limpia registros inactivos. La sincronización usa solicitudes periódicas al servidor; no es un servidor dedicado de física en tiempo real.
- Visor de planta: `VISTA_DIMENSIONES_V12.html`.

Las medidas son dimensiones de la maqueta, no un levantamiento arquitectónico certificado de SENATI. La anchura representada no certifica aforo, accesibilidad ni rutas de evacuación.

## Actualizar una instalación existente en Laragon

1. Haz una copia de seguridad del proyecto y de la base MySQL `aula3d`.
2. Actualiza el proyecto con esta versión de la rama del pull request y abre una terminal dentro de la carpeta.
3. Ejecuta:

   ```powershell
   npm install
   npm run check
   npm run build
   ```

4. En **phpMyAdmin**, selecciona la base `aula3d` y ejecuta el contenido de `database/ACTUALIZAR_BD_EXISTENTE.sql`. Esto crea la tabla `walk_players` que necesita el multijugador. No borra usuarios, escenarios ni sus objetos.
5. Inicia Apache y MySQL. Abre `recorrer.php` desde el mismo servidor.
6. Para probar el multijugador, entra al recorrido desde dos sesiones distintas (por ejemplo, dos navegadores o dos dispositivos conectados al mismo servidor). Ambos deben usar la misma instalación PHP y base MySQL.
7. Haz Ctrl + F5 en el navegador después de compilar.

## Instalación nueva

En una base de datos nueva importa `database/schema.sql`, instala dependencias con `npm install`, ejecuta `npm run check` y luego `npm run build`.

## Comprobaciones

`npm run check` incluye las verificaciones V10, V11 y V12. La versión V12 comprueba el vacío central, la separación de los dos pozos de ascensor, las dos escaleras de 2,8 m y la presencia de la API multijugador.

La compilación y la prueba visual completa en Three.js deben ejecutarse en el equipo donde se instalará el proyecto. No debe usarse esta maqueta como plano técnico, cálculo estructural ni certificación de seguridad.
