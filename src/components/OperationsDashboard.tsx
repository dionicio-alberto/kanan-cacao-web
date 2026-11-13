'use client';

import React, { useState } from 'react';
import { processScaleReceptionByRole } from '@/services/blindScaleAndTracesService';
import {
  consolidateCarbonClusterWeb,
  evaluateCustfAdminCompliance,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import { WebUserRole } from '@/types/adminDomain';

const card: React.CSSProperties = {
  backgroundColor: T.colors.surfaceCard,
  border: `1px solid ${T.colors.borderSubtle}`,
  borderRadius: 16,
  padding: 24,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  marginTop: 4,
  borderRadius: 8,
  border: `1px solid ${T.colors.borderSubtle}`,
  fontSize: 16,
  boxSizing: 'border-box',
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

  const selectedParcel = parcels.find((p) => p.parcelId === selectedParcelId) ?? parcels[0];
  const custfStatus = evaluateCustfAdminCompliance(selectedParcel);
  const carbonCluster = consolidateCarbonClusterWeb({
    clusterId: 'CLUSTER-TABASCO-2026',
    clusterName: 'Bloque Agroforestal Chontalpa Sur',
    parcels,
    minimumRequiredHectares: 6.0,
  });

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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: 24,
        }}
      >
        {/* HU-03, HU-04, HU-05 */}
        <section style={card}>
          <h2 style={{ marginTop: 0, color: T.colors.primaryGreen }}>
            🛰️ Guardián del Ecosistema (EUDR 2020, NDVI y CUSTF)
          </h2>
          <p style={{ fontSize: 14, color: T.colors.textSecondary }}>
            Selecciona una parcela para auditar su cobertura arbórea (corte 31/12/2020), vigor
            Sentinel-2 y permiso CUSTF de SEMARNAT:
          </p>
          {parcels.map((p) => {
            const audit = evaluateCustfAdminCompliance(p);
            const isSelected = p.parcelId === selectedParcelId;
            return (
              <div
                key={p.parcelId}
                onClick={() => {
                  onSelectParcel(p.parcelId);
                  setScaleResult(null);
                  setScaleError(null);
                }}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                  cursor: 'pointer',
                  backgroundColor: isSelected ? T.colors.softGreenBg : T.colors.backgroundPrimary,
                  border: `2px solid ${isSelected ? T.colors.primaryGreen : T.colors.borderSubtle}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>
                    {p.producerName} — {p.areaHectares} ha
                  </span>
                  <span
                    style={{
                      color: p.eudrStatus === 'VERDE' ? T.colors.statusGreen : T.colors.statusRed,
                    }}
                  >
                    {p.eudrStatus === 'VERDE' ? '🟢 EUDR VERDE' : '🔴 ALERTA EUDR ROJO'}
                  </span>
                </div>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  🌿 <strong>NDVI Sentinel-2:</strong> {p.meanNdvi} ({p.ndviAlertLevel}) · 🌳{' '}
                  <strong>Sombra:</strong> {p.shadeTreeCount} árboles
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: audit.isProducerBlocked ? T.colors.statusRed : T.colors.statusGreen,
                    }}
                  >
                    {audit.isProducerBlocked
                      ? '⛔ BLOQUEADO POR CUSTF (Acahual post-2020 sin permiso)'
                      : '✅ Legalidad Agraria y CUSTF en Regla'}
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
                        border: `1px solid ${T.colors.earthCacao}`,
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {p.hasVerifiedCustfPermit
                        ? 'Revocar CUSTF SEMARNAT'
                        : 'Verificar Permiso CUSTF'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* HU-06, HU-07 */}
        <section style={card}>
          <h2 style={{ marginTop: 0, color: T.colors.earthCacao }}>
            ⚖️ Recepción en Centro de Acopio (Báscula Ciega & EPCIS 2.0)
          </h2>
          <p style={{ fontSize: 14, color: T.colors.textSecondary }}>
            Parcela activa: <strong>{selectedParcel.parcelId}</strong> (
            {selectedParcel.areaHectares} ha). Límite biológico en Tabasco:{' '}
            <strong>450 a 650 kg/ha</strong>.
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <label style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
              Acumulado Previo (kg seco):
              <input
                type="number"
                value={previousKg}
                onChange={(e) => setPreviousKg(Number(e.target.value))}
                style={inputStyle}
              />
            </label>
            <label style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
              Entrega Actual en Báscula (kg):
              <input
                type="number"
                value={deliveryKg}
                onChange={(e) => setDeliveryKg(Number(e.target.value))}
                style={inputStyle}
              />
            </label>
          </div>
          <button
            onClick={handleSimulateScaleReception}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 12,
              border: 'none',
              backgroundColor: T.colors.primaryGreen,
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            Registrar Recepción y Firmar Evento GS1 EPCIS 2.0 (Rol: {activeRole})
          </button>
          {scaleError && (
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                backgroundColor: '#FEE2E2',
                color: T.colors.statusRed,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {scaleError}
            </div>
          )}
          {scaleResult && (
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                backgroundColor: T.colors.backgroundPrimary,
                border: `1px solid ${T.colors.borderSubtle}`,
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Respuesta proyectada para rol <code>{activeRole}</code>:
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(scaleResult, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </div>

      {/* HU-09 */}
      <section style={{ ...card, marginTop: 24 }}>
        <h2 style={{ marginTop: 0, color: T.colors.primaryGreen }}>
          🌳 Consolidación Digital de Minifundios ({'<'} 5 ha) para Bonos de Carbono (HU-09)
        </h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 15 }}>
          <div>
            <strong>Aceptadas:</strong> {carbonCluster.acceptedParcelIds.join(', ') || '—'}
          </div>
          <div>
            <strong>Rechazadas:</strong> {carbonCluster.rejectedParcelIds.join(', ') || '—'}
          </div>
          <div>
            <strong>Superficie:</strong> {carbonCluster.totalHectares} ha
          </div>
          <div>
            <strong>Árboles de sombra:</strong> {carbonCluster.totalShadeTrees}
          </div>
          <div
            style={{
              fontWeight: 700,
              color: carbonCluster.meetsMinimumVolume
                ? T.colors.statusGreen
                : T.colors.statusWarning,
            }}
          >
            {carbonCluster.meetsMinimumVolume
              ? '✅ Meta de volumen de certificación alcanzada'
              : '⏳ En acumulación de superficie'}
          </div>
        </div>
      </section>
    </>
  );
}
