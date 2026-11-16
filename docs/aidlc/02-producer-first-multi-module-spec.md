# Kanan Cacao — Especificación AI-DLC: Portal Web Centrado en el Productor y Seguridad Estricta

**Metodología:** AI-Driven Development Life Cycle (AI-DLC) — Iteración Evolución Web (`v0.3.0`)  
**Rama:** `feature/producer-portal-and-strict-auth` -> `develop` -> `main`  
**Repositorios conectados:** `kanan-cacao-web` (Next.js en Vercel), `kanan-cacao-geo-engine` (FastAPI en Railway) y Supabase Auth/PostGIS.

---

## 1. Intención y Principios de Rediseño (Inception)

1. **Seguridad Zero-Bypass:**
   - Ningún usuario sin sesión activa en **Supabase Auth** puede entrar a las pantallas operativas ni ver datos internos de parcelas, bitácoras o acopio.
   - Se eliminan los botones de acceso rápido con contraseñas pre-llenadas sin verificación real del usuario.
   - Se valida el token JWT en servidor (`auth.getUser`) y se escucha `onAuthStateChange` para cerrar la vista inmediatamente si la sesión caduca o se cierra.
2. **Landing Page Pública + Login Claro:**
   - Al entrar sin sesión iniciada, la raíz `/` muestra una página informativa en lenguaje sencillo sobre qué hace **Kanan Cacao** para productores de Tabasco, junto con un formulario seguro de inicio de sesión.
3. **Arquitectura Dividida por Subsitios con Barra Superior:**
   - `Inicio` (`inicio`): Resumen de parcelas, labores de bitácora, cosechas recientes y árboles de sombra.
   - `Parcelas y Georreferencia` (`parcelas`): Padrón de parcelas, formulario para registrar **Nueva Georreferencia de Parcela** directo en PostGIS, mapa satelital real (Esri World Imagery / Sentinel-2) y descarga del expediente de origen.
   - `Bitácora de Parcela` (`bitacora`): Registro diario de labores (fertilización, poda, chapeo, control de plagas, riego/resiembra), fecha de fertilización, fecha de cosecha y carga de **evidencias fotográficas**.
   - `Cosecha y Acopio` (`cosecha`): Control de corte en finca, fermentación y secado + **Mesa de Acopio** en báscula con emisión de comprobante digital de entrega.
   - `Bonos de Carbono` (`carbono`): Inventario de árboles de sombra y consolidación comunitaria para acceder a apoyos ambientales.
4. **Lenguaje 100% Accesible para el Productor:**
   - En toda la experiencia dirigida al productor se omiten siglas técnicas (`EUDR`, `NDVI`, `CUSTF`, `GS1 EPCIS 2.0`, `RFC 7946`, `TRACES NT`) y se traducen a conceptos cotidianos: *salud y verdor del cacaotal*, *linderos de parcela al día*, *papeles de la parcela*, *comprobante digital de entrega* y *expediente de origen*.

---

## 2. Evolución AI-DLC `v0.4.0` — Mapa Interactivo de Selección e Historial Satelital de 5 Años Persistido en Servidor

1. **Separación Clara de Barra Superior ([ProducerTopNav.tsx](file:///Users/dionicioalberto/Documents/Github/kanan-cacao-web/src/components/ProducerTopNav.tsx)):**
   - Pestañas de navegación de secciones en la franja blanca superior diferenciadas visualmente de la cinta independiente de **Parcela Activa en Trabajo** en tono cálido cacao.
2. **Mapa Interactivo de Selección de Nuevas Parcelas ([InteractiveParcelMapPicker.tsx](file:///Users/dionicioalberto/Documents/Github/kanan-cacao-web/src/components/InteractiveParcelMapPicker.tsx)):**
   - Mosaicos Web Mercator con cambio entre **Mapa Satelital** y **Mapa de Tráfico y Caminos**, botones para **Acercar / Alejar**, desplazamiento direccional y arrastre, botón **GPS para centrar ubicación actual**, selección de esquinas mediante **clics sobre el mapa** y corrección automática de linderos durante el trazado.
3. **Historial Centrado de 5 Años y Guardado Único en Servidor:**
   - En `kanan-cacao-geo-engine`, al crear o consultar una parcela por primera vez se calculan los linderos y se persiste en **Supabase PostGIS** el manifiesto de **7 tomas históricas** (*Última foto al registro*, *Hace 6 meses*, *1 año*, *2 años*, *3 años*, *4 años* y *5 años*) junto con caché de ortofoto en disco (`GET /api/v1/parcels/{parcel_id}/historical-image/{period_key}`), evitando recomputar la georreferencia en consultas posteriores.
   - En [LiveGeoEnginePanel.tsx](file:///Users/dionicioalberto/Documents/Github/kanan-cacao-web/src/components/LiveGeoEnginePanel.tsx), se eliminaron los ejemplos técnicos y códigos de escena satelital (`S2B_...`), mostrando únicamente el visor centrado de los últimos 5 años.
