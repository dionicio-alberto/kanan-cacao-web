# Kanan Cacao Web — Especificación AI-DLC `v0.8.0`: Precisión Temporal en Satélite y Homologación Global `DD/MM/AAAA`

**Metodología:** AI-Driven Development Life Cycle (AI-DLC) — Iteración `v0.8.0`  
**Ramas:**

- `kanan-cacao-geo-engine`: `feature/date-accurate-mpc-and-ddmmyyyy` -> `develop` -> `main`
- `kanan-cacao-web`: `feature/ddmmyyyy-and-accurate-horizon-dates` -> `develop` -> `main`

---

## 1. Intención y Criterios de Aceptación (Inception)

1. **Alineación real con fecha de registro y ventanas de 6 meses a 5 años:**
   - Para parcelas registradas en noviembre 2026 (como _Terreno Carrizal_), _Última foto al registro_ debe corresponder a una captura despejada reciente (noviembre 2026 via Copernicus Sentinel-2 L2A), _Hace 6 meses_ a ~mayo 2026 y _Hace 5 años_ a **2021** (nunca retrocediendo hasta 2013).
2. **Homologación total del formato de fechas visibles (`DD/MM/AAAA`, ej. `15/11/1998`):**
   - Función pura única y reutilizable `formatDisplayDateEs` en `src/services/producerLogbookService.ts` + `formatSnapshotLabelEs`.
   - Aplicada de forma uniforme en:
     - Botones y subtítulos de fotografías satelitales (`LiveGeoEnginePanel.tsx`).
     - Ficha general de la parcela y lista de documentos legales (`ParcelsAndGeorefModule.tsx`).
     - Registros de bitácora (`FieldLogbookModule.tsx`) y tabla de cosechas/acopio (`HarvestAndAcopioModule.tsx`).
     - Respuestas de respaldo en `geoEngineLiveClient.ts`.
3. **Respeto estricto a arquitectura modular AI-DLC y verificación end-to-end:**
   - Lógica de formateo y secuencia aislada en capa de servicios y validada con pruebas unitarias antes de construir, probar en `dev` local (`127.0.0.1:8080` + `localhost:3000`) y promover hacia producción (`main`).
