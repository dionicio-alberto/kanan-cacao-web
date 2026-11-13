'use client';

import React, { useState } from 'react';
import LiveGeoEnginePanel from '@/components/LiveGeoEnginePanel';
import OperationsDashboard from '@/components/OperationsDashboard';
import { INITIAL_PARCELS } from '@/services/demoParcels';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import {
  evaluateCustfAdminCompliance,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import { WEB_DOMAIN_CONSTANTS, WebUserRole } from '@/types/adminDomain';

const ROLE_META: Record<
  WebUserRole,
  { label: string; badge: string; description: string; accent: string }
> = {
  admin_astra: {
    label: 'Admin ASTRA',
    badge: 'Acceso Total',
    description:
      'Gobernanza completa: auditoría EUDR, desbloqueo CUSTF, alertas de Yield Cap (450–650 kg/ha) y exportación TRACES NT.',
    accent: T.colors.primaryGreen,
  },
  auditor_sustentabilidad: {
    label: 'Auditor EUDR',
    badge: 'Fiscalización',
    description:
      'Inspección satelital JRC 2020, telemetría NDVI Sentinel-2, verificación de excesos biológicos y huella SHA-256.',
    accent: T.colors.secondaryGreen,
  },
  acopiador: {
    label: 'Operador Báscula (Ciego)',
    badge: 'Modo Ciego Activo',
    description:
      'Restricción antifraude: registra pesaje y emite GS1 EPCIS 2.0, pero NO visualiza el cupo biológico restante de la parcela.',
    accent: T.colors.earthCacao,
  },
};

export default function AdminDashboardPage() {
  const [activeRole, setActiveRole] = useState<WebUserRole>('admin_astra');
  const [parcels, setParcels] = useState<ParcelAdminOverview[]>(INITIAL_PARCELS);
  const [selectedParcelId, setSelectedParcelId] = useState<string>(INITIAL_PARCELS[0].parcelId);

  const selectedParcel = parcels.find((p) => p.parcelId === selectedParcelId) ?? parcels[0];
  const supabaseLive = isSupabaseConfigured();

  const toggleCustf = (parcelId: string) =>
    setParcels((prev) =>
      prev.map((p) =>
        p.parcelId === parcelId ? { ...p, hasVerifiedCustfPermit: !p.hasVerifiedCustfPermit } : p,
      ),
    );

  // Executive KPI calculations
  const totalHa = Number(parcels.reduce((acc, p) => acc + p.areaHectares, 0).toFixed(2));
  const greenParcelsCount = parcels.filter((p) => p.eudrStatus === 'VERDE').length;
  const avgNdvi = Number(
    (parcels.reduce((acc, p) => acc + p.meanNdvi, 0) / parcels.length).toFixed(2),
  );
  const totalShadeTrees = parcels.reduce((acc, p) => acc + p.shadeTreeCount, 0);
  const estimatedCo2Tons = Number((totalShadeTrees * 0.24).toFixed(1));
  const compliantCustfCount = parcels.filter(
    (p) => !evaluateCustfAdminCompliance(p).isProducerBlocked,
  ).length;

  const currentRoleMeta = ROLE_META[activeRole];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Institutional Bar */}
      <div
        style={{
          background: `linear-gradient(90deg, ${T.colors.primaryGreen} 0%, #1F5E36 55%, ${T.colors.earthCacao} 100%)`,
          color: '#FFFFFF',
          padding: '10px 24px',
          fontSize: 12,
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div
          style={{
            maxWidth: 1260,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              🇲🇽 ASTRA S.A.S. · Región Chontalpa, Tabasco
            </span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span style={{ opacity: 0.9 }}>
              Corte EUDR: <strong>{WEB_DOMAIN_CONSTANTS.EUDR_CUTOFF_DATE_ISO}</strong>
            </span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span style={{ opacity: 0.9 }}>
              Umbral Biológico Tabasco:{' '}
              <strong>
                {WEB_DOMAIN_CONSTANTS.TABASCO_YIELD_CAP_MIN_KG_HA}–
                {WEB_DOMAIN_CONSTANTS.TABASCO_YIELD_CAP_MAX_KG_HA} kg/ha
              </strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(255,255,255,0.14)',
                padding: '3px 10px',
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              <span
                className="status-dot-pulse"
                style={{ backgroundColor: supabaseLive ? '#4ADE80' : '#FBBF24' }}
              />
              {supabaseLive ? 'Supabase PostGIS: Conectado' : 'Datos Semilla: Chontalpa Demo'}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(255,255,255,0.14)',
                padding: '3px 10px',
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              <span className="status-dot-pulse" style={{ backgroundColor: '#4ADE80' }} />
              GS1 EPCIS 2.0 + SHA-256
            </span>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1260, width: '100%', margin: '0 auto', padding: '28px 24px 48px' }}>
        {/* Main Hero Header */}
        <header
          style={{
            background: `linear-gradient(135deg, #FFFFFF 0%, ${T.colors.surfaceElevated} 65%, ${T.colors.softGreenBg} 100%)`,
            border: `1px solid ${T.colors.borderSubtle}`,
            boxShadow: T.shadows.header,
            borderRadius: 20,
            padding: '28px 30px',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 24,
            }}
          >
            {/* Brand Identity */}
            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', maxWidth: 680 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${T.colors.primaryGreen} 0%, ${T.colors.earthCacao} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 16px rgba(22, 74, 40, 0.22)',
                  flexShrink: 0,
                }}
              >
                <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                  <path
                    d="M18 3L5 8.5V17.5C5 25.8 10.5 32.8 18 35C25.5 32.8 31 25.8 31 17.5V8.5L18 3Z"
                    stroke="#FAF7F2"
                    strokeWidth="2.2"
                    fill="rgba(255,255,255,0.1)"
                  />
                  <ellipse
                    cx="18"
                    cy="19"
                    rx="6.5"
                    ry="9.5"
                    transform="rotate(-12 18 19)"
                    fill="#F3C663"
                    stroke="#FAF7F2"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M14 15C16.5 16.5 19.5 16.5 22 15M13.5 19.5C16.5 21 19.5 21 22.5 19.5M15 24C17 25 19 25 21 24"
                    stroke="#5C3A21"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '3px 10px',
                      borderRadius: 999,
                      backgroundColor: T.colors.softGreenBg,
                      color: T.colors.primaryGreen,
                      border: `1px solid ${T.colors.secondaryGreen}40`,
                    }}
                  >
                    Guardián del Cacao · v0.2.0
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 999,
                      backgroundColor: T.colors.softCacaoBg,
                      color: T.colors.earthCacao,
                    }}
                  >
                    Cero Balance de Masas
                  </span>
                </div>

                <h1
                  style={{
                    margin: 0,
                    color: T.colors.primaryGreen,
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Kanan Cacao — Centro de Control ASTRA
                </h1>
                <p
                  style={{
                    margin: '6px 0 10px',
                    color: T.colors.earthCacao,
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  Pasaporte Digital Geoespacial · EUDR 2020 · NDVI Sentinel-2 · Báscula Ciega ·
                  EPCIS 2.0 · TRACES NT
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    color: T.colors.textSecondary,
                    lineHeight: 1.45,
                  }}
                >
                  ⚖️ {WEB_DOMAIN_CONSTANTS.EUDR_LEGAL_DISCLAIMER}
                </p>
              </div>
            </div>

            {/* RBAC Role Switcher Card */}
            <div
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                padding: '16px 18px',
                borderRadius: 16,
                border: `1px solid ${T.colors.borderStrong}`,
                minWidth: 360,
                flex: '1 1 360px',
                maxWidth: 460,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: T.colors.textSecondary,
                  }}
                >
                  🔐 Simulador de Rol Activo (RBAC)
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: currentRoleMeta.accent,
                    color: '#FFFFFF',
                  }}
                >
                  {currentRoleMeta.badge}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 6,
                  backgroundColor: T.colors.backgroundSecondary,
                  padding: 5,
                  borderRadius: 12,
                  border: `1px solid ${T.colors.borderSubtle}`,
                }}
              >
                {(Object.keys(ROLE_META) as WebUserRole[]).map((role) => {
                  const isActive = activeRole === role;
                  return (
                    <button
                      key={role}
                      onClick={() => setActiveRole(role)}
                      style={{
                        padding: '9px 10px',
                        borderRadius: 9,
                        border: isActive
                          ? `1px solid ${ROLE_META[role].accent}`
                          : '1px solid transparent',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 12.5,
                        backgroundColor: isActive ? ROLE_META[role].accent : 'transparent',
                        color: isActive ? '#FFFFFF' : T.colors.textPrimary,
                        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.14)' : 'none',
                      }}
                    >
                      {ROLE_META[role].label}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: T.colors.textSecondary,
                  backgroundColor: '#FFFFFF',
                  padding: '8px 12px',
                  borderRadius: 8,
                  borderLeft: `3px solid ${currentRoleMeta.accent}`,
                }}
              >
                {currentRoleMeta.description}
              </div>
            </div>
          </div>
        </header>

        {/* Executive KPI Ribbon */}
        <section className="kanan-kpi-grid" style={{ marginBottom: 24 }}>
          <div
            style={{
              backgroundColor: T.colors.surfaceCard,
              border: `1px solid ${T.colors.borderSubtle}`,
              borderRadius: 16,
              padding: '18px 20px',
              boxShadow: T.shadows.card,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: T.colors.textSecondary,
                }}
              >
                Superficie Auditada
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  backgroundColor: T.colors.softGreenBg,
                  color: T.colors.statusGreen,
                }}
              >
                {greenParcelsCount}/{parcels.length} EUDR Verde
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.colors.primaryGreen }}>
              {totalHa} <span style={{ fontSize: 16, fontWeight: 600 }}>ha</span>
            </div>
            <div style={{ fontSize: 12, color: T.colors.textMuted, marginTop: 4 }}>
              Polígonos georreferenciados WGS84 (RFC 7946)
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.surfaceCard,
              border: `1px solid ${T.colors.borderSubtle}`,
              borderRadius: 16,
              padding: '18px 20px',
              boxShadow: T.shadows.card,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: T.colors.textSecondary,
                }}
              >
                Vigor Dosel Sentinel-2
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  backgroundColor: T.colors.softGoldBg,
                  color: T.colors.goldHarvest,
                }}
              >
                NDVI Multitemporal
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.colors.secondaryGreen }}>
              {avgNdvi} <span style={{ fontSize: 14, fontWeight: 600 }}>índice medio</span>
            </div>
            <div style={{ fontSize: 12, color: T.colors.textMuted, marginTop: 4 }}>
              Monitoreo temprano de estrés hídrico y moniliasis
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.surfaceCard,
              border: `1px solid ${T.colors.borderSubtle}`,
              borderRadius: 16,
              padding: '18px 20px',
              boxShadow: T.shadows.card,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: T.colors.textSecondary,
                }}
              >
                Sombra Agroforestal
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  backgroundColor: T.colors.softGreenBg,
                  color: T.colors.primaryGreen,
                }}
              >
                ~{estimatedCo2Tons} tCO₂e/año
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.colors.earthCacao }}>
              {totalShadeTrees} <span style={{ fontSize: 15, fontWeight: 600 }}>árboles</span>
            </div>
            <div style={{ fontSize: 12, color: T.colors.textMuted, marginTop: 4 }}>
              Cedro Rojo, Caoba, Samán, Macuilís y Frutales
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.surfaceCard,
              border: `1px solid ${T.colors.borderSubtle}`,
              borderRadius: 16,
              padding: '18px 20px',
              boxShadow: T.shadows.card,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: T.colors.textSecondary,
                }}
              >
                Candado Legal CUSTF
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  backgroundColor:
                    compliantCustfCount === parcels.length ? T.colors.softGreenBg : '#FEE2E2',
                  color:
                    compliantCustfCount === parcels.length
                      ? T.colors.statusGreen
                      : T.colors.statusRed,
                }}
              >
                {compliantCustfCount}/{parcels.length} Habilitados
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.colors.textPrimary }}>
              450–650 <span style={{ fontSize: 14, fontWeight: 600 }}>kg/ha máx</span>
            </div>
            <div style={{ fontSize: 12, color: T.colors.textMuted, marginTop: 4 }}>
              Validación SEMARNAT + Báscula Ciega Antifraude
            </div>
          </div>
        </section>

        {/* Core Operational Modules */}
        <OperationsDashboard
          key={activeRole}
          activeRole={activeRole}
          parcels={parcels}
          selectedParcelId={selectedParcelId}
          onSelectParcel={setSelectedParcelId}
          onToggleCustf={toggleCustf}
        />

        {/* Live Geo-Engine Cartographic Linter & TRACES NT */}
        <LiveGeoEnginePanel parcel={selectedParcel} />
      </main>

      {/* Institutional Footer */}
      <footer
        style={{
          marginTop: 'auto',
          backgroundColor: T.colors.backgroundSecondary,
          borderTop: `1px solid ${T.colors.borderSubtle}`,
          padding: '20px 24px',
          fontSize: 12.5,
          color: T.colors.textSecondary,
        }}
      >
        <div
          style={{
            maxWidth: 1260,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <strong>Kanan Cacao (ASTRA S.A.S.)</strong> · Arquitectura Offline-First (WatermelonDB +
            Supabase PostGIS + FastAPI Cloud Run)
          </div>
          <div>
            Estándares: <strong>GeoJSON RFC 7946</strong> · <strong>GS1 EPCIS 2.0 JSON-LD</strong> ·{' '}
            <strong>UE EUDR 2023/1115</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}
