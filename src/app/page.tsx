'use client';

import React, { useEffect, useState } from 'react';
import LiveGeoEnginePanel from '@/components/LiveGeoEnginePanel';
import OperationsDashboard from '@/components/OperationsDashboard';
import { INITIAL_PARCELS } from '@/services/demoParcels';
import {
  fetchPersistedParcelsLive,
  syncFieldParcelToSqliteLive,
  toggleParcelCustfLive,
} from '@/services/geoEngineLiveClient';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import { WEB_DOMAIN_CONSTANTS, WebUserRole } from '@/types/adminDomain';

const ROLE_META: Record<
  WebUserRole,
  { label: string; scopeTag: string; description: string; activeBg: string }
> = {
  admin_astra: {
    label: 'Admin ASTRA',
    scopeTag: 'Gobernanza completa',
    description:
      'Autorizado para auditar estatus EUDR, verificar permisos CUSTF de SEMARNAT, consultar alertas de rendimiento (450 a 650 kg/ha) y exportar paquetes TRACES NT.',
    activeBg: T.colors.primaryGreen,
  },
  auditor_sustentabilidad: {
    label: 'Auditor EUDR',
    scopeTag: 'Fiscalización satelital',
    description:
      'Autorizado para inspeccionar cobertura arbórea JRC 2020, vigor NDVI Sentinel-2, excesos de rendimiento por hectárea y firmas SHA-256.',
    activeBg: T.colors.secondaryGreen,
  },
  acopiador: {
    label: 'Operador de báscula',
    scopeTag: 'Modo ciego activo',
    description:
      'Registra recepciones de cacao y emite eventos GS1 EPCIS 2.0. El sistema oculta el cupo biológico restante para impedir el lavado de cacao externo.',
    activeBg: T.colors.earthCacao,
  },
};

