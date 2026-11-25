# Pirámide SENATI V11 — atrio central abierto (tragaluz)

## Qué se modificó realmente

La fotografía `referencias/tragaluz_atrio_referencia.jpg` muestra un vacío central de varios niveles, con corredores laterales y un núcleo vertical de hormigón. **V11 modifica el motor 3D**, no reemplaza la escena por una fotografía ni crea un falso agujero con transparencia.

- Planta baja: suelo continuo en el patio interior con núcleo vertical esquemático, como referencia de la fotografía.
- Pisos **2 al 6**: losas cortadas alrededor de un vano central de **12,8 × 6,2 m**, dimensiones estimadas para la maqueta (no medidas de SENATI).
- Azotea: hueco central abierto, sin cubierta de vidrio. No se perforan los techos del ascensor ni de las escaleras.
- Barandas azules con paneles transparentes en los **cuatro lados del vano** de cada nivel superior.
- Colisiones de barandas y del núcleo vertical para el editor y el recorrido.
- El modelo de aulas, dos escaleras y ascensor se conserva. Los pisos superiores siguen siendo interpretaciones didácticas.
- Visor de planta `VISTA_DIMENSIONES_V11.html` con huella del tragaluz y medidas relativas.

## Instalación en Laragon

1. Haz copia de seguridad de `C:\laragon\www\piramide_senati_fusion` **antes de reemplazarla**, y de tu base MySQL `aula3d` si tienes escenarios guardados.
2. Descarga el ZIP completo V11 y descomprímelo en `C:\laragon\www\` (la ruta final debe ser `C:\laragon\www\piramide_senati_fusion\login.php`). Si usas el ZIP de actualización, sobrescribe sobre la V10 existente.
3. Abre PowerShell o la terminal de VS Code dentro de la carpeta del proyecto y ejecuta:

   ```powershell
   npm install
   npm run check
   npm run build
   ```

4. **La compilación es obligatoria** para que el editor 3D, recorrido y simulador carguen; el ZIP contiene el código fuente, pero no los artefactos JS compilados porque este entorno no tiene acceso al registro npm. Si `npm` no se reconoce, instala Node.js LTS.
5. Inicia Apache y MySQL en Laragon. Según tu última captura, **Apache usa puerto 8080**, así que entra a:

   `http://localhost:8080/piramide_senati_fusion/login.php`

   `http://localhost:8080/piramide_senati_fusion/index.php`

   `http://localhost:8080/piramide_senati_fusion/VISTA_DIMENSIONES_V11.html`

6. Inicia sesión, abre el editor y elige **Plantilla Pirámide SENATI**. Pon la vista en **Fachada + plantas** o **Plantas y soportes**, luego gira la cámara hacia el patio interior o abre **Recorrido** y selecciona los niveles 2 a 6.
7. Pulsa **Ctrl + F5** en el navegador para actualizar el contenido antiguo. Los escenarios guardados previamente pueden contener objetos que ahora caen en el hueco, por lo que conviene crear una escena nueva para comprobar la nueva geometría.

**La base de datos no cambia:** no necesitas volver a importar SQL y tus usuarios permanecen en MySQL.

## Validación y límites

`npm run check` verifica sintaxis, módulos, huecos geométricos, superficies de losas, pasillos y relación con núcleos de escaleras y elevador. **La visualización 3D completa aún debe comprobarse en tu navegador con Three.js compilado**, especialmente las rutas de evacuación y escenarios anteriores. El vacío, los corredores y las dimensiones son aproximaciones educativas y no sirven como plano técnico ni para verificar requisitos de seguridad reales.
