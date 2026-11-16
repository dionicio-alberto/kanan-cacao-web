'use client';

import React, { useState } from 'react';
import { getProducerFriendlyParcelStatus } from '@/services/producerLogbookService';
import {
  consolidateCarbonClusterWeb,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

interface CarbonBonusModuleProps {
  parcels: ParcelAdminOverview[];
}

export default function CarbonBonusModule({ parcels }: CarbonBonusModuleProps) {
  const [goalHectares, setGoalHectares] = useState(6.0);

  const cluster = consolidateCarbonClusterWeb({
    clusterId: 'LOTE-TABASCO-01',
    clusterName: 'Grupo Comunitario Chontalpa',
    parcels,
    minimumRequiredHectares: goalHectares,
  });

  const progressPct = Math.min(100, Math.round((cluster.totalHectares / goalHectares) * 100));
  const estimatedTonsCo2 = Number((cluster.totalShadeTrees * 0.14).toFixed(1));

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section
        aria-labelledby="carbon-module-title"
        style={{
          backgroundColor: T.colors.surfaceCard,
          border: `1.5px solid ${T.colors.borderSubtle}`,
          borderRadius: 14,
          padding: '22px 22px',
          display: 'grid',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h1
              id="carbon-module-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.5rem',
                color: T.colors.primaryGreen,
              }}
            >
              Bonos de Carbono y Cuidado de Árboles de Sombra
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: T.colors.textSecondary }}>
              Al conservar árboles maderables, frutales y nativos dentro de tus cacaotales, tu
              parcela captura carbono y se suma con vecinos para acceder a pagos por conservación.
            </p>
          </div>

          <span
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.82rem',
              backgroundColor: cluster.meetsMinimumVolume
                ? T.colors.statusGreenBg
                : T.colors.statusWarningBg,
              color: cluster.meetsMinimumVolume ? T.colors.statusGreen : T.colors.statusWarning,
              border: `1px solid ${cluster.meetsMinimumVolume ? '#15803D' : '#B45309'}`,
            }}
          >
            {cluster.meetsMinimumVolume
              ? 'Meta comunitaria alcanzada'
              : 'Reuniendo superficie comunitaria'}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <div
            style={{
              backgroundColor: T.colors.softGreenBg,
              border: `1px solid ${T.colors.secondaryGreen}`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
              Superficie comunitaria sumada
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: T.colors.primaryGreen }}>
              {cluster.totalHectares} hectáreas
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.surfaceElevated,
              border: `1px solid ${T.colors.borderSubtle}`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
              Árboles de sombra participantes
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: T.colors.primaryGreen }}>
              {cluster.totalShadeTrees} árboles
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.softCacaoBg,
              border: `1px solid ${T.colors.earthCacao}`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
              Captura estimada de carbono
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: T.colors.earthCacao }}>
              ~{estimatedTonsCo2} toneladas CO2
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: T.colors.surfaceElevated,
            border: `1px solid ${T.colors.borderSubtle}`,
            borderRadius: 10,
            padding: 16,
            display: 'grid',
            gap: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
              Avance del grupo ({cluster.clusterName}) frente a la meta de {goalHectares} ha:
            </span>
            <strong style={{ color: T.colors.primaryGreen }}>{progressPct}% completado</strong>
          </div>

          <div
            style={{
              width: '100%',
              height: 12,
              backgroundColor: T.colors.backgroundSecondary,
              borderRadius: 6,
              overflow: 'hidden',
              border: `1px solid ${T.colors.borderControl}`,
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                backgroundColor: T.colors.primaryGreen,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label
              htmlFor="carbon-goal-select"
              style={{ fontSize: '0.8rem', color: T.colors.textSecondary }}
            >
              Meta de agrupación para certificar:
            </label>
            <select
              id="carbon-goal-select"
              value={goalHectares}
              onChange={(e) => setGoalHectares(Number(e.target.value))}
              className="field-input"
              style={{ width: 'auto', marginTop: 0, padding: '4px 10px', fontSize: '0.82rem' }}
            >
              <option value={6}>Meta inicial comunitaria (6.0 ha)</option>
              <option value={15}>Bloque ejidal mediano (15.0 ha)</option>
              <option value={50}>Bloque cooperativo completo (50.0 ha)</option>
            </select>
          </div>
        </div>

        <div className="table-scroll-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th scope="col">Participación</th>
                <th scope="col">Parcela</th>
                <th scope="col">Productor y municipio</th>
                <th scope="col">Tamaño</th>
                <th scope="col">Estado de monte y linderos</th>
                <th scope="col">Papeles del terreno</th>
                <th scope="col">Árboles de sombra</th>
              </tr>
            </thead>
            <tbody>
              {parcels.map((p) => {
                const isAccepted = cluster.acceptedParcelIds.includes(p.parcelId);
                const friendly = getProducerFriendlyParcelStatus(p);
                return (
                  <tr key={p.parcelId}>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: '0.74rem',
                          backgroundColor: isAccepted
                            ? T.colors.statusGreenBg
                            : T.colors.statusRedBg,
                          color: isAccepted ? T.colors.statusGreen : T.colors.statusRed,
                          border: `1px solid ${isAccepted ? '#15803D' : '#B91C1C'}`,
                        }}
                      >
                        {isAccepted ? 'Sumada al grupo' : 'Por regularizar'}
                      </span>
                    </td>
                    <td>
                      <strong>{p.parcelName || p.parcelId}</strong>
                    </td>
                    <td>
                      {p.producerName} ({p.municipality})
                    </td>
                    <td>{p.areaHectares} ha</td>
                    <td>{friendly.forestStatusLabel}</td>
                    <td>{friendly.papersAreClear ? 'En regla' : 'Pendiente constancia'}</td>
                    <td>
                      <strong>{p.shadeTreeCount} árboles</strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
