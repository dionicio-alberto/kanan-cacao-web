# 💻 Kanan Cacao Web — Portal del Productor, Acopio y Auditoría EUDR (Next.js / Vercel)

**Propiedad de:** ASTRA (Agrotecnología y Servicios de Transformación en Recursos Agrícolas de México S.A.S.)  
**Metodología:** AI-Driven Development Life Cycle (AI-DLC)  
**Producción:** [https://kanan-cacao-web.vercel.app](https://kanan-cacao-web.vercel.app)

---

## 📚 Documentación Centralizada del Ecosistema

Para entender cómo funciona todo el sistema Kanan Cacao en un solo lugar, consulta:
* 🧭 **[Centro Maestro de Documentación (`kanan-cacao/docs/00-INDICE-MAESTRO-DOCUMENTACION.md`)](../kanan-cacao/docs/00-INDICE-MAESTRO-DOCUMENTACION.md)**
* 💻 **[Manual Técnico Detallado de este Repositorio Web (`docs/MANUAL-TECNICO-WEB.md`)](./docs/MANUAL-TECNICO-WEB.md)**
* 🏛️ **[Arquitectura y Decisiones ADR (`kanan-cacao/docs/01-ARQUITECTURA-Y-DECISIONES-ADR.md`)](../kanan-cacao/docs/01-ARQUITECTURA-Y-DECISIONES-ADR.md)**
* 🧩 **[Diccionario de Funciones y Código (`kanan-cacao/docs/03-DICCIONARIO-DE-FUNCIONES-Y-CODIGO.md`)](../kanan-cacao/docs/03-DICCIONARIO-DE-FUNCIONES-Y-CODIGO.md)**

---

## 🌾 Módulos Principales de la Plataforma Web

1. **Parcelas, Georreferenciación y Visor Satelital Multitemporal (`ParcelsAndGeorefModule.tsx`):**
   - Creación y edición de parcelas con polígonos cerrados WGS84 (RFC 7946).
   - Visor satelital centrado automáticamente en la parcela con imágenes **Copernicus Sentinel-2 L2A (NDVI)** y **Esri Wayback (2020–2026)** para auditoría de no deforestación EUDR.
   - Bóveda de **Documentación Legal Digital** con firma criptográfica **SHA-256** (Certificados Parcelarios, Títulos de Propiedad, Permisos CUSTF).

2. **Bitácora de Campo Sincronizada con App Móvil (`FieldLogbookModule.tsx`):**
   - **Hub Principal:** Tarjetas de Resumen Agronómico (días desde fitosanidad, días desde nutrición, horas acumuladas de mano de obra y costos en MXN), cuadrícula de botones de las **8 Labores Agronómicas Integradas** y botón inferior para **`📖 Ver Historial de Actividades`**.
   - **Páginas Dedicadas por Labor:** Al hacer clic en cada labor (Sombra, Poda, Control Fitosanitario, Fertilización Orgánica, Chapeo, Drenaje, Caldos Minerales o Floración), se abre su formulario con campos técnicos adaptados a esa actividad, clima, insumos, dosis, jornales, costos, chips de notas rápidas y fotografías.
   - **Historial Completo:** Filtros por parcela, labor, productor y fechas, exportación a CSV, **edición reactiva (`✏️ Editar`)** y **eliminación (`🗑️ Eliminar`)**.

3. **Panel de Administración y Configuración de Bitácora (`AdminLogbookConfigPanel.tsx`):**
   - Exclusivo para el rol **`admin`**: permite activar/desactivar funciones de la bitácora, agregar nuevas labores o bioinsumos y aplicar **Archivado Inteligente** (`is_archived = true`) para conservar intacta la historia de las parcelas.

4. **Cosecha, Báscula Ciega y Trazabilidad TRACES-NT (`HarvestAndAcopioModule.tsx`):**
   - Registro de entregas de cacao con validación automática de topes productivos (*Yield Caps* de 450–650 kg/ha en Tabasco) y exportación JSON-LD para aduanas europeas.

5. **Bonos de Carbono y Sostenibilidad (`CarbonBonusModule.tsx`):**
   - Estimación de captura de $\text{CO}_2$ en sistemas agroforestales de cacao con sombra diversa.

---

## 🚀 Ejecución Local y Pruebas Automatizadas

```bash
# Instalar dependencias
npm install

# Levantar servidor de desarrollo en http://localhost:3000
npm run dev

# Ejecutar las 51 pruebas unitarias y E2E (8 suites en Jest)
npm test

# Verificación estricta de tipos TypeScript
npm run typecheck

# Linter y verificación de formato Prettier
npm run lint
npm run format:check
```
