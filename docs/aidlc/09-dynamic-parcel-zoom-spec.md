# AI-DLC Spec v0.12.0 · Sincronización Frontend de Zoom Dinámico Continuo (`v7_optimal_zoom`)

## Inception & Elaboration

- Implementa `computeOptimalParcelZoom` en `geoEngineLiveClient.ts` exactamente equivalente al algoritmo del backend (`fillRatio = 0.58`), de modo que cualquier parcela (desde `< 0.5 ha` hasta `> 50 ha`) quede centrada automáticamente con el zoom adecuado a su tamaño.
- Actualiza `computeWaybackTileLayout` para proyectar teselas WMTS a cualquier zoom fraccional y sincroniza el polígono SVG con `activeSnapshot.render_zoom`.

## Verification

- Prueba unitaria en `tests/producerModules.test.ts` verificando el cálculo dinámico de zoom para parcelas chicas, medianas (_Carrizal_) y grandes.
- Build Next.js, ESLint, Prettier y Jest en verde.
