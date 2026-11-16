# Kanan Cacao Web — Especificación AI-DLC `v0.9.0`: Restricción Admin con Confirmación Tipo Amazon y Verificación de Resolución

**Metodología:** AI-Driven Development Life Cycle (AI-DLC) — Iteración `v0.9.0`  
**Ramas:**

- `kanan-cacao-geo-engine`: `feature/high-res-guard-and-admin-regdate` -> `develop` -> `main`
- `kanan-cacao-web`: `feature/admin-regdate-confirm-and-highres` -> `develop` -> `main`

---

## 1. Control Administrativo de Fecha de Registro

1. **Lectura exclusiva para usuarios no administradores:** Productores, técnicos y auditores ven la **Fecha de registro** en formato `DD/MM/AAAA` en modo solo lectura.
2. **Flujo tipo Amazon exclusivo para `admin_astra`:**
   - Botón `🔒 Cambiar fecha de registro (Solo Admin)`.
   - Panel/diálogo con leyenda de advertencia explícita (_cambiar este valor altera los registros históricos y quedará registrado de forma permanente_).
   - Campo obligatorio donde el administrador debe escribir exactamente la palabra **`confirmar`** para habilitar el guardado (`PATCH /api/v1/parcels/{id}/registration-date`).
   - Visualización visible de la bitácora de auditoría (`registrationAuditLog`) con fecha anterior, nueva fecha, usuario y fecha del cambio en `DD/MM/AAAA`.

---

## 2. Garantía Visual de Alta Resolución Satelital

- `LiveGeoEnginePanel.tsx` y `ParcelsAndGeorefModule.tsx` aceptan colecciones de **5 a 7 capturas distintas de alta resolución verificada (`pixel_cloud_checked` + `high_res_verified`)**, mostrando el indicador de nitidez/resolución (`Alta resolución submétrica`) y evitando el uso de teselas borrosas de 10 m/px.
