# PIRÁMIDE SENATI V9 — MAQUETA AMPLIADA

## Qué cambia respecto a V8

El edificio conceptual pasa de una planta de referencia de **34 × 20 m a 56 × 38 m** y la altura estándar de cada nivel es **3,8 m**. Las tres magnitudes pueden variarse en el **Editor → Dimensiones → Aplicar dimensiones**. No son mediciones de la sede real de SENATI.

- Se sustituyó el trazado irregular de paredes por **10 ambientes modulares**, 5 arriba y 5 abajo. Los accesos comunican con zonas comunes libres de muros transversales.
- Hay **2 núcleos de escalera** con huecos en losas superiores y **1 ascensor didáctico** de traslado instantáneo entre pisos, accesible con la tecla **E** durante el recorrido. NO es un simulador de ascensor real.
- El escenario conserva **6 plantas**, 20 estaciones educativas por nivel en la plantilla y mobiliario a escala humana (no estirado con el edificio).
- Se extendieron los límites, la cámara y la detección de muros para el recorrido con la nueva escala.
- Se incorporó `VISTA_DIMENSIONES_V9.html`: permite previsualizar el ancho/fondo generales y consultar la anchura y profundidad aproximadas de cada sala, el pasadizo, las escaleras y el ascensor. **Es un visor informativo, no guarda el escenario ni modifica la maqueta 3D.**

### Dimensiones orientativas de la plantilla 56 × 38 m

| Elemento | Aproximación |
|---|---|
| Edificio/conjunto nominal | 56 × 38 m |
| Altura por planta | 3,80 m |
| Aula tipo N3 | ~6,14 × 8,16 m |
| Pasadizo señalado | ~3,23 m de ancho |
| Núcleo de escalera | ~3,62 × 7,64 m |
| Hueco de ascensor | ~2,40 × 2,53 m |

Estas dimensiones son de **diseño didáctico** y no sustituyen planos arquitectónicos, mediciones, accesibilidad legal, normas contra incendios ni recorridos de evacuación certificados. La fotografía/croquis de la primera planta carece de cotas verificables y las plantas 2–6 son propuestas esquemáticas.

## Instalar V9 en Laragon (Windows)

### Opción 1 — Proyecto completo

1. Copiar el ZIP completo extraído dejando la carpeta `piramide_senati_fusion` dentro de `C:\laragon\www\`.
2. Abrir una consola en `C:\laragon\www\piramide_senati_fusion`.
3. Ejecutar `npm install`, `npm run check` y `npm run build` con Node.js LTS instalado. Node se necesita para compilar Three.js/Vite; no sustituye Apache/MySQL.
4. Iniciar Apache y MySQL en Laragon. Abrir `http://localhost/piramide_senati_fusion/login.php`.
5. La base de datos `aula3d` que ya estaba instalada en V7/V8 **no necesita volverse a importar**. Guardar antes una copia de seguridad de la BD y de la carpeta del proyecto.

### Opción 2 — Actualizar V8 instalada

1. Hacer copia de seguridad de la carpeta y de MySQL antes de cambiar archivos.
2. Descomprimir el ZIP **Solo actualización V9** dentro de `C:\laragon\www\` (la estructura del ZIP incluye la carpeta `piramide_senati_fusion`; evitar una subcarpeta anidada de igual nombre).
3. Aceptar sobrescribir los archivos de programa.
4. En la carpeta del proyecto ejecutar `npm install`, `npm run check` y `npm run build`.
5. Abrir el editor y hacer clic en **Plantilla Pirámide SENATI** para crear un escenario con la geometría nueva. **Los escenarios antiguos guardados en MySQL no se convierten automáticamente**: sus objetos pueden permanecer distribuidos con las coordenadas anteriores. Si deseas, crea un escenario nuevo y guarda una copia.

### Acceso y herramientas

- **Inicio de sesión:** `http://localhost/piramide_senati_fusion/login.php`
- **Editor 3D:** `http://localhost/piramide_senati_fusion/index.php`
- **Recorrido:** `http://localhost/piramide_senati_fusion/recorrer.php`
- **Visor de dimensiones:** `http://localhost/piramide_senati_fusion/VISTA_DIMENSIONES_V9.html`

**Si aparece la cabecera `Server: Microsoft-IIS/10.0` o un 404:** otro servidor puede estar ocupando el puerto 80; resuelve ese conflicto para que `localhost` sirva `C:\laragon\www` por Apache de Laragon.

## Verificación

`npm run check` valida referencias de archivos, controles, sintaxis Javascript y reglas geométricas de V9. `npm run build` crea `public/assets` o el destino de Vite según la configuración. En el entorno de preparación de V9 no se pudo instalar Three.js/Vite a través del registro de npm por falta de red; ejecutar la instalación y compilación en el equipo local.
