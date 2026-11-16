# AI-DLC Spec v0.14.2 · Capturas Satelitales Puras Copernicus Sentinel-2 sin Filtros (`v13_s2_pure_quality`)

**Metodología:** AI-Driven Development Life Cycle (AI-DLC) — Iteración `v0.14.2`  
**Rama:** `feature/v13-pure-sentinel2-quality`

---

## 1. Alcance (`kanan-cacao-web`)

- Sincronización con el motor `v13_s2_pure_quality` (`s2v13_...jpg`), presentando en `LiveGeoEnginePanel.tsx` únicamente capturas reales y puras de **Copernicus Sentinel-2 L2A** sin superposición ni filtros de mosaicos estáticos, con el polígono SVG centrado al sub-píxel (`render_zoom` 1x alineado con `rz_canvas = render_zoom + 1.0` en `1520×840`) y 7 fechas despejadas reales cercanas a cada corte histórico.
