# Pirámide SENATI 3D — Versión V9, escala ampliada

**Empieza por [INSTRUCCIONES_V9.md](INSTRUCCIONES_V9.md).** Esta versión sustituye las paredes confusas de V8 por una planta de 10 ambientes con accesos, un pasadizo y vestíbulo, dos escaleras y un ascensor didáctico de navegación. Tamaño de maqueta inicial **56 × 38 m**, seis pisos de **3,8 m** cada uno, adaptables desde el editor. Conoce las medidas de cada espacio en [VISTA_DIMENSIONES_V9.html](VISTA_DIMENSIONES_V9.html) usando el servidor local.

**Aviso:** es una maqueta conceptual realizada a partir de referencias visuales. No se trata de un levantamiento real, planos constructivos, cálculo estructural ni plano oficial de evacuación de SENATI. Los pisos 2–6 son una propuesta didáctica de distribución y no están documentados en el croquis aportado.

---

# V7 · Primer piso EV-52 (referencial)

**Lee primero [INSTRUCCIONES_V7.md](INSTRUCCIONES_V7.md).** El primer piso sigue una interpretación del plano EV-52 aportado en fotografías; los pisos 2–6 se conservan como aulas equipadas. Se incluyen las dos fotos en `referencias/ev52/`. La planta y las escaleras no son planos estructurales ni rutas de evacuación certificadas.

---

# Versión 5 · Aulas, simulador sin escenarios guardados e interfaces mejoradas

**Empieza por [INSTRUCCIONES_V5.md](INSTRUCCIONES_V5.md).** Incluye la instalación, controles y las limitaciones de las pruebas.

---

# V4 — Autenticación, 6 pisos y recorrido mejorado

**Lee primero `INSTRUCCIONES_V4.md`**. Acceso mediante `login.php`/`registro.php`, vista de usuario `recorrer.php`, permisos en `admin.php`. El primer usuario registrado **desde localhost** es administrador y no hay contraseñas por defecto. Para instalaciones existentes importa `database/usuarios.sql`, sin borrar tus escenarios. Compila el frontend con `npm install` y `npm run build`.

El modelo y las escaleras son aproximaciones educativas, no un plano estructural certificado.

---

# DIRECCIÓN NACIONAL SENATI · PROYECTO FUSIONADO 3D

Versión de integración: 2.0.0. Integra el editor de escenarios 3D PHP/MySQL y el modelo exterior de la Dirección Nacional SENATI. Diseñado para ejecutarse localmente en Laragon o XAMPP con Node.js instalado.

## Contenido

- **Plantilla «Pirámide · Dirección Nacional»**: recreación exterior 3D basada en dos fotografías suministradas. Ventanales, franjas, torre lateral, soportes inclinados, cartel SENATI, marquesina y entrada. NO es un plano arquitectónico o estructural certificado; alturas y plantas son aproximadas.
- Tres modos de visualización: fachada, fachada transparente con losas y vista esquemática de plantas y soportes.
- 5 plantas iniciales indicativas, ajustables hasta 6. Selector del piso de trabajo para colocar muebles, personas y señalización. Recorre las plantas con PageUp / PageDown en primera persona (cambio de planta didáctico, NO escalera o ascensor real).
- Conserva las plantillas originales: **Aula SENATI 24 estaciones**, edificio genérico de dos pisos y escenario vacío.
- Editar objetos: arrastrar, rotar, duplicar, escalar, renombrar, eliminar y personalizar pantallas; personas estilizadas con ropa SENATI.
- Guardar y cargar escenarios con PHP + MySQL. Hay **versiones de respaldo** antes de reemplazar un escenario, con botón «Versiones» para recuperarlas.
- Simulador de incendios, sismos, accidentes y riesgo eléctrico: A*, rutas, alarmas, registro de movimiento, pausa, reinicio y **guardado de resultados en MySQL**. En la Pirámide se simula **solo la planta baja** (sin datos estructurales o rutas verificadas). La plantilla genérica de dos pisos mantiene la simulación con escalera.
- El proyecto original de Pirámide exterior V1 se conserva como referencia dentro del ZIP como `referencias/modelo_exterior_original_V1.zip`.

## Requisitos

- Laragon o XAMPP con Apache + PHP 8.1+ y MySQL/MariaDB; PDO MySQL activado.
- Node.js LTS (para compilar el frontend Vite/Three.js). `npm install` requiere internet al instalar por primera vez.
- Chrome / Edge con WebGL y aceleración de hardware.

