# AI-DLC Spec v0.10.0 · Marca Kanan Cacao, Selector de Mapas Limpio y Panel de Roles Admin

## Inception & Elaboration

1. **Mapa de Selección de Parcela Limpio:**
   - En `InteractiveParcelMapPicker.tsx`, solo se conservan dos opciones de mapa base: **Mapa Satelital** y **Mapa de Calles y Caminos**, eliminando cualquier etiqueta o mención técnica de "Open Source" o capas adicionales innecesarias para el productor.
2. **Integración Oficial del Logo Kanan Cacao:**
   - Activos SVG/PNG copiados en `public/brand/` (`kanan-cacao-icon.svg` y `src/app/icon.svg` derivados de `kakan-cacao-without-text-correct.svg`, `kanan-cacao-logo.svg` y `kanan-cacao-logo.png`).
   - Los iconos pequeños y logos de barra superior (`ProducerTopNav.tsx`, header de `PublicLandingAndLogin.tsx` y favicon en `layout.tsx`) utilizan `kanan-cacao-icon.svg` (versión sin texto) en proporción cuadrada estricta `1:1`; la tarjeta principal muestra el emblema completo `kanan-cacao-logo.svg` también en proporción `1:1`.
3. **Visibilidad Estricta para Admin y Panel de Control de Roles:**
   - La opción para modificar la fecha de registro (con confirmación escrita `"confirmar"`) se muestra exclusivamente cuando el operador autenticado tiene rol `admin_astra`; para cualquier otro perfil solo se muestra la fecha de registro en formato `DD/MM/AAAA` sin botones ni pistas de edición.
   - Se incorpora la sección **Panel Admin** (visible únicamente para `admin_astra`) con:
     - Listado de perfiles registrados y cambio de rol por persona.
     - Editor de definiciones y permisos de cada rol existente y alta de nuevos roles personalizados.
4. **Visor Satelital Exacto (`v5_days_margin`):**
   - Muestra exactamente los 7 periodos (`Última foto al registro`, `Hace 6 meses`, `Hace 1 año`, `Hace 2 años`, `Hace 3 años`, `Hace 4 años`, `Hace 5 años`) con sus fechas reales `DD/MM/AAAA` y sincroniza el polígono SVG con el `render_zoom` devuelto por el backend.
