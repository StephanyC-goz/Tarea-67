# PIRÁMIDE SENATI 3D — PROYECTO UNIFICADO

**Rama oficial de esta integración:** `proyecto-unificado`  
**Carpeta única para Laragon:** `C:\laragon\www\piramide_senati_fusion`  
**URL de entrada:** `http://localhost/piramide_senati_fusion/PANEL_UNIFICADO.html` (o puerto 8080 si Apache lo usa). Para diagnosticar la instalación antes de iniciar sesión, abre `COMPROBAR_INSTALACION.php` desde localhost.

Este proyecto académico mantiene la aplicación PHP/MySQL/Three.js de `piramide-v11` como **motor principal**, con la distribución y funcionalidades que evolucionaron hasta V12. El módulo de fachada exterior de `main/fachada-1` se conserva íntegro y accesible desde el mismo portal. No se sustituyeron los modelos originales del exterior por los de V12: son dos representaciones históricas, con su identidad visual intacta. No es un plano arquitectónico oficial ni una simulación certificada.

## Instalación en una PC nueva (PowerShell)

1. Descarga el ZIP de **la rama `proyecto-unificado`** y extráelo fuera de `C:\laragon\www`, por ejemplo, en Descargas. No mezcles archivos de `main` y `piramide-v11` manualmente.
2. Dentro de la carpeta extraída, abre PowerShell y ejecuta:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File ".\INSTALAR_UNIFICADO.ps1"
   ```

   El instalador comprueba los archivos requeridos, guarda la instalación anterior como una carpeta `-respaldo-FECHA` (si existe), copia todo a `piramide_senati_fusion`, y ejecuta `npm ci`, `npm run check` y `npm run build` si detecta Node.js. **No borra ninguna base MySQL.**
3. En Laragon, inicia Apache y MySQL. Comprueba el puerto real configurado; los más habituales son 80 u 8080.
4. Si no existía `aula3d`, importa únicamente `database/schema.sql` desde phpMyAdmin/HeidiSQL. Si existía en la PC anterior y quieres conservar cuentas y escenarios, **exporta la base real anterior** e impórtala (no basta con el esquema vacío).
5. Entra a `PANEL_UNIFICADO.html`, después a `registro.php` si necesitas crear el primer usuario. La primera cuenta registrada desde localhost sobre una tabla `users` vacía recibe rol admin automáticamente. Nunca publiques el registro inicial antes de crearlo.

**Si falta `config/auth.php`**: estás abriendo la carpeta incorrecta o copiaste solo una parte del ZIP. El archivo debe existir en `C:\laragon\www\piramide_senati_fusion\config\auth.php`. No copies únicamente `registro.php`.

**Si no funciona `localhost`**: comprueba en Laragon el puerto de Apache y abre `localhost:8080` si corresponde. Un error 404 es distinto a un error de PHP o de conexión MySQL.

**Si no se ven las escaleras o el primer piso actualizado**: desde PowerShell, en la carpeta raíz, ejecuta:

```powershell
npm ci
npm run check
npm run build
```

Y recarga con `Ctrl+F5`. Los archivos generados de `public/assets` pueden estar desactualizados antes de la compilación.

## Estructura integrada

| Ruta | Función |
| --- | --- |
| `PANEL_UNIFICADO.html` | Inicio único y navegación entre módulos |
| `login.php`, `registro.php`, `admin.php` | Accesos y permisos |
| `index.php` | Editor 3D y escenarios guardados |
| `recorrer.php` | Recorrido interactivo, escaleras, ascensores, multijugador |
| `simulador.php` | Simulador |
| `FACHADA_EXTERIOR.html` | Puerta de acceso al exterior conservado |
| `modulos/fachada-original/` | Módulo original `fachada-1` de `main`, sin modificar archivos internos |
| `database/` | SQL y actualizaciones MySQL |
| `archivo-original/main/` | Copia exacta de los 162 archivos originales de `main` |
| `archivo-original/piramide-v11/` | Copia exacta de los 124 archivos originales de `piramide-v11` |
| `archivo-original/MANIFIESTO_ORIGINALES.json` | Lista de archivos y hashes Git para comprobar integridad |
| `scripts/verificar-unificado.mjs` | Verificación de integridad, entradas y módulos |

Los originales están bloqueados para acceso web en Apache mediante `.htaccess`; permanecen disponibles dentro del ZIP y en GitHub. El módulo exterior accesible usa la copia separada `modulos/fachada-original/`, no las fuentes del archivo protegido.

## Límites y pruebas

- Se conserva el código histórico intacto y se mejora la presentación únicamente del portal y de las interfaces actuales.
- Los gráficos 3D requieren navegador con WebGL, más Apache/PHP/MySQL y una compilación Vite vigente.
- Los scripts de verificación detectan archivos faltantes y comprueban hashes, pero **no sustituyen las pruebas visuales reales de cámara, puertas y colisiones en la PC del usuario**.
- La base `aula3d` guarda información local. No se transfiere automáticamente entre computadoras por GitHub.


## Calidad gráfica 3D estilo videojuego

La aplicación incluye un selector **Calidad gráfica 3D** en el editor, el recorrido y el simulador. La apariencia usa materiales PBR, baldosas con juntas suaves, pantallas con iluminación propia, niebla suave, sombras con encuadre del edificio y control de nitidez.

- **Alto (recomendado en PC):** buena nitidez y sombras de 2048 píxeles.
- **Ultra:** sombras de hasta 3072 píxeles y mayor resolución para GPU potente.
- **Equilibrado:** sombras y resolución moderadas; útil en portátiles.
- **Rendimiento:** sombras desactivadas y resolución reducida para recuperar FPS.

Los ajustes se comparten entre pantallas usando las preferencias locales del navegador; no cambian los escenarios, usuarios ni MySQL. En el recorrido, el HUD muestra los FPS reales para elegir el nivel adecuado. El aspecto es una **interpretación estilizada de videojuego 3D**, no utiliza Roblox Studio ni reproduce recursos originales de Roblox.

Para ver la actualización:

```powershell
cd "C:\laragon\www\piramide_senati_fusion"
git switch proyecto-unificado
git pull --ff-only origin proyecto-unificado
npm ci
npm run check
npm run build
```

Abre `recorrer.php` y recarga con `Ctrl+F5`. Si la imagen va lenta, cambia a Equilibrado o Rendimiento. Las pruebas automatizadas verifican el código y las opciones gráficas, pero el aspecto final y los FPS dependen del navegador y la GPU y deben comprobarse visualmente.
