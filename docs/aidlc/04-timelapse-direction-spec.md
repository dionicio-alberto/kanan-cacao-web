# Kanan Cacao — Especificación AI-DLC `v0.7.1`: Control Modular de Dirección en Secuencia Satelital (Adelante / Atrás)

**Metodología:** AI-Driven Development Life Cycle (AI-DLC) — Iteración `v0.7.1`  
**Rama:** `feature/timelapse-sequence-direction` -> `develop` -> `main`  
**Repositorio:** `kanan-cacao-web`

---

## 1. Intención y Regla Modular AI-DLC

1. Permitir al usuario elegir explícitamente si la reproducción automática de fotografías satelitales avanza **hacia adelante en el tiempo** (de hace 5 años hacia la fecha de registro) o **hacia atrás en el tiempo** (de la fecha de registro hacia hace 5 años).
2. Respetar la arquitectura modular separando:
   - **Capa de Dominio/Servicio (`src/services/producerLogbookService.ts`):** Funciones puras `getOrderedTimelapsePeriodKeys` y `getNextTimelapsePeriodKey` tipadas con `TimelapseDirection = 'forward' | 'backward'`.
   - **Capa de Presentación (`src/components/LiveGeoEnginePanel.tsx`):** Selector accesible `#timelapse-direction-select` integrado en la barra de controles del visor satelital.
   - **Verificación (`tests/producerModules.test.ts`):** Pruebas unitarias sobre ordenamiento y avance cíclico en ambas direcciones.
