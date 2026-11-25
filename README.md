# Pirámide SENATI 3D · proyecto principal

El **único proyecto activo** está en [fachada-1](fachada-1/).

La rama principal conserva la estructura y funcionalidades originales y añade **solo la actualización de calidad gráfica 3D**. Ya no incluye duplicados de aplicaciones completas, grandes ZIP de respaldo ni el proyecto repetido en la raíz.

## Abrir en Laragon

Clona el repositorio en `C:\laragon\www\Tarea-67` y abre:
- `http://localhost/Tarea-67/fachada-1/FACHADA_EXTERIOR.html` — fachada y exterior
- `http://localhost/Tarea-67/fachada-1/login.php` — inicio de sesión
- `http://localhost/Tarea-67/fachada-1/recorrer.php` — recorrido 3D

Si copias `fachada-1` directamente a `C:\laragon\www\fachada-1`, las rutas son `http://localhost/fachada-1/...`. Si Apache usa el puerto 8080, añade `:8080` después de `localhost`.

**Debes compilar los cambios gráficos** desde la carpeta `fachada-1`:

```powershell
cd "C:\laragon\www\Tarea-67\fachada-1"
npm ci
npm run check
npm run build
```

Luego recarga el navegador con `Ctrl + F5`. En las vistas 3D encontrarás los perfiles **Rendimiento, Equilibrado, Alto y Ultra**.

Las versiones anteriores y todos los archivos retirados continúan disponibles en el historial de Git y en la rama `proyecto-unificado`, pero no ocupan espacio innecesario en el árbol actual de `main`.
