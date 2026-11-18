# 💻 Manual Técnico y Funcional para Humanos — `kanan-cacao-web`

**Repositorio:** `kanan-cacao-web` (Portal Web Administrativo y del Productor)  
**Producción:** [https://kanan-cacao-web.vercel.app](https://kanan-cacao-web.vercel.app)  
**Centro Maestro de Documentación:** [`kanan-cacao/docs/00-INDICE-MAESTRO-DOCUMENTACION.md`](../../kanan-cacao/docs/00-INDICE-MAESTRO-DOCUMENTACION.md)

---

## 1. Propósito de Este Repositorio

`kanan-cacao-web` es la aplicación web construida en **Next.js 14 (App Router) + React 18 + TypeScript** para productores, operadores de acopio y administradores de cooperativas de cacao en Tabasco.

Se conecta en tiempo real con el backend compartido **[`kanan-cacao-geo-engine`](../../kanan-cacao-geo-engine)** y con **Supabase PostGIS**, manteniendo sincronizadas todas las parcelas, documentos legales y registros de bitácora con la aplicación móvil **[`kanan-cacao-mobile`](../../kanan-cacao-mobile)**.

---

## 2. Estructura de Carpetas y Archivos Explicada para Humanos

```text
kanan-cacao-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Estructura HTML global y tipografías Naturista
│   │   ├── page.tsx                # Punto de entrada: Landing pública, Login y Dashboard
│   │   ├── error.tsx               # Frontera de error amigable por ruta (evita pantallas rotas)
│   │   └── global-error.tsx        # Frontera de error global de raíz (<html> y <body>)
│   ├── components/
│   │   ├── PublicLandingAndLogin.tsx       # Portada institucional y acceso rápido por rol
│   │   ├── ProducerTopNav.tsx              # Barra superior de navegación entre módulos
│   │   ├── InteractiveParcelMapPicker.tsx  # Mapa interactivo para trazar y centrar polígonos
│   │   ├── LiveGeoEnginePanel.tsx          # Monitor en vivo de conexión con el Geo-Engine
│   │   └── modules/
│   │       ├── DashboardHomeModule.tsx     # Resumen general del productor o cooperativa
│   │       ├── ParcelsAndGeorefModule.tsx  # Gestión de parcelas, visor satelital y documentos SHA-256
│   │       ├── FieldLogbookModule.tsx      # Bitácora: Hub de resumen, 8 páginas de labor e historial
│   │       ├── AdminLogbookConfigPanel.tsx # Panel Admin para activar/archivar opciones de Bitácora
│   │       ├── AdminRoleControlModule.tsx  # Gestión de usuarios, roles RBAC y configuración
│   │       ├── HarvestAndAcopioModule.tsx  # Báscula Ciega, topes productivos y lotes EPCIS
│   │       └── CarbonBonusModule.tsx       # Calculadora agroforestal de captura de carbono
│   ├── services/
│   │   ├── geoEngineLiveClient.ts          # Cliente HTTP hacia kanan-cacao-geo-engine (Railway/Docker)
│   │   ├── producerLogbookService.ts       # Lógica de validación de parcelas, polígonos y bitácora
│   │   ├── blindScaleAndTracesService.ts   # Reglas de Báscula Ciega y exportación TRACES-NT
│   │   ├── sustainabilityAdminService.ts   # Consolidación de carbono y validación CUSTF
│   │   ├── waybackOfficialCatalog.ts       # Catálogo oficial de ortofotos Esri Wayback (2020-2026)
│   │   ├── demoParcels.ts                  # Parcelas semilla georreferenciadas en Tabasco
│   │   └── supabaseClient.ts               # Conexión directa a Supabase PostgreSQL / PostGIS
│   └── theme/
│       └── naturistaWebTheme.ts            # Paleta de colores orgánicos de alto contraste
└── tests/
    ├── webParcelsAndBitacora.test.ts       # Suite dedicada a Parcelas y Bitácora (Fases 1 y 2)
    ├── webComprehensiveE2E.test.ts         # Suite integral de extremo a extremo (Login -> Sync)
    ├── geoEngineLiveClient.test.ts         # Pruebas del cliente HTTP y configuración de bitácora
    └── ...                                 # Total: 8 suites con 51 pruebas automatizadas
```

---

## 3. Cómo Funciona el Módulo de Bitácora (`FieldLogbookModule.tsx`)

El módulo de Bitácora opera mediante tres vistas controladas por el estado `viewMode`:

1. **`viewMode === 'hub'` (Pantalla Principal de Bitácora):**
   - **Tarjetas de Resumen Agronómico (`summaryMetrics`):** Calcula automáticamente los días desde el último control fitosanitario, los días desde la última fertilización orgánica y el acumulado de horas de mano de obra y costos en pesos mexicanos (`MXN`).
   - **Cuadrícula de Labores Agronómicas Integradas (`activitiesCatalog`):** Muestra los botones de las 8 labores del cultivo (Manejo de Sombra, Poda, Control Fitosanitario, Fertilización Orgánica, Control de Malezas, Riego/Drenaje, Aplicación de Caldos Minerales y Monitoreo de Floración).
   - **Acceso al Historial:** Debajo de las labores presenta el botón **`📖 Ver Historial de Actividades`** y el botón **`📊 Exportar CSV`**.

2. **`viewMode === 'activity-form'` (Página Dedicada por Labor):**
   - Se abre al hacer clic en cualquiera de las 8 labores (`handleOpenActivityForm(activityKey)`).
   - Adapta sus campos y selectores según la labor:
     - **Sombra (`MANEJO_SOMBRA`):** Especies forestales intervenidas y porcentaje de cobertura de dosel objetivo.
     - **Poda (`PODA_CACAO`):** Tipo de poda y pasta cicatrizante aplicada.
     - **Fitosanidad (`DESMOMIFICACION_FITOSANITARIA`):** Hongo o plaga atendida, conteo de mazorcas enfermas removidas y disposición sanitaria.
     - **Nutrición (`FERTILIZACION_ORGANICA`):** Método de incorporación y botones rápidos de bioinsumos recomendados.
   - Incluye siempre: selector de parcela, fecha, condición del clima (`Soleado`, `Nublado`, `Lluvioso`), insumo, dosis, horas de trabajo, número de jornaleros, costo en MXN, chips de notas rápidas específicas de esa actividad y carga de fotografías.

3. **`viewMode === 'history'` (Historial Completo y Edición Reactiva):**
   - Muestra todas las labores registradas con filtros en tiempo real por parcela, actividad, nombre de productor y rango de fechas.
   - Cada tarjeta incluye el botón **`✏️ Editar`** (que abre un modal para actualizar cualquier campo vía `updateFieldLogLive`) y el botón **`🗑️ Eliminar`** (`deleteFieldLogLive`).

---

## 4. Cómo Funciona la Configuración Admin de Bitácora (`AdminLogbookConfigPanel.tsx`)

Disponible únicamente para usuarios con rol **`admin`**:

- Consulta `GET /api/v1/admin/logbook/config`.
- Permite activar o desactivar interruptores globales (`enable_photos`, `enable_inputs_used`, `enable_doses`, `enable_labor_and_costs`, `enable_weather_conditions`, `enable_custom_fields`).
- Permite agregar nuevas labores o bioinsumos y aplicar **Archivado Inteligente**: si se elimina una labor con registros históricos, se marca como `is_archived = true` para ocultar el botón sin perder la historia.
