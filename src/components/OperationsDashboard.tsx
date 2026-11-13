'use client';

import React, { useState } from 'react';
import { processScaleReceptionByRole } from '@/services/blindScaleAndTracesService';
import {
  consolidateCarbonClusterWeb,
  evaluateCustfAdminCompliance,
  NdviAlertLevel,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import { WEB_DOMAIN_CONSTANTS, WebUserRole } from '@/types/adminDomain';

const cardStyle: React.CSSProperties = {
  backgroundColor: T.colors.surfaceCard,
  border: `1px solid ${T.colors.borderSubtle}`,
  borderRadius: 20,
  padding: '26px 28px',
  boxShadow: T.shadows.card,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  marginTop: 6,
  borderRadius: 10,
  border: `1px solid ${T.colors.borderStrong}`,
  backgroundColor: T.colors.backgroundPrimary,
  fontSize: 15,
  fontWeight: 700,
  color: T.colors.textPrimary,
  boxSizing: 'border-box',
};

const NDVI_META: Record<
  NdviAlertLevel,
  { label: string; color: string; bg: string; advice: string }
> = {
  VIGOR_AGROFORESTAL_OPTIMO: {
    label: 'Vigor Agroforestal Óptimo',
    color: T.colors.statusGreen,
    bg: T.colors.softGreenBg,
    advice: 'Dosel cerrado y actividad fotosintética saludable.',
  },
  ESTRES_HIDRICO_TEMPRANO: {
    label: 'Estrés Hídrico Temprano',
    color: T.colors.statusWarning,
    bg: T.colors.softGoldBg,
    advice: 'Vigilar humedad edáfica y cobertura de sombra.',
  },
  FOCO_PLAGA_FUNGICA_ALERTA: {
    label: 'Alerta Fitosanitaria (Moniliasis)',
    color: T.colors.statusRed,
    bg: '#FEE2E2',
    advice: 'Inspección urgente por posible foco fúngico o defoliación.',
  },
};

interface Props {
  activeRole: WebUserRole;
  parcels: ParcelAdminOverview[];
  selectedParcelId: string;
  onSelectParcel: (id: string) => void;
  onToggleCustf: (id: string) => void;
}

export default function OperationsDashboard({
  activeRole,
  parcels,
  selectedParcelId,
  onSelectParcel,
  onToggleCustf,
}: Props) {
  const [deliveryKg, setDeliveryKg] = useState<number>(350);
  const [previousKg, setPreviousKg] = useState<number>(2000);
  const [scaleResult, setScaleResult] = useState<Record<string, unknown> | null>(null);
  const [scaleError, setScaleError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  const selectedParcel = parcels.find((p) => p.parcelId === selectedParcelId) ?? parcels[0];
  const custfStatus = evaluateCustfAdminCompliance(selectedParcel);
  const carbonCluster = consolidateCarbonClusterWeb({
    clusterId: 'CLUSTER-TABASCO-2026',
    clusterName: 'Bloque Agroforestal Chontalpa Sur',
    parcels,
    minimumRequiredHectares: 6.0,
  });

  // Live preview metrics for Admin / Auditor (hidden for Blind Scale operator)
  const isBlindOperator = activeRole === 'acopiador';
  const projectedTotalKg = previousKg + deliveryKg;
  const projectedKgPerHa = Number((projectedTotalKg / selectedParcel.areaHectares).toFixed(1));
  const exceedsBiologicalCap = projectedKgPerHa > WEB_DOMAIN_CONSTANTS.TABASCO_YIELD_CAP_MAX_KG_HA;
  const yieldMeterPercent = Math.min(100, Math.round((projectedKgPerHa / 800) * 100));

  const handleSimulateScaleReception = () => {
    setScaleError(null);
    try {
      const result = processScaleReceptionByRole(
        {
          parcelId: selectedParcel.parcelId,
          producerId: selectedParcel.producerId,
          areaHectares: selectedParcel.areaHectares,
          previousCumulativeDryKg: previousKg,
          deliveredDryEquivalentKg: deliveryKg,
          readPointId: 'urn:epc:id:sgln:7500000.00001.0',
          isBlockedByCustf: custfStatus.isProducerBlocked,
        },
        activeRole,
      );
      setScaleResult(result as unknown as Record<string, unknown>);
    } catch (err) {
      setScaleResult(null);
      setScaleError(err instanceof Error ? err.message : String(err));
    }
  };

  const clusterProgressPct = Math.min(100, Math.round((carbonCluster.totalHectares / 6.0) * 100));

  return (
    <>
      <div className="kanan-grid-2col">
        {/* ================================================================= */}
        {/* COLUMNA 1: Guardián del Ecosistema (HU-03, HU-04, HU-05)          */}
        {/* ================================================================= */}
        <section style={cardStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: T.colors.secondaryGreen,
                }}
              >
                Épica 2 & 3 · Auditoría Satelital y Legal
              </span>
              <h2
                style={{
                  margin: '4px 0 0',
                  color: T.colors.primaryGreen,
                  fontSize: 21,
                  fontWeight: 800,
                }}
              >
                🛰️ Guardián del Ecosistema (EUDR, NDVI y CUSTF)
              </h2>
            </div>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 999,
                backgroundColor: T.colors.backgroundSecondary,
                color: T.colors.textSecondary,
                whiteSpace: 'nowrap',
              }}
            >
              JRC 2020 + Sentinel-2
            </span>
          </div>

          <p
            style={{
              fontSize: 13.5,
              color: T.colors.textSecondary,
              marginTop: 0,
              marginBottom: 18,
            }}
          >
            Selecciona un pasaporte parcelario para inspeccionar su línea base de deforestación
            (31/12/2020), salud multitemporal del cacaotal y candado legal SEMARNAT:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {parcels.map((p) => {
              const audit = evaluateCustfAdminCompliance(p);
              const isSelected = p.parcelId === selectedParcelId;
              const ndviInfo = NDVI_META[p.ndviAlertLevel];
              const ndviBarPct = Math.max(10, Math.min(100, Math.round(p.meanNdvi * 100)));

              return (
                <div
                  key={p.parcelId}
                  onClick={() => {
                    onSelectParcel(p.parcelId);
                    setScaleResult(null);
                    setScaleError(null);
                  }}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    backgroundColor: isSelected ? T.colors.softGreenBg : T.colors.backgroundPrimary,
                    border: `2px solid ${
                      isSelected ? T.colors.primaryGreen : T.colors.borderSubtle
                    }`,
                    boxShadow: isSelected
                      ? '0 6px 18px rgba(22, 74, 40, 0.10)'
                      : '0 1px 4px rgba(0,0,0,0.02)',
                  }}
                >
                  {/* Top Row: ID, Municipality & EUDR Semaphore */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: isSelected ? T.colors.primaryGreen : '#E5E0D5',
                          color: isSelected ? '#FFFFFF' : T.colors.textPrimary,
                        }}
                      >
                        {p.parcelId}
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: T.colors.earthCacao,
                          backgroundColor: T.colors.softCacaoBg,
                          padding: '2px 8px',
                          borderRadius: 6,
                        }}
                      >
                        📍 {p.municipality}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 999,
                        backgroundColor: p.eudrStatus === 'VERDE' ? '#DCFCE7' : '#FEE2E2',
                        color: p.eudrStatus === 'VERDE' ? T.colors.statusGreen : T.colors.statusRed,
                        border: `1px solid ${p.eudrStatus === 'VERDE' ? '#86EFAC' : '#FCA5A5'}`,
                      }}
                    >
                      {p.eudrStatus === 'VERDE' ? '🟢 EUDR VERDE' : '🔴 ALERTA EUDR ROJO'}
                    </span>
                  </div>

                  {/* Producer Name & Hectares */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 15.5, color: T.colors.textPrimary }}>
                      {p.producerName}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.colors.primaryGreen }}>
                      {p.areaHectares} ha{' '}
                      <span
                        style={{ fontSize: 11.5, fontWeight: 600, color: T.colors.textSecondary }}
                      >
                        ({p.areaHectares > 4 ? 'Polígono Obligatorio >4ha' : 'Minifundio <4ha'})
                      </span>
                    </div>
                  </div>

                  {/* NDVI Chromatic Health Bar */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1px solid ${T.colors.borderSubtle}`,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12.5,
                        marginBottom: 6,
                      }}
                    >
                      <span>
                        🌿 <strong>NDVI Sentinel-2:</strong> {p.meanNdvi} ·{' '}
                        <span style={{ color: ndviInfo.color, fontWeight: 700 }}>
                          {ndviInfo.label}
                        </span>
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.colors.earthCacao }}>
                        🌳 {p.shadeTreeCount} árboles sombra
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 7,
                        backgroundColor: '#ECE8DF',
                        borderRadius: 999,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${ndviBarPct}%`,
                          height: '100%',
                          backgroundColor: ndviInfo.color,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>

                  {/* CUSTF Legal Footer */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: audit.isProducerBlocked ? T.colors.statusRed : T.colors.statusGreen,
                      }}
                    >
                      {audit.isProducerBlocked
                        ? '⛔ BLOQUEADO POR CUSTF (Acahual post-2020 sin permiso)'
                        : '✅ Legalidad Agraria y CUSTF SEMARNAT en Regla'}
                    </span>

                    {p.acahualRemovalPost2020 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCustf(p.parcelId);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: `1px solid ${
                            p.hasVerifiedCustfPermit ? T.colors.statusRed : T.colors.primaryGreen
                          }`,
                          backgroundColor: '#FFFFFF',
                          color: p.hasVerifiedCustfPermit
                            ? T.colors.statusRed
                            : T.colors.primaryGreen,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {p.hasVerifiedCustfPermit
                          ? 'Revocar CUSTF SEMARNAT'
                          : '✓ Verificar Permiso CUSTF'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================================= */}
        {/* COLUMNA 2: Báscula Ciega & Registro GS1 EPCIS 2.0 (HU-06, HU-07)  */}
        {/* ================================================================= */}
        <section style={cardStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: T.colors.earthCacao,
                }}
              >
                Épica 3 · Custodia Física & Antifraude
              </span>
              <h2
                style={{
                  margin: '4px 0 0',
                  color: T.colors.earthCacao,
                  fontSize: 21,
                  fontWeight: 800,
                }}
              >
                ⚖️ Centro de Acopio (Báscula Ciega & EPCIS 2.0)
              </h2>
            </div>

            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 999,
                backgroundColor: isBlindOperator ? T.colors.softCacaoBg : T.colors.softGreenBg,
                color: isBlindOperator ? T.colors.earthCacao : T.colors.primaryGreen,
              }}
            >
              {isBlindOperator ? '🔒 Vista Ciega' : '👁️ Vista Auditoría'}
            </span>
          </div>

          {/* Active Parcel Context Banner */}
          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              border: `1px solid ${T.colors.borderSubtle}`,
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: T.colors.textSecondary }}>
                Parcela vinculada al pesaje:
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.colors.textPrimary }}>
                {selectedParcel.producerName} ({selectedParcel.parcelId})
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 8,
                  backgroundColor: T.colors.softGreenBg,
                  color: T.colors.primaryGreen,
                }}
              >
                📐 {selectedParcel.areaHectares} ha
              </span>
            </div>
          </div>

          {/* Role-Aware Biological Yield Cap Monitor */}
          {isBlindOperator ? (
            <div
              style={{
                backgroundColor: T.colors.softCacaoBg,
                border: `1px dashed ${T.colors.earthCacao}`,
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13.5, color: T.colors.earthCacao }}>
                🛡️ Modo Báscula Ciega Activo (Rol: Operador de Acopio)
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: T.colors.textSecondary }}>
                Por regla antifraude HU-06, el cupo remanente y el rendimiento acumulado (kg/ha) se
                ocultan en ventanilla para impedir que intermediarios inyecten cacao de parcelas
                deforestadas hasta llenar el tope.
              </p>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: exceedsBiologicalCap ? '#FEF2F2' : T.colors.backgroundPrimary,
                border: `1px solid ${exceedsBiologicalCap ? '#FCA5A5' : T.colors.borderSubtle}`,
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 16,
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
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.colors.textSecondary }}>
                  Termómetro Biológico Tabasco (450–650 kg/ha):
                </span>
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: exceedsBiologicalCap ? T.colors.statusRed : T.colors.statusGreen,
                  }}
                >
                  {projectedKgPerHa} kg/ha proyectados{' '}
                  {exceedsBiologicalCap ? '🚨 EXCESO BIOLÓGICO' : '✅ Rango Normal'}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 9,
                  backgroundColor: '#E5E0D5',
                  borderRadius: 999,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${yieldMeterPercent}%`,
                    height: '100%',
                    backgroundColor: exceedsBiologicalCap
                      ? T.colors.statusRed
                      : projectedKgPerHa >= 450
                        ? T.colors.goldHarvest
                        : T.colors.statusGreen,
                    transition: 'width 0.25s ease',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: T.colors.textMuted,
                  marginTop: 4,
                }}
              >
                <span>0 kg/ha</span>
                <span>Mín: 450 kg/ha</span>
                <span>Máx Tabasco: 650 kg/ha</span>
                <span>800+ kg/ha</span>
              </div>
            </div>
          )}

          {/* Scale Numeric Inputs + Sliders */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}
          >
            <div
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${T.colors.borderSubtle}`,
              }}
            >
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>
                Acumulado Previo (kg seco):
                <input
                  type="number"
                  value={previousKg}
                  onChange={(e) => setPreviousKg(Number(e.target.value))}
                  style={inputStyle}
                />
              </label>
              <input
                type="range"
                min={0}
                max={3000}
                step={50}
                value={previousKg}
                onChange={(e) => setPreviousKg(Number(e.target.value))}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>

            <div
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${T.colors.borderSubtle}`,
              }}
            >
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>
                Entrega Actual en Báscula (kg):
                <input
                  type="number"
                  value={deliveryKg}
                  onChange={(e) => setDeliveryKg(Number(e.target.value))}
                  style={inputStyle}
                />
              </label>
              <input
                type="range"
                min={10}
                max={1200}
                step={10}
                value={deliveryKg}
                onChange={(e) => setDeliveryKg(Number(e.target.value))}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
          </div>

          <button
            onClick={handleSimulateScaleReception}
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: 12,
              border: 'none',
              background: `linear-gradient(135deg, ${T.colors.primaryGreen} 0%, ${T.colors.secondaryGreen} 100%)`,
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(22, 74, 40, 0.22)',
              marginBottom: 16,
            }}
          >
            ⚖️ Registrar Recepción y Firmar Evento GS1 EPCIS 2.0 (Rol: {activeRole})
          </button>

          {scaleError && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                color: T.colors.statusRed,
                fontWeight: 700,
                fontSize: 13.5,
              }}
            >
              {scaleError}
            </div>
          )}

          {scaleResult && (
            <div
              style={{
                padding: 16,
                borderRadius: 14,
                backgroundColor: T.colors.backgroundPrimary,
                border: `1px solid ${T.colors.borderStrong}`,
                fontSize: 13,
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
                <span style={{ fontWeight: 800, color: T.colors.primaryGreen, fontSize: 14 }}>
                  ✅ Certificado GS1 EPCIS 2.0 Emitido (Vista: <code>{activeRole}</code>)
                </span>
                <button
                  onClick={() => setShowRawJson((prev) => !prev)}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: `1px solid ${T.colors.borderStrong}`,
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  {showRawJson ? 'Ocultar JSON' : 'Ver JSON Crudo'}
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 10,
                  marginBottom: showRawJson ? 12 : 0,
                }}
              >
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${T.colors.borderSubtle}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: T.colors.textMuted }}>ID Evento EPCIS</div>
                  <div style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: 12 }}>
                    {String(scaleResult.eventId ?? '—')}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${T.colors.borderSubtle}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: T.colors.textMuted }}>Peso Seco Recibido</div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>
                    {String(scaleResult.deliveredDryEquivalentKg ?? deliveryKg)} kg
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${T.colors.borderSubtle}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: T.colors.textMuted }}>Firma SHA-256</div>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 11.5 }}>
                    {String(scaleResult.payloadSha256 ?? '').slice(0, 18)}…
                  </div>
                </div>

                {'cumulativeKgPerHa' in scaleResult ? (
                  <div
                    style={{
                      backgroundColor: scaleResult.triggeredSilentAlert ? '#FEE2E2' : '#DCFCE7',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${
                        scaleResult.triggeredSilentAlert ? '#FCA5A5' : '#86EFAC'
                      }`,
                    }}
                  >
                    <div style={{ fontSize: 11, color: T.colors.textSecondary }}>
                      Auditoría Yield Cap
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 12.5,
                        color: scaleResult.triggeredSilentAlert
                          ? T.colors.statusRed
                          : T.colors.statusGreen,
                      }}
                    >
                      {String(scaleResult.cumulativeKgPerHa)} kg/ha{' '}
                      {scaleResult.triggeredSilentAlert ? '🚨 ALERTA' : '✅ OK'}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: T.colors.softCacaoBg,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${T.colors.borderSubtle}`,
                    }}
                  >
                    <div style={{ fontSize: 11, color: T.colors.earthCacao }}>Cupo Biológico</div>
                    <div style={{ fontWeight: 800, fontSize: 12, color: T.colors.earthCacao }}>
                      🔒 Oculto en Báscula
                    </div>
                  </div>
                )}
              </div>

              {showRawJson && (
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: '#181D18',
                    color: '#E7F3EC',
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {JSON.stringify(scaleResult, null, 2)}
                </pre>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ================================================================= */}
      {/* SECCIÓN INFERIOR: Consolidación de Bonos de Carbono (HU-09)       */}
      {/* ================================================================= */}
      <section style={{ ...cardStyle, marginTop: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: T.colors.secondaryGreen,
              }}
            >
              Épica 4 · Mercado Voluntario de Carbono (Verra VCS / Plan Vivo)
            </span>
            <h2
              style={{
                margin: '4px 0 0',
                color: T.colors.primaryGreen,
                fontSize: 21,
                fontWeight: 800,
              }}
            >
              🌳 Consolidación Digital de Minifundios ({'<'} 5 ha) para Bonos de Carbono (HU-09)
            </h2>
          </div>

          <span
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 13,
              backgroundColor: carbonCluster.meetsMinimumVolume
                ? T.colors.softGreenBg
                : T.colors.softGoldBg,
              color: carbonCluster.meetsMinimumVolume
                ? T.colors.statusGreen
                : T.colors.statusWarning,
              border: `1px solid ${carbonCluster.meetsMinimumVolume ? '#86EFAC' : '#FCD34D'}`,
            }}
          >
            {carbonCluster.meetsMinimumVolume
              ? '✅ Meta de Volumen de Certificación Alcanzada'
              : '⏳ En Acumulación de Superficie Comunitaria'}
          </span>
        </div>

        {/* Cluster Progress Bar */}
        <div
          style={{
            backgroundColor: T.colors.backgroundPrimary,
            padding: '14px 18px',
            borderRadius: 14,
            border: `1px solid ${T.colors.borderSubtle}`,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13.5,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            <span>
              Lote Comunitario: <strong>{carbonCluster.clusterName}</strong> (
              <code>{carbonCluster.clusterId}</code>)
            </span>
            <span style={{ color: T.colors.primaryGreen }}>
              {carbonCluster.totalHectares} ha / 6.0 ha requeridas ({clusterProgressPct}%)
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 10,
              backgroundColor: '#E5E0D5',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${clusterProgressPct}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${T.colors.primaryGreen} 0%, ${T.colors.accentEmerald} 100%)`,
                borderRadius: 999,
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
            fontSize: 14,
          }}
        >
          <div
            style={{
              backgroundColor: T.colors.softGreenBg,
              padding: '12px 16px',
              borderRadius: 12,
              border: `1px solid ${T.colors.secondaryGreen}30`,
            }}
          >
            <div style={{ fontSize: 12, color: T.colors.textSecondary, fontWeight: 700 }}>
              Parcelas Integradas (EUDR Verde & {'<'}5 ha)
            </div>
            <div style={{ fontWeight: 800, color: T.colors.primaryGreen, marginTop: 4 }}>
              {carbonCluster.acceptedParcelIds.join(', ') || '—'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FEF2F2',
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid #FECACA',
            }}
          >
            <div style={{ fontSize: 12, color: T.colors.textSecondary, fontWeight: 700 }}>
              Parcelas Excluidas del Lote
            </div>
            <div style={{ fontWeight: 800, color: T.colors.statusRed, marginTop: 4 }}>
              {carbonCluster.rejectedParcelIds.join(', ') || 'Ninguna'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              padding: '12px 16px',
              borderRadius: 12,
              border: `1px solid ${T.colors.borderSubtle}`,
            }}
          >
            <div style={{ fontSize: 12, color: T.colors.textSecondary, fontWeight: 700 }}>
              Superficie Consolidada
            </div>
            <div
              style={{ fontWeight: 800, fontSize: 18, color: T.colors.textPrimary, marginTop: 2 }}
            >
              {carbonCluster.totalHectares} ha
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.softCacaoBg,
              padding: '12px 16px',
              borderRadius: 12,
              border: `1px solid ${T.colors.borderSubtle}`,
            }}
          >
            <div style={{ fontSize: 12, color: T.colors.textSecondary, fontWeight: 700 }}>
              Inventario Dosel de Sombra
            </div>
            <div
              style={{ fontWeight: 800, fontSize: 18, color: T.colors.earthCacao, marginTop: 2 }}
            >
              🌳 {carbonCluster.totalShadeTrees} árboles
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
