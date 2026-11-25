# Pirámide SENATI 3D — versión 4 (Laragon / XAMPP)

Esta aplicación combina un editor Three.js, un recorrido en primera persona y PHP/MySQL para el acceso de usuarios.
El edificio, sus 6 plantas y las escaleras son **aproximaciones académicas**, no planos reales ni rutas de evacuación certificadas.

## Preparación desde cero

1. Descomprime `piramide_senati_fusion` en `C:\laragon\www\` o `C:\xampp\htdocs\`.
2. En VS Code, abre esa carpeta. En su terminal ejecuta:

   ```powershell
   npm install
   npm run build
   ```

   Vite genera `public/assets/editor.js`, `simulator.js`, `recorrer.js` y estilos. No abras los PHP con Live Server; usa Apache.
3. Inicia Apache y MySQL en Laragon/XAMPP.
4. En phpMyAdmin importa `database/schema.sql` en tu servidor MySQL. Esto crea la BD `aula3d`, las tablas de escenarios y las nuevas tablas `users` / `access_logs`.
5. Visita `http://localhost/piramide_senati_fusion/registro.php` (o `http://localhost:8080/...` si Apache usa puerto 8080).
6. Registra la **primera cuenta desde el mismo equipo del servidor**. Será la administradora. No se incluyen usuarios ni contraseñas predeterminadas. Los registros posteriores quedarán inactivos hasta su aprobación en `admin.php`.
7. Inicia sesión y llegarás directamente a `recorrer.php`.

## Ya tienes la versión anterior con BD importada

- No elimines la base `aula3d`, ni ejecutes comandos `DROP DATABASE`.
- Importa solo `database/usuarios.sql` para añadir tablas de autenticación sin modificar tus escenarios.
- Copia esta nueva versión sobre los archivos anteriores, manteniendo cualquier copia de seguridad previa.
- Desde la carpeta ejecuta `npm install` y `npm run build`.
- Abre `registro.php` para crear la cuenta administradora inicial.

## Roles

- **Usuario**: registrarse y esperar aprobación del administrador. Cuando se activa la cuenta, iniciar sesión y entrar a `recorrer.php`, ver escenarios del sistema y escenarios guardados; puede caminar, cambiar de escenario, abrir la entrada (E) y recorrer escaleras.
- **Administrador**: todo lo anterior, además de `index.php` para editar/guardar/eliminar escenarios, `simulador.php` y `admin.php` para cambiar roles, activar o bloquear cuentas y consultar actividad.
- Todas las escrituras en la API requieren rol administrador y token CSRF. Las contraseñas se almacenan con `password_hash`.

## Cámara y puertas

- **Empezar recorrido**: captura el ratón (requiere un clic por permisos del navegador).
- WASD / flechas: caminar. **Shift**: correr. Sensibilidad, campo visual y velocidad ajustables en la barra lateral.
- **E** cerca de la entrada: abrir o cerrar las hojas de la puerta. No puedes cruzar la pared del edificio ni la entrada cerrada.
- Acércate a la caja de escaleras del lateral interior derecho y camina sobre los peldaños. La altura cambia conforme avanzas. También hay un selector de piso para inspección rápida.
- **Tab** durante el recorrido: carga el siguiente escenario guardando la sesión (el navegador libera el ratón; pulsa de nuevo Empezar recorrido).
- **Esc** libera el ratón y vuelve a mostrar el selector de escenarios.

## Escenarios

- **Pirámide SENATI**: 6 plantas conceptuales; cada piso tiene un salón con 20 estaciones de cómputo y escaleras geométricas transitables. La fachada se basa en fotografías.
- **Aula de cómputo**: maqueta independiente con 20 estaciones.
- **Guardados**: escenarios creados y guardados por el administrador en el editor. En el recorrido se reconstruye el nivel activo para reducir la carga gráfica.

## Advertencias

- El recorrido y las puertas son interacciones de una **simulación educativa**. La distribución de pisos, vías de circulación y evacuación no sustituye una revisión de ingeniería, arquitectura ni SST.
- La aplicación está pensada para una instalación local o red de laboratorio controlada. Para publicarla en Internet configura HTTPS, usuario de BD limitado, protección adicional contra fuerza bruta, copias de seguridad y supervisión de seguridad.
- El login es **del proyecto**, no de SINFO, y nunca debe solicitar claves del portal real SENATI.
- Si faltan archivos `public/assets`, el frontend no fue compilado. Ejecuta los dos comandos del paso 2.
