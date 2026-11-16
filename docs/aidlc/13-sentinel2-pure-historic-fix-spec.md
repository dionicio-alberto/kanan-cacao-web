# AI-DLC Spec v0.14.0 · Cliente Web 100% Copernicus Sentinel-2 (`v11_sentinel2_pure`)

**Metodología:** AI-Driven Development Life Cycle (AI-DLC) — Iteración `v0.14.0`  
**Rama:** `feature/v11-sentinel2-pure-historic-fix`

---

## 1. Cambios Implementados

- **`InteractiveParcelMapPicker.tsx`:** Estandariza la capa satelital del selector geográfico exclusivamente a **Copernicus Sentinel-2 Cloudless (`s2cloudless-2024_3857`)** sin conmutar a ArcGIS `World_Imagery`.
- **`LiveGeoEnginePanel.tsx` & `geoEngineLiveClient.ts`:** Reemplazan todos los identificadores de respaldo de Esri Wayback (`43291`, `36557`, etc.) por la serie anual **Copernicus Sentinel-2 Cloudless (`s2cloudless-2025_3857` .. `s2cloudless-2019_3857`)**, asegurando consistencia 100 % Sentinel-2 incluso en modo sin conexión o respaldo.

---

## 2. Verificación

- `prettier --check`, `eslint`, `tsc --noEmit`, `jest --runInBand` (**6 suites / 22 pruebas** aprobadas) y `next build` en verde.
- Validación visual en navegador local (`http://localhost:3000`) confirmando imágenes históricas distintas y correspondientes a sus años reales (`2021`–`2026`).
