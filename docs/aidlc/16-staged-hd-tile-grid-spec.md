# AI-DLC Spec v0.14.3 · Cuadrícula Satelital en Alta Definición tras Selección Temporal (`v14_s2_staged_hd_grid`)

**Metodología:** AI-Driven Development Life Cycle (AI-DLC) — Iteración `v0.14.3`  
**Rama:** `feature/v14-staged-hd-tile-grid`

---

## 1. Alcance (`kanan-cacao-web`)

- Sincronización con el pipeline en 2 etapas `v14_s2_staged_hd_grid` (`s2v14_...jpg`): una vez calculada y seleccionada la fecha/escena despejada de **Copernicus Sentinel-2 L2A**, el visor muestra el mosaico unido por cuadrículas `z=16@2x` (`512×512`, `reproject=cubic_spline`) + deconvolución PSF y pan-sharpening de luminancia adaptativa en **Full HD `1520×840`** (`sharpness_g1 >= 7.0`).
