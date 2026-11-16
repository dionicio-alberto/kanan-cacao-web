# Especificación AI-DLC · Indicador de Carga en Georreferenciación y Análisis Multitemporal Satelital

**Empresa / Titular:** ASTRA (Agrotecnología y Servicios de Transformación en Recursos Agrícolas de México S.A.S.)  
**Framework:** **AI-Driven Development Life Cycle (AI-DLC)**  
**Módulos impactados:** `kanan-cacao-web` (Componente `ParcelsAndGeorefModule`, `globals.css`, `tests/producerModules.test.ts`) & `kanan-cacao-geo-engine` (Diagnóstico `satellite_audit_engine`)  
**Fecha:** `16/11/2026`  
**Versión:** `v0.13.1`  
**Estado:** **Construido y Verificado**

---

## 1. Fase I — Inception & Elaboration (Planteamiento del Problema)

### 1.1 Solicitud del Usuario

1. **Feedback Visual en Guardado de Parcela:** Al crear una nueva parcela y dar clic en "Guardar nueva parcela", el botón cambiaba el texto a _"Guardando georreferencia..."_, pero no mostraba ningún spinner, animación ni indicador de progreso, dejando al usuario con incertidumbre de si el sistema estaba procesando.
2. **Auditoría de Multitemporalidad en Parcela "Test Terreno":** El usuario reportó que las fotografías satelitales históricas de la parcela _"Test Terreno"_ parecían ser la misma imagen de base con diferentes nubes superpuestas sin cambios de terreno en el tiempo.

### 1.2 Diagnóstico Técnico Profundo de la Parcela "Test Terreno"

- **Identificador en BD Supabase:** `7cb22346-5d5e-4cdd-a650-f5e2c68817d4`
- **Municipio:** Comalcalco, Tabasco (`18.174861, -93.345447`, 3.71 ha).
- **Causa Raíz de la Imagen Repetida:**
  1. En la versión `v0.13.0` (`v8_hd_1520` / `v9_cacaotrack_hd`), el motor utiliza un algoritmo de fusión pan-sharpened (`fuse_sentinel2_with_submeter_detail`) que combina:
     - Una placa espacial de **alta resolución submétrica (30–50 cm/px)** proveniente de Google Maps (`google:mt1`) o Esri Wayback.
     - Datos espectrales/color fechados de **Sentinel-2 L2A (10 m/px)**.
  2. En `_render_hd_pansharpened_sentinel2`:
     - Para horizontes $\le 18$ meses (`registro_actual`, `hace_6_meses`, `hace_1_anio`), la placa base es `google:mt1`, la cual es un mosaico **estático** sin histórico.
     - Para horizontes $> 18$ meses (`hace_2_anios`, `hace_3_anios`, `hace_4_anios`, `hace_5_anios`), el catálogo de Esri Wayback en ese punto exacto de Comalcalco **únicamente cuenta con 2 vuelos históricos en toda su base de datos**: liberación `49059` (30/04/2022) y `17825` (24/03/2021).
     - El motor asignó la liberación `49059` a 2024, 2023 y 2022 por proximidad.
  3. Sentinel-2 L2A se inyecta aplicando un desenfoque Gaussiano de radio 12 para extraer únicamente el delta de color/vegetación y nubes.
  4. **Comprobación Matemática de Píxeles:**
     - La correlación de píxeles entre _Hace 3 años (2023)_ y _Hace 5 años (2021)_ es de **0.9681**, con una diferencia promedio de solo **4.18 sobre 255 niveles**.
     - La correlación entre 2024 y 2023 es de **0.9457** (diferencia de 5.39/255).
     - **Conclusión técnica:** La observación del usuario es **100% exacta**: la textura espacial de copas de árboles y caminos es idéntica porque la fotografía submétrica base es la misma, y lo único que varía cuadro a cuadro son las nubes y el matiz espectral de Sentinel-2.

---

## 2. Fase II — Construction (Implementación del Indicador de Carga)

### 2.1 Cambios en `src/app/globals.css`

- Incorporación de animaciones estándar `@keyframes spin` y `@keyframes pulse`.
- Clase utilitaria `.spinner` con `border-top-color: currentColor` para heredar el contraste del botón primario.

### 2.2 Cambios en `src/components/modules/ParcelsAndGeorefModule.tsx`

- **Bloqueo de formulario (`disabled={savingGeoref}`):**
  - Campos de entrada (`parcelName`, `producerName`, `municipality`, `areaHectares`).
  - Botones de método de captura (`MAPA_INTERACTIVO`, `CENTRO_GPS`, `ESQUINAS`).
  - Campos de coordenadas GPS y textarea de esquinas.
  - Botón "Cancelar".
- **Botón de acción con Spinner animado y Accesibilidad:**
  - `disabled={savingGeoref}`
  - `aria-busy={savingGeoref}`
  - Ícono circular `.spinner` animado giratorio.
  - Texto contextual: `"Guardando georreferencia..."`.
- **Tarjeta de Estado Informativa Visible:**
  - Banner en contenedor verde suave con borde verde primario (`T.colors.primaryGreen`).
  - Spinner de 22px + mensaje explicativo: _"Sincronizando coordenadas del polígono, consultando satélites y generando la ficha histórica. Por favor espera un momento sin cerrar esta pantalla."_
  - Barra de progreso con animación de pulso continuo.

---

## 3. Fase III — Transition & Verification

### 3.1 Pruebas Automatizadas

- Se incorporó la prueba unitaria en `tests/producerModules.test.ts`:
  - `valida retroalimentación visual de guardado accesible en georreferenciación (R-32, R-39)`
- Ejecución completa de Jest: **6 suites pasadas, 22 pruebas pasadas (100% verde)**.
- Typecheck estricto TypeScript: **0 errores**.
- Linter ESLint: **0 advertencias**.
- Build de producción Next.js (`npm run build`): **5/5 páginas estáticas generadas exitosamente**.

### 3.2 Cronograma de Actualizaciones Satelitales (Para el Usuario)

1. **Frecuencia de Sobrevuelo:**
   - La constelación Sentinel-2 (Copernicus ESA) sobrevuela Comalcalco, Tabasco **cada 5 días** con una resolución nativa de 10 m por píxel.
   - Las escenas L2A son procesadas y catalogadas en Microsoft Planetary Computer / Copernicus entre **4 y 12 horas** después de la captura satelital.
2. **Ventana de Consulta en la Plataforma:**
   - Durante la temporada de lluvias (junio a noviembre), la cobertura de nubes en Tabasco suele ser de 60% a 90%; en promedio, se obtiene una toma nítida (<20% nubes) cada 2 a 3 semanas.
   - En la ficha de la parcela, el administrador o productor puede ver la fecha exacta de cada toma en el visor (`DD/MM/AAAA`) y el porcentaje de nubes detectado.
