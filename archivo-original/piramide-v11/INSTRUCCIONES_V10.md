# Pirámide SENATI V10 · corrección de geometría y proporciones

## Qué se corrigió

- V9 utilizaba `root.scale.set(width/34, 1, depth/20)`, que estiraba horizontalmente la **escena completa**. Las ventanas, puertas, carteles y peldaños se deformaban de forma visible.
- V10 ya no escala el contenedor 3D. El edificio se construye con posiciones/dimensiones en **metros de maqueta** y las dimensiones de puertas/peldaños se mantienen a escala humana.
- Fachada paramétrica; diez ambientes por planta, dos escaleras, ascensor, losas con huecos; colisiones y puestos compatibles con el recorrido y el editor.
- Mismo esquema de posiciones para los seis pisos; NO son planos reales de las plantas superiores.

## Medidas orientativas por defecto

- Planta general aproximada: **56 × 38 m**.
- Altura entre pisos: **3,80 m** (6 niveles).
- Ancho típico de pasadizo: **3,23 m**.
- Hueco de ascensor: aprox. **2,4 × 2,5 m**.
- Escaleras: aprox. **3,6 × 7,6 m**.
- Puertas de aulas: **1,36 × 2,40 m** (hojas del modelo).

Las medidas se asignaron para una **maqueta didáctica**, sin levantamiento topográfico ni validación estructural.

## Instalación en Laragon

1. Haz copia de seguridad de `C:\laragon\www\piramide_senati_fusion` y de tu base MySQL `aula3d`.
2. Extrae el ZIP completo en `C:\laragon\www` o el ZIP de actualización sobre la carpeta existente. Comprueba que no haya una subcarpeta duplicada.
3. Abre PowerShell en `C:\laragon\www\piramide_senati_fusion` y ejecuta `npm install`, `npm run check`, `npm run build`.
4. Comprueba que Apache es el servidor que atiende `localhost`, no IIS (Microsoft-IIS).
5. Abre `http://localhost/piramide_senati_fusion/login.php`. Después ve al editor y selecciona una escena de demostración nueva (en escenas guardadas todavía pueden verse muebles o medidas previas).
6. Visor actualizado: `http://localhost/piramide_senati_fusion/VISTA_DIMENSIONES_V10.html`.
7. Fuerza recarga con Ctrl+F5 si ves la versión anterior. No necesitas reimportar la BD.

## Alcance de la validación

Se revisaron las relaciones geométricas, cálculos de dimensiones y la sintaxis del proyecto. No se pudo compilar/renderizar en un navegador aquí porque el registro npm no está disponible en este entorno; se recomienda probar editor, recorrido, escaleras, ascensor, guardar/cargar y simulación en Laragon.
