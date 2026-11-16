# AI-DLC Spec v0.13.0 · Visor Satelital Full HD (`1520×840`) y Consolidación de Estado AI-DLC

**Metodología:** AI-Driven Development Life Cycle (AI-DLC) — Iteración `v0.13.0`  
**Rama de trabajo:** `feature/v8-hd-1520-and-aidlc-status`

---

## 1. Inception & Elaboration

1. **Problema:** En pantallas modernas e inspectores de alta densidad, las miniaturas satelitales anteriores de Sentinel-2 a zoom de parcela se mostraban pixeladas al estirarse sobre el contenedor principal del visor (`aspect-ratio: 760 / 420`).
2. **Solución modular en Frontend (`kanan-cacao-web`):**
   - Extiende el contrato `HistoricalParcelSnapshot` en `src/services/sustainabilityAdminService.ts` con `image_width?: number` e `image_height?: number` para reflejar los cuadros **1520×840 (2x Full HD Retina)** ensamblados por el backend (`v9_cacaotrack_hd`, adoptando los orígenes HD `mt1.google.com/vt/lyrs=s`, `World_Imagery`, Esri Wayback `cacao-track` y el realce Unsharp 3×3).
   - Mantiene sincronizada la geometría SVG de superposición sobre `viewBox="0 0 760 420"` usando el campo normalizado `activeSnapshot.render_zoom` calculado por `computeOptimalParcelZoom`, logrando precisión sub-píxel sin importar el tamaño del polígono.
   - Muestra automáticamente `resolution_label` (`Full HD 1520×840 px · Pan-Sharpened (<1 m/px) + Sentinel-2 L2A`) y confirma almacenamiento en CDN (`Almacenada en servidor CDN`) sin descargas repetitivas por clic.

---

## 2. Verification & Evidence

- **Compuertas de código:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` en verde.
- **Validación visual en navegador local (`http://localhost:3000`):** Inspección directa mediante subagente de navegador sobre _Terreno Carrizal_ confirmando carga de imágenes reales `naturalWidth = 1520`, `naturalHeight = 840`, definición nítida de árboles/caminos/linderos y centrado geométrico exacto del polígono verde.
