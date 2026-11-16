# Especificación AI-DLC · Estandarización Soberana en Constelación Copernicus Sentinel

**Empresa / Titular:** ASTRA (Agrotecnología y Servicios de Transformación en Recursos Agrícolas de México S.A.S.)  
**Framework:** **AI-Driven Development Life Cycle (AI-DLC)**  
**Módulos impactados:** `kanan-cacao-geo-engine` (`satellite_audit_engine.py`, `routes_spatial.py`), `kanan-cacao-web` (`InteractiveParcelMapPicker.tsx`, `sustainabilityAdminService.ts`, `geoEngineLiveClient.ts`)  
**Fecha:** `16/11/2026`  
**Versión:** `v0.13.2`  
**Estado:** **Construido y Verificado**

---

## 1. Fase I — Inception & Directiva de Arquitectura

### 1.1 Solicitud del Usuario vía Telegram

> _"Por favor, para todas las imágenes satelitales usa las imágenes satelitales de los satélites sentinel, que pasa más seguido y es gratis."_

### 1.2 Justificación Técnica, Operativa y Económica

1. **Frecuencia Temporal Crítica (Revisita cada 5 días):**
   - La constelación **Copernicus Sentinel-2** (satélites gemelos Sentinel-2A y Sentinel-2B en órbita heliosincrónica de la Agencia Espacial Europea / Unión Europea) sobrevuela la región productora de Tabasco y Chiapas **cada 5 días**.
   - En contraste, los vuelos y satélites comerciales de alta resolución (Maxar WorldView, GeoEye) integrados en catálogos cerrados como Esri Wayback o mosaicos de Google Maps pasan de forma aperiódica (frecuentemente espaciados entre 2 y 4 años en zonas rurales, o con únicamente 2 vuelos registrados en toda la historia de Comalcalco).
2. **Acceso 100% Libre, Abierto y Gratuito (Open Data Policy):**
   - Toda la información del programa Copernicus está regida por la política de datos abiertos de la Unión Europea: sin licencias comerciales restrictivas, sin costos de suscripción por gigabyte ni llaves propietarias con límites de cuota.
   - Disponible mediante catálogos abiertos STAC sin egress cost (Microsoft Planetary Computer `sentinel-2-l2a`, AWS Earth Search de Element84, Copernicus Data Space Ecosystem y EOX Sentinel-2 Cloudless).
3. **Consistencia Espectral y Cero "Efecto Fondo Fijo":**
   - Anteriormente, al buscar una apariencia submétrica artificial, el motor fusionaba el color de Sentinel-2 sobre una fotografía base fija de Google Maps / Wayback, provocando que los caminos y árboles permanecieran idénticos entre diferentes años.
   - Con la estandarización soberana a Sentinel-2, **cada toma histórica es una captura satelital real y auténtica de esa fecha**, reflejando la evolución verídica del dosel, deforestación y humedad del suelo.

---

## 2. Fase II — Construcción e Implementación

### 2.1 Cambios en `kanan-cacao-geo-engine` (`satellite_audit_engine.py`)

1. **Prioridad 1 Soberana en Horizontes (`_select_captures_with_days_margin`):**
   - Para cada uno de los 7 horizontes temporales (`registro_actual`, `hace_6_meses`, `hace_1_anio`, `hace_2_anios`, `hace_3_anios`, `hace_4_anios`, `hace_5_anios`), el motor consulta directamente escenas de **Copernicus Sentinel-2 L2A** en el catálogo STAC abierto (`collection=sentinel-2-l2a`).
   - El renderizado genera la escena real con escalado bicúbico y realce de nitidez radiométrica cacao-track (`_render_mpc_sentinel2_bicubic`), sin superposición sobre fondos comerciales estáticos.
2. **Prioridad 2 (Histórico Anual / Cobertura):**
   - Coberturas anuales libres de nubes basadas en **Copernicus Sentinel-2 Cloudless (EOX ESA)** para años anteriores donde el STAC requiera suplemento.
3. **Metadatos y Etiquetas Honestas:**
   - Atributo `"sensor": "Copernicus Sentinel-2 L2A"`.
   - Etiqueta `"resolution_label": "Copernicus Sentinel-2 L2A (10 m/px nativo · Libre y Gratuito · Revisit 5 días)"`.
   - Versión de filtro: `v10_sentinel2_standard`.

### 2.2 Cambios en `kanan-cacao-web`

1. **Visor Interactivo de Georreferenciación (`InteractiveParcelMapPicker.tsx`):**
   - Capa satelital configurada para consumir directamente las teselas abiertas de **Copernicus Sentinel-2 Cloudless (EOX)** (`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg`).
   - Botón de capa actualizado con icono y texto claro: **`🛰️ Satélite Sentinel-2`**.
2. **Modelo de Datos y Tipos (`sustainabilityAdminService.ts`):**
   - Extensión de la interfaz `HistoricalParcelSnapshot` con el campo `sensor?: string`.

---

## 3. Fase III — Verificación y Validación

- **Geo-Engine (Python / Pytest):** 18/18 pruebas pasadas (`test_spatial_and_satellite.py`, `test_custody_epcis.py`, `test_local_persistence.py`, `test_health.py`).
- **Web (TypeScript / Jest):** 22/22 pruebas pasadas en 6 suites (`npm test -- --runInBand`).
- **Build de Producción:** Next.js `npm run build` ejecutado exitosamente con 5/5 páginas estáticas generadas sin errores.
