# V7 · Primer piso EV-52 de la Dirección Nacional de SENATI

## Qué cambió

- **Piso 1:** distribución DIDÁCTICA basada en las dos fotografías del plano de evacuación EV-52 (mayo de 2023). Se aprecian cuatro ambientes superiores, dos ambientes inferiores, un acceso central, un pasillo y dos núcleos de escaleras. **No es una transcripción exacta del plano**; nombres, geometría y medidas son aproximados.
- **20 puestos informáticos** repartidos entre cinco ambientes del piso 1 (4 por ambiente). No se afirma que ese equipamiento exista en el edificio real: es parte del simulador solicitado.
- Puertas interactivas en aulas y accesos a las escaleras; pulsar **E** cerca de una puerta. Se incorporaron colisiones de tabiques para el recorrido.
- **Escaleras 1 y 2** representadas con peldaños, barandas y conexiones de nivel. El modelo de subida/bajada sigue siendo una aproximación de software, no un diseño arquitectónico verificado.
- **Pisos 2 al 6:** conservan la distribución de V6: un salón equipado con 20 computadoras, sillas, alumnos, profesor, ventiladores y señalización por nivel.
- El **simulador DEMO** utiliza los 20 puestos distribuidos en el nuevo primer piso. Las rutas calculadas por el simulador siguen siendo educativas, **no deben utilizarse como rutas de evacuación reales**.
- Se corrigió el modo **Entrar como visitante**: las escenas de demostración se pueden abrir aunque la API responda 401 (sin permiso para ver escenarios privados).

## Instalar en Laragon

1. Haz una copia de seguridad de `C:\laragon\www\piramide_senati_fusion` y de la base `aula3d` antes de reemplazar archivos.
2. Descomprime la carpeta `piramide_senati_fusion` en `C:\laragon\www\` (o en `C:\xampp\htdocs\` si usas XAMPP).
3. Abre **esa carpeta** en VS Code y ejecuta:

   ```powershell
   npm install
   npm run build
   ```

4. Inicia Apache y MySQL en Laragon/XAMPP. Abre `http://localhost/piramide_senati_fusion/login.php` (agrega `:8080` si Apache utiliza ese puerto).
5. Desde el editor, selecciona **Pirámide SENATI** para cargar la nueva distribución y guárdala como **escenario nuevo**. Los escenarios V6 ya guardados conservan sus objetos antiguos y pueden requerir adaptación manual al nuevo primer piso.

## Base de datos

- **No hay tablas nuevas en V7**: si ya instalaste V6 y tus usuarios funcionan, no necesitas importar SQL otra vez.
- Si todavía tienes la estructura antigua de roles, revisa `database/ACTUALIZAR_BD_EXISTENTE.sql` y haz respaldo antes de aplicarlo. No ejecutes `schema.sql` sobre una base con datos que desees conservar.
- Los visitantes sin sesión autenticada solo pueden ver los escenarios de demostración; no pueden leer ni modificar los guardados.

## Referencias y límites

Las fotografías originales se encuentran en `referencias/ev52/` y el módulo de distribución en `src/ev52-layout.js`. Los nombres de aulas (A–F), los 20 puestos y las dimensiones son decisiones de modelado educativo. La información de EV-52 no permite determinar con precisión dimensiones, estructura, puertas o condiciones reales de evacuación.

## Verificaciones

`npm run check` revisa archivos, sintaxis y conexiones básicas del proyecto. La compilación Vite y la visualización WebGL deben probarse en tu equipo; la conexión MySQL depende de tu instalación local.
