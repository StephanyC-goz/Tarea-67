# SENATI 3D · V5 · Recorrido, aulas y administración

## Cambios incluidos

- Pirámide con **seis pisos** esquemáticos, techo del último nivel y núcleo de escaleras.
- Cada nivel tiene paredes interiores, dos puertas de aula, una pizarra, una mesa docente y **20 puestos** con escritorio, PC All-in-One, teclado, mouse y silla. Total: 120 puestos.
- El visitante puede abrir la **entrada principal** y las **puertas de las aulas** con **E** cuando se acerque, respetando las colisiones con muros, mobiliario y la entrada cerrada.
- En recorrido, acercarse a una silla y presionar **E** o el botón **Sentarse** para ocuparla. **F** abre la computadora de demostración; **E** permite levantarse. La PC muestra el número de puesto y botones a SINFO y Campus Online, que se abren fuera del simulador, sin capturar contraseñas.
- Registro e inicio de sesión con un diseño nuevo. Alumnos/visitantes: `recorrer.php`. Administradores: también `index.php`, `simulador.php` y `admin.php`; la API aplica permisos en el servidor.
- El simulador ofrece una **demostración local** si MySQL no tiene escenarios guardados. Puedes probar Iniciar, Alarma, Evacuar, Pausar y Reiniciar. Para guardar resultados es necesario que un administrador guarde un escenario en MySQL.

## Instalación en Laragon o XAMPP

1. Copia `fachada-1` a `C:\laragon\www\` o `C:\xampp\htdocs\`.
2. Abre la carpeta en VS Code y ejecuta:

   ```powershell
   npm install
   npm run build
   ```

   Necesitas acceso a internet para descargar Vite/Three.js la primera vez. No uses Live Server: sirve la aplicación desde Apache para ejecutar PHP.
3. Inicia Apache y MySQL. Si es instalación **nueva**, importa `database/schema.sql` en phpMyAdmin (crea `aula3d`). Si ya habías instalado V4, **no borres la base de datos**: la V5 no agrega tablas, así que no necesitas reimportarla.
4. Accede a `http://localhost/fachada-1/login.php` (si Apache utiliza 8080, usa `http://localhost:8080/fachada-1/login.php`).
5. Si no tienes cuentas: crea la primera en `registro.php`, desde el equipo local que aloja Apache. Será el administrador inicial. Las cuentas posteriores requieren su aprobación.
6. Entra a `admin.php` para activar usuarios o a `simulador.php` para probar la demostración. Abre `recorrer.php` para interactuar.

## Controles

- **W/A/S/D**: caminar, **Shift**: correr. Hay controles laterales de velocidad, sensibilidad y FOV.
- **E**: interactuar con la puerta más cercana o sentarse/levantarse.
- **F**: abrir el escritorio virtual de la PC una vez sentado.
- **Tab**: cambiar de escenario.
- **Esc**: liberar el ratón. Para volver a moverte, pulsa **Empezar recorrido**.
- Selector **Planta**: subir rápidamente a otro nivel. También se pueden recorrer las escaleras caminando por el núcleo derecho.

## Administración y limitaciones

- El rol `usuario` representa alumnos y visitantes, solo puede consultar escenarios y recorrerlos. El rol `admin` puede editar, crear, eliminar, simular y gestionar permisos. Las APIs vuelven a validar cada operación en PHP.
- Las contraseñas se almacenan con `password_hash`, las sesiones usan cookies HttpOnly y las solicitudes POST protegidas exigen CSRF. El primer administrador solo puede registrarse en localhost.
- Para una instalación pública se necesitarán medidas adicionales: HTTPS, límites de tasa de intentos por IP, auditoría, copias de seguridad, usuarios MySQL sin privilegios administrativos y revisión de seguridad.
- **No es un plano arquitectónico o estructural real de SENATI.** No uses las escaleras o las rutas del simulador para planificar evacuaciones reales; solo son una maqueta educativa.
- La vista de PC **no emula el sistema operativo** ni integra el inicio de sesión de SENATI. Únicamente ofrece enlaces oficiales externos. El usuario introduce sus credenciales, si corresponde, en el sitio auténtico.

## Diagnóstico de errores

- Si aparece “Falta compilar”, ejecuta `npm install` y `npm run build` en la carpeta correcta y revisa que exista `public/assets/recorrer.js`, `editor.js` y `simulator.js`.
- Si el simulador no carga escenarios guardados, usa la **opción de demostración** y revisa `diagnostico.php`, la base `aula3d` y la API `api/scenarios.php?action=list`.
- Si Apache utiliza otro puerto, actualiza la URL; no es necesario cambiar rutas internas del proyecto.
