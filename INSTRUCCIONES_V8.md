# V8 – División del primer piso según el croquis enviado

## Cambios de esta versión

Se conservó el proyecto PHP/MySQL + Three.js de la **V7**. Se cambió **únicamente la geometría y la distribución educativa del piso 1**:

- Se trazaron **aproximadamente 125 segmentos de muro**, siguiendo la imagen de divisiones del primer piso compartida por el usuario.
- El plano ahora presenta cinco sectores superiores, varios inferiores, un conjunto de compartimentos pequeños a la izquierda, un núcleo interior de servicio y el conjunto de dos escaleras al lado derecho.
- Se mantienen las dos escaleras transitables y sus coordenadas de conexión existentes, para que la subida de los pisos **2 al 6** no se altere.
- Se añadieron una puerta interactiva de acceso lateral y aperturas de paso donde el croquis presenta discontinuidades. **La apertura frontal del simulador es una adaptación funcional**, ya que su posición no puede verificarse con la fotografía.
- El recorrido y la escena del editor siguen utilizando 20 puestos de demostración (4 en cada uno de cinco sectores). **Su existencia y ubicación real no están acreditadas por la fotografía.**
- Los pisos **2, 3, 4, 5 y 6** y las funciones PHP/MySQL de usuarios, registro, inicio de sesión, editor y simulador continúan según V7.

## Ver el plano sin instalar nada

Abre **`VISTA_PLANTA_1_V8.html`** en tu navegador. Es una vista superior interactiva, no el renderizado Three.js.

- Foto de referencia: `referencias/croquis_divisiones_primer_piso.jpg`.
- Vista previa del trazado: `referencias/V8_planta_trazado_previsualizacion.png`.
- Geometría 3D del primer piso: `src/ev52-layout.js` y `src/piramide-senati.js`.

## Actualizar desde V7 en Laragon (sin perder datos)

1. **Copia de seguridad** de `C:\laragon\www\piramide_senati_fusion` y de tu base de datos `aula3d`.
2. Descomprime el ZIP completo y reemplaza **solo los archivos del proyecto** dentro de `C:\laragon\www\piramide_senati_fusion`; no reemplaces tus datos de MySQL.
3. Si ya tienes Node.js y `node_modules` en el proyecto, ejecuta en VS Code o PowerShell dentro de esa carpeta:

   ```powershell
   npm run build
   ```

   Si es una instalación nueva o no tienes `node_modules`, ejecuta primero `npm install` y después `npm run build` (con conexión a Internet). El ZIP no incluye `node_modules` ni una compilación Vite ya generada.
4. Inicia Apache y MySQL desde Laragon. **El puerto 80 debe responder con Apache, no con Microsoft-IIS**; si IIS volvió a ocuparlo, corrige ese conflicto antes de usar localhost.
5. Abre `http://localhost/piramide_senati_fusion/login.php` e inicia sesión con tu cuenta existente. Para ver la escena, entra en **Recorrido** o selecciona la plantilla «Pirámide SENATI» en el editor.

### Base de datos

**No vuelvas a importar `database/schema.sql` si ya tienes usuarios o escenarios.** Esta versión no requiere cambios de SQL respecto a V7; se conservan las cuentas y roles existentes.

### Escenarios guardados

Un escenario guardado anteriormente en MySQL puede contener sus propias posiciones de objetos de V7. Para ver la nueva distribución con 20 puestos preubicados, selecciona la **demostración integrada** o crea un **escenario nuevo** desde la plantilla Pirámide SENATI en el editor. No sobrescribas escenas antiguas antes de guardar una copia.

## Limitaciones importantes

La fotografía no tiene escala, cotas, leyendas completas ni evidencias suficientes para identificar los usos exactos de los ambientes, el número real de puertas o la seguridad de las escaleras. Esta versión es una **interpretación visual y didáctica**, no un plano arquitectónico, un modelo BIM validado ni una simulación certificada de evacuación. La disposición del mobiliario, radios de paso y la apertura frontal se usan exclusivamente con fines de interacción en software.

## Verificación

- `npm run check` revisa estructura del proyecto y sintaxis de los archivos principales.
- `node scripts/verificar-v8.mjs` comprueba los segmentos, habitaciones y las 20 posiciones educativas.
- `php -l archivo.php` comprueba sintaxis PHP (si PHP está en PATH).
- La compilación Vite **no se completó en el entorno donde se preparó el ZIP porque no tenía conexión al registro de npm**. Por eso debes ejecutar `npm install` / `npm run build` en tu computadora y comprobar el resultado en el navegador.