## Pasos en Laragon

1. Extrae este ZIP. Copia la carpeta `piramide_senati_fusion` a `C:\laragon\www\piramide_senati_fusion` (o usa `INSTALAR_LARAGON.bat` desde el ZIP extraído).
2. Abre `C:\laragon\www\piramide_senati_fusion` con VS Code, luego **Terminal > Nueva terminal**.
3. Ejecuta **exactamente dentro de esa carpeta**:

   ```powershell
   npm install
   npm run build
   ```

   Comprueba que se crean `public/assets/editor.js`, `public/assets/simulator.js` y `public/assets/editor.css`. Si prefieres, ejecuta `COMPILAR-FRONTEND.bat`.
4. Inicia Apache y MySQL en Laragon. En phpMyAdmin importa `database/schema.sql` (solo una vez). La base por defecto se llama **aula3d**.
5. Abre `http://localhost/piramide_senati_fusion/` o `http://localhost:8080/piramide_senati_fusion/` según tu puerto Apache.
6. Si falla, abre `http://localhost/piramide_senati_fusion/diagnostico.php` (o añade `:8080`).

## Pasos en XAMPP

Copia `piramide_senati_fusion` en `C:\xampp\htdocs`, ejecuta el mismo proceso `npm install` y `npm run build`, inicia Apache y MySQL e importa `database/schema.sql` en phpMyAdmin. También puedes ejecutar `INSTALAR_XAMPP.bat` desde la carpeta extraída.

## Si ya tenías la base de datos aula3d

**NO borres ni reimportes la base desde cero.** Ejecuta en phpMyAdmin solo `database/ACTUALIZAR_BD_EXISTENTE.sql` para añadir la tabla de versiones. Si guardaste escenarios anteriores, permanecerán en MySQL.

## Uso

- Al abrir, se carga la plantilla Pirámide. Se puede cambiar por **Aula SENATI**, **Edificio 2 pisos** o **Escenario vacío** en «Escenarios».
- Editor: panel izquierdo > biblioteca, arrastrar un objeto a la vista. Seleccionar > «Propiedades» para mover, rotar, cambiar escala. Panel derecho para pisos, texturas y modo de fachada.
- Primera persona: botón «Recorrer», usa WASD y ratón, Shift corre, ESC sale; en la Pirámide PageUp / PageDown cambia el piso esquemático.
- Para guardar, pulsa «Guardar». La versión previa de cada guardado se conserva en la BD. «Versiones» permite restaurarla.
- Para emergencias, **primero guarda el escenario** en MySQL y abre «Simulador». La evacuación es un modelo didáctico, NO un cálculo de seguridad profesional.

## Seguridad y privacidad

La API PHP permite acceso **solo desde localhost** por defecto y exige token CSRF para operaciones POST. No se proporciona autenticación multiusuario; **no publiques este proyecto en Internet** sin añadir un inicio de sesión seguro, permisos y revisión de seguridad. El proyecto NO tiene conexión con la BD institucional de SENATI y NO pide credenciales SENATI.

## Limitaciones y fidelidad

Las fotos aportadas muestran la fachada y parte del entorno, no planos de planta, vías de evacuación verificadas ni estructura portante real. **No utilices los niveles, soportes o escaleras esquemáticas para proyectos constructivos o decisiones de seguridad.** Es una reconstrucción educativa que puede refinarse con planos oficiales y otras fotografías.

## Archivos principales

- `index.php`: Editor web PHP.
- `src/editor.js`, `src/piramide-senati.js`, `src/scene-models.js`, `src/editor.css`: Editor y edificio.
- `simulador.php`, `src/simulator.js`, `src/navigation.js`: Simulación educativa.
- `api/scenarios.php`, `config/database.php`: API PHP/MySQL.
- `database/schema.sql`, `database/ACTUALIZAR_BD_EXISTENTE.sql`: SQL.
- `api/simulations.php`, `simulation_runs`, `simulation_events`: guardar y consultar resultados de simulaciones.
- `referencias/`: fotografías proporcionadas.
- `public/assets/`: archivos generados por `npm run build` (no vienen compilados por limitaciones del entorno donde se preparó este ZIP).


V10: las medidas de planta se construyen en metros sin estirar el grupo 3D; se conserva la base MySQL y el flujo de registro/inicio de sesión.