export default function AdminDashboardPage() {
  const [activeRole, setActiveRole] = useState<WebUserRole>('admin_astra');
  const [parcels, setParcels] = useState<ParcelAdminOverview[]>(INITIAL_PARCELS);
  const [selectedParcelId, setSelectedParcelId] = useState<string>(INITIAL_PARCELS[0].parcelId);
  const [sqliteConnected, setSqliteConnected] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncingFieldParcel, setSyncingFieldParcel] = useState<boolean>(false);

  const selectedParcel = parcels.find((p) => p.parcelId === selectedParcelId) ?? parcels[0];
  const supabaseLive = isSupabaseConfigured();
  const currentRoleMeta = ROLE_META[activeRole];

  useEffect(() => {
    let active = true;
    fetchPersistedParcelsLive()
      .then((persisted) => {
        if (active && persisted.length > 0) {
          setParcels(persisted);
          setSqliteConnected(true);
        }
      })
      .catch(() => {
        if (active) {
          setSqliteConnected(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleCustf = async (parcelId: string) => {
    setParcels((prev) =>
      prev.map((p) =>
        p.parcelId === parcelId ? { ...p, hasVerifiedCustfPermit: !p.hasVerifiedCustfPermit } : p,
      ),
    );
    try {
      const updated = await toggleParcelCustfLive(parcelId);
      setParcels((prev) => prev.map((p) => (p.parcelId === parcelId ? updated : p)));
      setSqliteConnected(true);
    } catch {
      // Keeps optimistic state when running without the local FastAPI backend.
    }
  };

  const handleSimulateMobileSync = async () => {
    setSyncingFieldParcel(true);
    setSyncMessage(null);
    setSyncError(null);
    try {
      const updatedList = await syncFieldParcelToSqliteLive({
        parcelId: 'PAR-HUIMANGUILLO-04',
        producerName: 'Ing. Sofía Méndez (Huimanguillo)',
        municipality: 'Huimanguillo',
        areaHectares: 2.9,
        shadeTreeCount: 110,
      });
      setParcels(updatedList);
      setSelectedParcelId('PAR-HUIMANGUILLO-04');
      setSqliteConnected(true);
      setSyncMessage(
        'Sincronización diferencial completada: parcela PAR-HUIMANGUILLO-04 (2.9 ha) validada por el linter y guardada en SQLite.',
      );
    } catch (err) {
      setSyncError(
        err instanceof Error
          ? `${err.message}. Verifica que Geo-Engine esté encendido en 127.0.0.1:8080.`
          : String(err),
      );
    } finally {
      setSyncingFieldParcel(false);
    }
  };

  const storageBadgeText = supabaseLive
    ? 'Origen: Supabase PostGIS en vivo'
    : sqliteConnected
      ? 'Origen: Base local SQLite activa (127.0.0.1:8080)'
      : '[DATOS DE DEMOSTRACIÓN: Semilla Chontalpa]';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <a href="#main-workbench" className="skip-link">
        Saltar al área de trabajo principal
      </a>

      <header
        style={{
          backgroundColor: T.colors.surfaceCard,
          borderBottom: `2px solid ${T.colors.borderSubtle}`,
        }}
      >
        <div
          style={{
            backgroundColor: T.colors.primaryGreen,
            color: '#FFFFFF',
            padding: '10px 20px',
            fontSize: '0.8125rem',
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, letterSpacing: '0.03em' }}>
                ASTRA S.A.S. · Región Grijalva-Chontalpa, Tabasco
              </span>
              <span aria-hidden="true">|</span>
              <span>
                Corte regulatorio EUDR: <strong>{WEB_DOMAIN_CONSTANTS.EUDR_CUTOFF_DATE_ISO}</strong>
              </span>
              <span aria-hidden="true">|</span>
              <span>
                Rango biológico Tabasco:{' '}
                <strong>
                  {WEB_DOMAIN_CONSTANTS.TABASCO_YIELD_CAP_MIN_KG_HA} a{' '}
                  {WEB_DOMAIN_CONSTANTS.TABASCO_YIELD_CAP_MAX_KG_HA} kg/ha
                </strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  backgroundColor: '#FFFFFF',
                  color: T.colors.primaryGreen,
                  padding: '3px 10px',
                  borderRadius: 4,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                {storageBadgeText}
              </span>
            </div>
          </div>
        </div>

        <div className="page-shell" style={{ paddingBottom: 20 }}>
          <div className="header-split">
            <div>
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: T.colors.earthCacao,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                SISTEMA KANAN CACAO · PASAPORTE DIGITAL GEOESPACIAL (v0.2.0)
              </p>
              <h1
                style={{
                  margin: 0,
                  color: T.colors.primaryGreen,
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(1.65rem, 1.35rem + 1.2vw, 2.25rem)',
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                Consola de Trazabilidad EUDR y Báscula Ciega
              </h1>
              <p
                style={{
                  margin: '10px 0 12px',
                  color: T.colors.textPrimary,
                  fontSize: '1rem',
                  maxWidth: '64ch',
                }}
              >
                Inspecciona polígonos de cultivo bajo línea base 2020, verifica permisos CUSTF de
                SEMARNAT, simula el pesaje antifraude en centro de acopio bajo estándar GS1 EPCIS
                2.0 y consolida minifundios menores a 5 ha para mercados de carbono.
              </p>
              <p
                style={{
                  margin: 0,
                  padding: '8px 12px',
                  backgroundColor: T.colors.backgroundPrimary,
                  border: `1px solid ${T.colors.borderSubtle}`,
                  borderRadius: 6,
                  fontSize: '0.8125rem',
                  color: T.colors.textSecondary,
                  maxWidth: '68ch',
                }}
              >
                <strong>Nota regulatoria:</strong> {WEB_DOMAIN_CONSTANTS.EUDR_LEGAL_DISCLAIMER}
              </p>
            </div>

            <div
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                padding: 18,
                borderRadius: 10,
                border: `2px solid ${T.colors.borderControl}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span
                  id="rbac-selector-label"
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: T.colors.textPrimary,
                  }}
                >
                  Simulador de rol activo (control RBAC):
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    backgroundColor: currentRoleMeta.activeBg,
                    color: '#FFFFFF',
                  }}
                >
                  {currentRoleMeta.scopeTag}
                </span>
              </div>

              <div
                role="group"
                aria-labelledby="rbac-selector-label"
                className="role-switcher-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                }}
              >
                {(Object.keys(ROLE_META) as WebUserRole[]).map((role) => {
                  const isActive = activeRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveRole(role)}
                      className="btn-control"
                      style={{
                        justifyContent: 'center',
                        textAlign: 'center',
                        fontSize: '0.85rem',
                        padding: '10px 8px',
                        backgroundColor: isActive ? ROLE_META[role].activeBg : T.colors.surfaceCard,
                        color: isActive ? '#FFFFFF' : T.colors.textPrimary,
                        borderColor: isActive ? ROLE_META[role].activeBg : T.colors.borderControl,
                      }}
                    >
                      {ROLE_META[role].label}
                    </button>
                  );
                })}
              </div>

              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: '0.8125rem',
                  color: T.colors.textSecondary,
                  backgroundColor: T.colors.surfaceCard,
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: `1px solid ${T.colors.borderSubtle}`,
                }}
              >
                {currentRoleMeta.description}
              </p>
            </div>
          </div>

          <nav
            aria-label="Secciones de la consola operativa"
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: `1px solid ${T.colors.borderSubtle}`,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: T.colors.textSecondary,
                  marginRight: 4,
                }}
              >
                Ir a sección:
              </span>
              <a
                href="#padron-parcelas"
                className="btn-control"
                style={{
                  textDecoration: 'none',
                  minHeight: 44,
                  padding: '8px 14px',
                  fontSize: '0.85rem',
                }}
              >
                1. Padrón EUDR y CUSTF
              </a>
              <a
                href="#bascula-epcis"
                className="btn-control"
                style={{
                  textDecoration: 'none',
                  minHeight: 44,
                  padding: '8px 14px',
                  fontSize: '0.85rem',
                }}
              >
                2. Báscula ciega y EPCIS 2.0
              </a>
              <a
                href="#linter-cartografico"
                className="btn-control"
                style={{
                  textDecoration: 'none',
                  minHeight: 44,
                  padding: '8px 14px',
                  fontSize: '0.85rem',
                }}
              >
                3. Linter topológico y TRACES NT
              </a>
              <a
                href="#consolidacion-carbono"
                className="btn-control"
                style={{
                  textDecoration: 'none',
                  minHeight: 44,
                  padding: '8px 14px',
                  fontSize: '0.85rem',
                }}
              >
                4. Lote comunitario de carbono
              </a>
            </div>

            <button
              type="button"
              onClick={handleSimulateMobileSync}
              disabled={syncingFieldParcel}
              className="btn-cacao"
              style={{ fontSize: '0.85rem', padding: '8px 14px' }}
            >
              {syncingFieldParcel
                ? 'Sincronizando con SQLite...'
                : 'Sincronizar parcela capturada en app móvil (SQLite)'}
            </button>
          </nav>

          {syncMessage && (
            <div
              role="status"
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 6,
                backgroundColor: T.colors.statusGreenBg,
                border: '1px solid #15803D',
                color: T.colors.statusGreen,
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {syncMessage}
            </div>
          )}

          {syncError && (
            <div
              role="alert"
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 6,
                backgroundColor: T.colors.statusRedBg,
                border: '1px solid #B91C1C',
                color: T.colors.statusRed,
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {syncError}
            </div>
          )}
        </div>
      </header>

      <main id="main-workbench" className="page-shell" style={{ flex: 1 }}>
        <OperationsDashboard
          key={activeRole}
          activeRole={activeRole}
          parcels={parcels}
          selectedParcelId={selectedParcelId}
          onSelectParcel={setSelectedParcelId}
          onToggleCustf={toggleCustf}
        />

        <LiveGeoEnginePanel parcel={selectedParcel} />
      </main>

      <footer
        style={{
          marginTop: 40,
          backgroundColor: T.colors.backgroundSecondary,
          borderTop: `2px solid ${T.colors.borderSubtle}`,
          padding: '24px 20px',
          fontSize: '0.85rem',
          color: T.colors.textSecondary,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <strong style={{ color: T.colors.textPrimary }}>Kanan Cacao (ASTRA S.A.S.)</strong> ·
            Arquitectura Offline-First con WatermelonDB, SQLite/PostGIS y FastAPI.
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>Estándares activos: GeoJSON RFC 7946 · GS1 EPCIS 2.0 JSON-LD · UE 2023/1115</span>
            <a
              href="#main-workbench"
              style={{
                color: T.colors.primaryGreen,
                fontWeight: 700,
                textDecoration: 'underline',
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Volver arriba
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
