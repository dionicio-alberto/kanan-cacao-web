# AI-DLC Spec v0.11.0 · Visor Centrado de Parcela y Búsqueda Anti-Nubes a 20 Intentos

## Inception & Elaboration

- Alinea el visor web (`LiveGeoEnginePanel.tsx`) con la nueva generación `v6_centered_20attempts` del Geo-Engine:
  - Sincronización automática del polígono SVG al `render_zoom` centrado (`min(16, base_zoom)`) para que parcelas compactas como _Terreno Carrizal_ se muestren bien centradas y dimensionadas dentro del marco.
  - Indicador transparente cuando, tras hasta **20 intentos** hacia atrás en días, se elige la toma con menor nubosidad disponible en la temporada.

## Verification

- Verificación de tipos, linter ESLint, suite Jest y compilación Next.js sin errores.
- Validación visual en dev local y producción con las capturas `v6_centered_20attempts`.
