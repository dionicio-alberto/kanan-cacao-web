'use client';

import React, { useState } from 'react';
import { processScaleReceptionByRole } from '@/services/blindScaleAndTracesService';
import {
  consolidateCarbonClusterWeb,
  EudrStatus,
  evaluateCustfAdminCompliance,
  NdviAlertLevel,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import { WEB_DOMAIN_CONSTANTS, WebUserRole } from '@/types/adminDomain';

const NDVI_META: Record<
  NdviAlertLevel,
  { label: string; textColor: string; bgColor: string; borderColor: string }
> = {
  VIGOR_AGROFORESTAL_OPTIMO: {
    label: 'Vigor agroforestal óptimo',
    textColor: T.colors.statusGreen,
    bgColor: T.colors.statusGreenBg,
    borderColor: '#15803D',
  },
  ESTRES_HIDRICO_TEMPRANO: {
    label: 'Estrés hídrico temprano',
    textColor: T.colors.statusWarning,
    bgColor: T.colors.statusWarningBg,
    borderColor: '#B45309',
  },
  FOCO_PLAGA_FUNGICA_ALERTA: {
    label: 'Alerta fitosanitaria (moniliasis)',
    textColor: T.colors.statusRed,
    bgColor: T.colors.statusRedBg,
    borderColor: '#B91C1C',
  },
};

type FilterOption = 'ALL' | EudrStatus;

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
  const [statusFilter, setStatusFilter] = useState<FilterOption>('ALL');
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

  const filteredParcels =
    statusFilter === 'ALL' ? parcels : parcels.filter((p) => p.eudrStatus === statusFilter);

  // HU-06 withholds cumulative yield metrics when the active role is the scale operator.
  const isBlindOperator = activeRole === 'acopiador';
  const projectedTotalKg = previousKg + deliveryKg;
  const projectedKgPerHa = Number((projectedTotalKg / selectedParcel.areaHectares).toFixed(1));
  const exceedsBiologicalCap = projectedKgPerHa > WEB_DOMAIN_CONSTANTS.TABASCO_YIELD_CAP_MAX_KG_HA;
  const yieldMeterPercent = Math.min(100, Math.round((projectedKgPerHa / 800) * 100));
  const clusterProgressPct = Math.min(100, Math.round((carbonCluster.totalHectares / 6.0) * 100));

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

  return (
    <>
      <div className="workbench-split">
        <section
          id="padron-parcelas"
          aria-labelledby="heading-padron"
          style={{
            backgroundColor: T.colors.surfaceCard,
            border: `1px solid ${T.colors.borderSubtle}`,
            borderRadius: 12,
            padding: '22px 20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <h2
              id="heading-padron"
              style={{
                margin: 0,
                color: T.colors.primaryGreen,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.35rem',
              }}
            >
              1. Padrón de parcelas (EUDR, NDVI y CUSTF)
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: T.colors.textSecondary,
              }}
            >
              [DATOS DE DEMOSTRACIÓN]
            </span>
          </div>

          <p style={{ fontSize: '0.9rem', color: T.colors.textSecondary, marginTop: 0 }}>
            Selecciona una parcela para cargar su expediente en la mesa de acopio y en el linter
            cartográfico:
          </p>

          <div
            role="group"
            aria-label="Filtrar parcelas por dictamen EUDR"
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            {(
              [
                { key: 'ALL', label: `Todas (${parcels.length})` },
                {
                  key: 'VERDE',
                  label: `EUDR Verde (${parcels.filter((p) => p.eudrStatus === 'VERDE').length})`,
                },
                {
                  key: 'ROJO',
                  label: `Alerta Rojo (${parcels.filter((p) => p.eudrStatus === 'ROJO').length})`,
                },
                {
                  key: 'PENDIENTE_REVISION',
                  label: `En revisión (${
                    parcels.filter((p) => p.eudrStatus === 'PENDIENTE_REVISION').length
                  })`,
                },
              ] as { key: FilterOption; label: string }[]
            ).map((item) => {
              const active = statusFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(item.key)}
                  className="btn-control"
                  style={{
                    minHeight: 44,
                    padding: '6px 12px',
                    fontSize: '0.8125rem',
                    backgroundColor: active ? T.colors.primaryGreen : T.colors.surfaceCard,
                    color: active ? '#FFFFFF' : T.colors.textPrimary,
                    borderColor: active ? T.colors.primaryGreen : T.colors.borderControl,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {filteredParcels.length === 0 ? (
            <div
              role="status"
              style={{
                padding: 20,
                borderRadius: 10,
                backgroundColor: T.colors.backgroundPrimary,
                border: `2px dashed ${T.colors.borderControl}`,
              }}
            >
              <p style={{ margin: '0 0 8px', fontWeight: 700, color: T.colors.textPrimary }}>
                No hay parcelas con el filtro seleccionado ({statusFilter}).
              </p>
              <p
                style={{ margin: '0 0 14px', fontSize: '0.875rem', color: T.colors.textSecondary }}
              >
                Todas las parcelas de demostración cuentan actualmente con dictamen definitivo
                (Verde o Rojo). Restablece el filtro para ver el padrón completo.
              </p>
              <button type="button" onClick={() => setStatusFilter('ALL')} className="btn-primary">
                Mostrar todas las parcelas
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredParcels.map((p) => {
                const audit = evaluateCustfAdminCompliance(p);
                const isSelected = p.parcelId === selectedParcelId;
                const ndviInfo = NDVI_META[p.ndviAlertLevel];
                const ndviBarPct = Math.max(10, Math.min(100, Math.round(p.meanNdvi * 100)));

                return (
                  <article
                    key={p.parcelId}
                    aria-label={`Expediente de ${p.producerName}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        onSelectParcel(p.parcelId);
                        setScaleResult(null);
                        setScaleError(null);
                      }}
                      className="parcel-selector-btn"
                    >
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
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: isSelected
                              ? T.colors.primaryGreen
                              : T.colors.backgroundSecondary,
                            color: isSelected ? '#FFFFFF' : T.colors.textPrimary,
                          }}
                        >
                          {p.parcelId} · {p.municipality}
                        </span>

                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor:
                              p.eudrStatus === 'VERDE'
                                ? T.colors.statusGreenBg
                                : T.colors.statusRedBg,
                            color:
                              p.eudrStatus === 'VERDE' ? T.colors.statusGreen : T.colors.statusRed,
                            border: `1px solid ${p.eudrStatus === 'VERDE' ? '#15803D' : '#B91C1C'}`,
                          }}
                        >
                          {p.eudrStatus === 'VERDE' ? 'EUDR VERDE' : 'ALERTA EUDR ROJO'}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{p.producerName}</span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            color: T.colors.primaryGreen,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {p.areaHectares} ha
                        </span>
                      </div>

                      <div
                        style={{
                          backgroundColor: T.colors.surfaceCard,
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: `1px solid ${T.colors.borderSubtle}`,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.8125rem',
                            marginBottom: 4,
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>
                            <strong>NDVI Sentinel-2:</strong> {p.meanNdvi} ({ndviInfo.label})
                          </span>
                          <span>
                            <strong>Sombra:</strong> {p.shadeTreeCount} árboles
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: 8,
                            backgroundColor: T.colors.backgroundSecondary,
                            borderRadius: 4,
                            overflow: 'hidden',
                            border: `1px solid ${T.colors.borderControl}`,
                          }}
                        >
                          <div
                            style={{
                              width: `${ndviBarPct}%`,
                              height: '100%',
                              backgroundColor: ndviInfo.borderColor,
                            }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: audit.isProducerBlocked
                            ? T.colors.statusRed
                            : T.colors.statusGreen,
                        }}
                      >
                        {audit.isProducerBlocked
                          ? 'Estado CUSTF: Productor bloqueado (acahual post-2020 sin permiso SEMARNAT)'
                          : 'Estado CUSTF: Legalidad agraria y permiso SEMARNAT en regla'}
                      </div>
                    </button>

                    {p.acahualRemovalPost2020 && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 8,
                          padding: '8px 12px',
                          backgroundColor: T.colors.backgroundPrimary,
                          borderRadius: 8,
                          border: `1px solid ${T.colors.borderSubtle}`,
                        }}
                      >
                        <span style={{ fontSize: '0.8125rem', color: T.colors.textSecondary }}>
                          Remoción de acahual post-2020 registrada en bitácora:
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleCustf(p.parcelId)}
                          className="btn-control"
                          style={{
                            minHeight: 44,
                            padding: '6px 12px',
                            fontSize: '0.8125rem',
                            borderColor: p.hasVerifiedCustfPermit
                              ? T.colors.statusRed
                              : T.colors.primaryGreen,
                            color: p.hasVerifiedCustfPermit
                              ? T.colors.statusRed
                              : T.colors.primaryGreen,
                          }}
                        >
                          {p.hasVerifiedCustfPermit
                            ? `Revocar permiso CUSTF (${p.parcelId})`
                            : `Verificar permiso CUSTF (${p.parcelId})`}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section
          id="bascula-epcis"
          aria-labelledby="heading-bascula"
          style={{
            backgroundColor: T.colors.surfaceCard,
            border: `2px solid ${T.colors.primaryGreen}`,
            borderRadius: 12,
            padding: '24px 22px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <h2
              id="heading-bascula"
              style={{
                margin: 0,
                color: T.colors.primaryGreen,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.45rem',
              }}
            >
              2. Mesa de acopio: báscula ciega y emisión GS1 EPCIS 2.0
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 4,
                backgroundColor: isBlindOperator ? T.colors.softCacaoBg : T.colors.softGreenBg,
                color: isBlindOperator ? T.colors.earthCacao : T.colors.primaryGreen,
                border: `1px solid ${
                  isBlindOperator ? T.colors.earthCacao : T.colors.primaryGreen
                }`,
              }}
            >
              {isBlindOperator ? 'Modo ciego activo (acopiador)' : 'Modo auditoría completa'}
            </span>
          </div>

          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              border: `1px solid ${T.colors.borderSubtle}`,
              borderRadius: 8,
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
              <div style={{ fontSize: '0.8125rem', color: T.colors.textSecondary }}>
                Expediente activo en báscula:
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: T.colors.textPrimary }}>
                {selectedParcel.producerName} ({selectedParcel.parcelId})
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: T.colors.primaryGreen,
                backgroundColor: T.colors.softGreenBg,
                padding: '4px 10px',
                borderRadius: 6,
                border: `1px solid ${T.colors.primaryGreen}`,
              }}
            >
              Superficie: {selectedParcel.areaHectares} ha
            </div>
          </div>

          {isBlindOperator ? (
            <div
              style={{
                backgroundColor: T.colors.softCacaoBg,
                border: `2px solid ${T.colors.earthCacao}`,
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: T.colors.earthCacao }}>
                Restricción antifraude activa (HU-06: Báscula ciega)
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: T.colors.textSecondary }}>
                El operador de báscula registra el peso entregado sin visualizar el cupo acumulado
                ni el límite biológico de la parcela. Esto impide rellenar el cupo con cacao externo
                proveniente de predios no auditados.
              </p>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: exceedsBiologicalCap
                  ? T.colors.statusRedBg
                  : T.colors.backgroundPrimary,
                border: `1px solid ${exceedsBiologicalCap ? '#B91C1C' : T.colors.borderControl}`,
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 16,
              }}
            >
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
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Rendimiento biológico proyectado (umbral Tabasco: 450 a 650 kg/ha):
                </span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: exceedsBiologicalCap ? T.colors.statusRed : T.colors.statusGreen,
                  }}
                >
                  {projectedKgPerHa} kg/ha (
                  {exceedsBiologicalCap ? 'Exceso biológico detectado' : 'Dentro del umbral'})
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 10,
                  backgroundColor: T.colors.backgroundSecondary,
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: `1px solid ${T.colors.borderControl}`,
                }}
              >
                <div
                  style={{
                    width: `${yieldMeterPercent}%`,
                    height: '100%',
                    backgroundColor: exceedsBiologicalCap
                      ? '#B91C1C'
                      : projectedKgPerHa >= 450
                        ? '#B45309'
                        : '#15803D',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: T.colors.textSecondary,
                  marginTop: 6,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span>0 kg/ha</span>
                <span>Mín: 450 kg/ha</span>
                <span>Máx: 650 kg/ha</span>
                <span>800+ kg/ha</span>
              </div>
            </div>
          )}

          <div className="form-pair-grid" style={{ marginBottom: 16 }}>
            <div
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                padding: 14,
                borderRadius: 8,
                border: `1px solid ${T.colors.borderSubtle}`,
              }}
            >
              <label
                htmlFor="input-previous-kg"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700 }}
              >
                Acumulado previo del ciclo (kg seco):
              </label>
              <input
                id="input-previous-kg"
                type="number"
                min={0}
                max={10000}
                value={previousKg}
                onChange={(e) => setPreviousKg(Number(e.target.value))}
                className="field-input"
              />
              <label
                htmlFor="slider-previous-kg"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: T.colors.textSecondary,
                  marginTop: 8,
                }}
              >
                Ajuste rápido de acumulado previo (0 a 3000 kg):
              </label>
              <input
                id="slider-previous-kg"
                type="range"
                min={0}
                max={3000}
                step={50}
                value={previousKg}
                onChange={(e) => setPreviousKg(Number(e.target.value))}
                style={{ width: '100%', minHeight: 32, marginTop: 4 }}
              />
            </div>

            <div
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                padding: 14,
                borderRadius: 8,
                border: `1px solid ${T.colors.borderSubtle}`,
              }}
            >
              <label
                htmlFor="input-delivery-kg"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700 }}
              >
                Entrega actual en báscula (kg seco):
              </label>
              <input
                id="input-delivery-kg"
                type="number"
                min={1}
                max={5000}
                value={deliveryKg}
                onChange={(e) => setDeliveryKg(Number(e.target.value))}
                className="field-input"
              />
              <label
                htmlFor="slider-delivery-kg"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: T.colors.textSecondary,
                  marginTop: 8,
                }}
              >
                Ajuste rápido de entrega actual (10 a 1200 kg):
              </label>
              <input
                id="slider-delivery-kg"
                type="range"
                min={10}
                max={1200}
                step={10}
                value={deliveryKg}
                onChange={(e) => setDeliveryKg(Number(e.target.value))}
                style={{ width: '100%', minHeight: 32, marginTop: 4 }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSimulateScaleReception}
            className="btn-primary"
            style={{ width: '100%', marginBottom: 16 }}
          >
            Registrar recepción y firmar evento GS1 EPCIS 2.0 (Rol: {activeRole})
          </button>

          {scaleError && (
            <div
              role="alert"
              style={{
                padding: '14px 16px',
                borderRadius: 8,
                backgroundColor: T.colors.statusRedBg,
                border: '2px solid #B91C1C',
                color: T.colors.statusRed,
                fontSize: '0.875rem',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{scaleError}</div>
              <div style={{ fontSize: '0.8125rem' }}>
                Acción requerida: verifica el permiso CUSTF de SEMARNAT en el padrón izquierdo o
                selecciona una parcela habilitada antes de registrar el pesaje.
              </div>
            </div>
          )}

          {!scaleError && !scaleResult && (
            <div
              role="status"
              style={{
                padding: '14px 16px',
                borderRadius: 8,
                backgroundColor: T.colors.backgroundPrimary,
                border: `1px dashed ${T.colors.borderControl}`,
                fontSize: '0.85rem',
                color: T.colors.textSecondary,
              }}
            >
              <strong>Estado de recepción:</strong> Sin eventos emitidos para{' '}
              <code>{selectedParcel.parcelId}</code> en esta sesión. Ajusta los kilogramos y pulsa
              el botón superior para generar el certificado criptográfico GS1 EPCIS 2.0.
            </div>
          )}

          {scaleResult && (
            <div
              role="region"
              aria-label="Certificado GS1 EPCIS 2.0 emitido"
              style={{
                padding: 16,
                borderRadius: 10,
                backgroundColor: T.colors.backgroundPrimary,
                border: `2px solid ${T.colors.borderControl}`,
                fontSize: '0.85rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{ fontWeight: 700, color: T.colors.primaryGreen, fontSize: '0.95rem' }}
                >
                  Certificado GS1 EPCIS 2.0 emitido (vista para rol <code>{activeRole}</code>)
                </span>
                <button
                  type="button"
                  onClick={() => setShowRawJson((prev) => !prev)}
                  className="btn-control"
                  style={{
                    minHeight: 44,
                    padding: '6px 12px',
                    fontSize: '0.8125rem',
                  }}
                >
                  {showRawJson ? 'Ocultar JSON-LD crudo' : 'Inspeccionar JSON-LD crudo'}
                </button>
              </div>

              <div className="diagnostics-strip" style={{ marginBottom: showRawJson ? 12 : 0 }}>
                <div
                  style={{
                    backgroundColor: T.colors.surfaceCard,
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: `1px solid ${T.colors.borderSubtle}`,
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: T.colors.textSecondary }}>
                    Parcela origen
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {String(scaleResult.parcelId ?? selectedParcel.parcelId)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: T.colors.surfaceCard,
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: `1px solid ${T.colors.borderSubtle}`,
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: T.colors.textSecondary }}>
                    Peso seco registrado
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {String(scaleResult.deliveredDryEquivalentKg ?? deliveryKg)} kg
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: T.colors.surfaceCard,
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: `1px solid ${T.colors.borderSubtle}`,
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: T.colors.textSecondary }}>
                    Huella SHA-256 (EPCIS)
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                    }}
                  >
                    {String(
                      (scaleResult.epcisEvent as Record<string, unknown> | undefined)
                        ?.payloadSha256 ?? '',
                    ).slice(0, 18)}
                    ...
                  </div>
                </div>

                {'cumulativeKgPerHa' in scaleResult ? (
                  <div
                    style={{
                      backgroundColor: scaleResult.triggeredYieldCapAlert
                        ? T.colors.statusRedBg
                        : T.colors.statusGreenBg,
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: `1px solid ${
                        scaleResult.triggeredYieldCapAlert ? '#B91C1C' : '#15803D'
                      }`,
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: T.colors.textSecondary }}>
                      Dictamen de rendimiento
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: scaleResult.triggeredYieldCapAlert
                          ? T.colors.statusRed
                          : T.colors.statusGreen,
                      }}
                    >
                      {String(scaleResult.cumulativeKgPerHa)} kg/ha (
                      {scaleResult.triggeredYieldCapAlert ? 'Alerta exceso' : 'Normal'})
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: T.colors.softCacaoBg,
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: `1px solid ${T.colors.earthCacao}`,
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: T.colors.earthCacao }}>
                      Dictamen de rendimiento
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        color: T.colors.earthCacao,
                      }}
                    >
                      Oculto en báscula ciega
                    </div>
                  </div>
                )}
              </div>

              {showRawJson && (
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    borderRadius: 6,
                    backgroundColor: '#141814',
                    color: '#E3F0E7',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
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

      <section
        id="consolidacion-carbono"
        aria-labelledby="heading-carbono"
        style={{
          backgroundColor: T.colors.surfaceCard,
          border: `1px solid ${T.colors.borderSubtle}`,
          borderRadius: 12,
          padding: '24px 22px',
          marginTop: 28,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <h2
              id="heading-carbono"
              style={{
                margin: 0,
                color: T.colors.primaryGreen,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.35rem',
              }}
            >
              4. Libro mayor de consolidación de minifundios ({'<'} 5 ha) para bonos de carbono
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: T.colors.textSecondary }}>
              Agrupación digital comunitaria (HU-09) para lotes con estatus EUDR Verde, inventario
              de sombra activo y permiso CUSTF en regla:
            </p>
          </div>

          <span
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: '0.8125rem',
              backgroundColor: carbonCluster.meetsMinimumVolume
                ? T.colors.statusGreenBg
                : T.colors.statusWarningBg,
              color: carbonCluster.meetsMinimumVolume
                ? T.colors.statusGreen
                : T.colors.statusWarning,
              border: `1px solid ${carbonCluster.meetsMinimumVolume ? '#15803D' : '#B45309'}`,
            }}
          >
            {carbonCluster.meetsMinimumVolume
              ? 'Meta comunitaria alcanzada (mínimo 6.0 ha)'
              : 'En acumulación de superficie comunitaria'}
          </span>
        </div>

        <div
          style={{
            backgroundColor: T.colors.backgroundPrimary,
            padding: '14px 16px',
            borderRadius: 8,
            border: `1px solid ${T.colors.borderSubtle}`,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              fontWeight: 700,
              marginBottom: 8,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span>
              Lote: {carbonCluster.clusterName} (<code>{carbonCluster.clusterId}</code>) · Árboles
              de sombra consolidados: <strong>{carbonCluster.totalShadeTrees}</strong>
            </span>
            <span style={{ color: T.colors.primaryGreen, fontFamily: 'var(--font-mono)' }}>
              {carbonCluster.totalHectares} ha / 6.0 ha ({clusterProgressPct}%)
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 10,
              backgroundColor: T.colors.backgroundSecondary,
              borderRadius: 4,
              overflow: 'hidden',
              border: `1px solid ${T.colors.borderControl}`,
            }}
          >
            <div
              style={{
                width: `${clusterProgressPct}%`,
                height: '100%',
                backgroundColor: T.colors.primaryGreen,
              }}
            />
          </div>
        </div>

        <div className="table-scroll-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th scope="col">Dictamen de integración</th>
                <th scope="col">Folio de parcela</th>
                <th scope="col">Productor y municipio</th>
                <th scope="col">Superficie ({'<'} 5 ha)</th>
                <th scope="col">EUDR 2020</th>
                <th scope="col">CUSTF SEMARNAT</th>
                <th scope="col">Árboles de sombra</th>
              </tr>
            </thead>
            <tbody>
              {parcels.map((p) => {
                const isAccepted = carbonCluster.acceptedParcelIds.includes(p.parcelId);
                const custf = evaluateCustfAdminCompliance(p);
                return (
                  <tr key={p.parcelId}>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          backgroundColor: isAccepted
                            ? T.colors.statusGreenBg
                            : T.colors.statusRedBg,
                          color: isAccepted ? T.colors.statusGreen : T.colors.statusRed,
                          border: `1px solid ${isAccepted ? '#15803D' : '#B91C1C'}`,
                        }}
                      >
                        {isAccepted ? 'Integrada al bloque' : 'Excluida del bloque'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {p.parcelId}
                    </td>
                    <td>
                      {p.producerName} ({p.municipality})
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{p.areaHectares} ha</td>
                    <td>{p.eudrStatus}</td>
                    <td>{custf.isProducerBlocked ? 'Bloqueado' : 'En regla'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{p.shadeTreeCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
