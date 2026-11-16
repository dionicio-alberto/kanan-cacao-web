# AI-DLC Spec v0.14.1 · Sincronización de Zoom Óptimo Variable y Visor Full HD Sentinel-2

**Metodología:** AI-Driven Development Life Cycle (AI-DLC) — Iteración `v0.14.1`  
**Rama:** `feature/v12-optimal-zoom-s2-hd`

---

## 1. Alcance Frontend (`kanan-cacao-web`)

- `LiveGeoEnginePanel.tsx` consume el `render_zoom` exacto dinámico emitido por el motor (`16.94` en _Test Terreno_, `17.07` en _Carrizal_, etc., sin límite artificial `15.65`), manteniendo el polígono SVG centrado al sub-píxel ocupando ~58 % del eje limitante sin importar el tamaño en hectáreas.
- Renderiza las capturas `1520×840` (`s2v12_...jpg`) con alta definición óptica preservando las 7 fechas históricas reales de **Copernicus Sentinel-2 L2A**.
