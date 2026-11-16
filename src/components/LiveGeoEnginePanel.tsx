'use client';

import React, { useEffect, useState } from 'react';
import {
  buildHistoricalSnapshotsFallback,
  fetchParcelHistoricalSnapshotsLive,
  getSnapshotImageSrc,
  projectCoordinatesToOrthoSvgPoints,
  requestTracesNtExportLive,
} from '@/services/geoEngineLiveClient';
import { getProducerFriendlyParcelStatus } from '@/services/producerLogbookService';
import {
  evaluateCustfAdminCompliance,
  HistoricalParcelSnapshot,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

const SVG_W = 420;
const SVG_H = 240;

const DEFAULT_TABASCO_RING: number[][] = [
  [-93.2845, 18.256],
  [-93.281, 18.256],
  [-93.281, 18.2525],
  [-93.2845, 18.2525],
  [-93.2845, 18.256],
];

function CenteredHistoricalParcelSvg({
  snapshot,
  coordinates,
  width = SVG_W,
  height = SVG_H,
  showLabels = true,
}: {
  snapshot: HistoricalParcelSnapshot;
  coordinates: number[][];
  width?: number;
  height?: number;
  showLabels?: boolean;
}) {
  const [useDirectFallback, setUseDirectFallback] = useState(false);
  const points = projectCoordinatesToOrthoSvgPoints(
    coordinates,
    snapshot.extent_bbox,
    width,
    height
  );
  const polygonPointsStr = points.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const imgHref = useDirectFallback
    ? snapshot.direct_ortho_url
    : getSnapshotImageSrc(snapshot);

  return (
    <svg
      role="img"
      aria-label={`Fotografía satelital de parcela: ${snapshot.label}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        width: '100%',
        height: 'auto',
        aspectRatio: `${width} / ${height}`,
        backgroundColor: '#112418',
        borderRadius: 8,
        border: `2px solid ${T.colors.primaryGreen}`,
        display: 'block',
      }}
    >
      <image
        href={imgHref}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="none"
        onError={() => {
          if (!useDirectFallback) {
            setUseDirectFallback(true);
          }
        }}
      />

      {points.length >= 3 ? (
        <polygon
          points={polygonPointsStr}
          fill="rgba(134, 239, 172, 0.24)"
          stroke="#4ADE80"
          strokeWidth={showLabels ? 3 : 2.2}
        />
      ) : null}

      {showLabels
        ? points.map((pt, idx) => (
            <circle
              key={`pt-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={4}
              fill="#112418"
              stroke="#86EFAC"
              strokeWidth={2}
            />
          ))
        : null}
    </svg>
  );
}

export default function LiveGeoEnginePanel({ parcel }: { parcel: ParcelAdminOverview }) {
  const activeCoordinates =
    Array.isArray(parcel.coordinates) && parcel.coordinates.length >= 3
      ? parcel.coordinates
      : DEFAULT_TABASCO_RING;

  const [snapshots, setSnapshots] = useState<HistoricalParcelSnapshot[]>(() =>
    Array.isArray(parcel.historicalSnapshots) && parcel.historicalSnapshots.length === 7
      ? parcel.historicalSnapshots
      : buildHistoricalSnapshotsFallback(parcel.parcelId, activeCoordinates)
  );
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('registro_actual');
  const [persistedOnServer, setPersistedOnServer] = useState<boolean>(
    Boolean(parcel.historicalSnapshots && parcel.historicalSnapshots.length === 7)
  );
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const coordKey = JSON.stringify(activeCoordinates);

  useEffect(() => {
    setExportMsg(null);
    setError(null);
    setSelectedPeriodKey('registro_actual');

    // Si los 7 momentos ya llegaron guardados en la parcela desde el servidor, no se re-ejecutan.
    if (Array.isArray(parcel.historicalSnapshots) && parcel.historicalSnapshots.length === 7) {
      setSnapshots(parcel.historicalSnapshots);
      setPersistedOnServer(true);
      return;
    }

    let active = true;
    const parsedCoords = JSON.parse(coordKey) as number[][];
    const localFallback = buildHistoricalSnapshotsFallback(parcel.parcelId, parsedCoords);
    setSnapshots(localFallback);

    fetchParcelHistoricalSnapshotsLive(parcel.parcelId)
      .then((res) => {
        if (active && Array.isArray(res.snapshots) && res.snapshots.length === 7) {
          setSnapshots(res.snapshots);
          setPersistedOnServer(Boolean(res.persisted_on_server));
        }
      })
      .catch(() => {
        if (active) {
          setPersistedOnServer(false);
        }
      });

    return () => {
      active = false;
    };
  }, [parcel.parcelId, parcel.historicalSnapshots, coordKey]);

  const activeSnapshot =
    snapshots.find((item) => item.period_key === selectedPeriodKey) ?? snapshots[0];
  const friendlyStatus = getProducerFriendlyParcelStatus(parcel);
  const custf = evaluateCustfAdminCompliance(parcel);
  const canExportOriginDossier = parcel.eudrStatus === 'VERDE' && !custf.isProducerBlocked;

  const handleDownloadOriginFile = async () => {
    setExportMsg(null);
    setError(null);
    try {
      const pkg = await requestTracesNtExportLive({
        parcelId: parcel.parcelId,
        producerId: parcel.producerId,
        municipality: parcel.municipality,
        coordinates: activeCoordinates,
        eudrStatus: parcel.eudrStatus,
        acahualRemovalPost2020: parcel.acahualRemovalPost2020,
        hasVerifiedCustfPermit: parcel.hasVerifiedCustfPermit,
        deliveredDryEquivalentKg: 220,
      });
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Expediente_Parcela_${parcel.parcelId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(
        `Expediente de origen descargado para ${parcel.parcelName || parcel.parcelId}. Folio: ${String(
          pkg.package_integrity_sha256
        ).slice(0, 14)}...`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section
      id="visor-historico-parcela"
      aria-labelledby="heading-historico-satelital"
      style={{
        backgroundColor: T.colors.surfaceCard,
        border: `1.5px solid ${T.colors.borderSubtle}`,
        borderRadius: 14,
        padding: '24px 22px',
        display: 'grid',
        gap: 18,
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
          <h2
            id="heading-historico-satelital"
            style={{
              margin: 0,
              color: T.colors.primaryGreen,
              fontFamily: 'var(--font-serif)',
              fontSize: '1.42rem',
            }}
          >
            Historial Satelital de la Parcela (Últimos 5 Años)
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: T.colors.textSecondary }}>
            Vista centrada en <strong>{parcel.parcelName || parcel.producerName}</strong> (
            {parcel.municipality}, {parcel.areaHectares} hectáreas). Compara cómo se ha visto tu
            cacaotal desde su registro hasta hace 5 años.
          </p>
        </div>

        <span
          style={{
            fontSize: '0.76rem',
            fontWeight: 700,
            padding: '5px 10px',
            borderRadius: 6,
            backgroundColor: persistedOnServer ? T.colors.statusGreenBg : T.colors.softCacaoBg,
            color: persistedOnServer ? T.colors.statusGreen : T.colors.earthCacao,
            border: `1px solid ${persistedOnServer ? '#15803D' : T.colors.earthCacao}`,
          }}
        >
          {persistedOnServer
            ? '✓ Georreferencia y mapas guardados en servidor'
            : 'Vista centrada de la parcela'}
        </span>
      </div>

      {/* Selector de época (7 momentos en 5 años) */}
      <div
        role="group"
        aria-label="Seleccionar época de fotografía satelital"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        {snapshots.map((snap) => {
          const isSelected = snap.period_key === activeSnapshot?.period_key;
          return (
            <button
              key={snap.period_key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedPeriodKey(snap.period_key)}
              className="btn-control"
              style={{
                padding: '7px 12px',
                fontSize: '0.82rem',
                backgroundColor: isSelected ? T.colors.primaryGreen : T.colors.surfaceElevated,
                color: isSelected ? '#FFFFFF' : T.colors.textPrimary,
                borderColor: isSelected ? T.colors.primaryGreen : T.colors.borderControl,
              }}
            >
              {snap.label}
            </button>
          );
        })}
      </div>

      {/* Visor principal centrado */}
      {activeSnapshot ? (
        <div
          style={{
            backgroundColor: T.colors.backgroundPrimary,
            border: `1.5px solid ${T.colors.borderSubtle}`,
            borderRadius: 12,
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
            <div>
              <strong style={{ fontSize: '1.05rem', color: T.colors.primaryGreen }}>
                {activeSnapshot.label}
              </strong>
              <div style={{ fontSize: '0.82rem', color: T.colors.textSecondary }}>
                Fecha de referencia: <strong>{activeSnapshot.captured_date_iso}</strong> · Terreno
                centrado dentro de su lindero verde
              </div>
            </div>
            <span
              style={{
                backgroundColor: T.colors.softGreenBg,
                color: T.colors.primaryGreen,
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              {parcel.areaHectares} hectáreas · {parcel.shadeTreeCount} árboles de sombra
            </span>
          </div>

          <div style={{ maxWidth: 780, width: '100%', margin: '0 auto' }}>
            <CenteredHistoricalParcelSvg
              key={`${parcel.parcelId}-${activeSnapshot.period_key}`}
              snapshot={activeSnapshot}
              coordinates={activeCoordinates}
              width={SVG_W}
              height={SVG_H}
              showLabels
            />
          </div>
        </div>
      ) : null}

      {/* Galería completa de los 7 periodos históricos */}
      <div style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: T.colors.earthCacao }}>
          Comparación cronológica completa (del registro a hace 5 años)
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 12,
          }}
        >
          {snapshots.map((snap) => {
            const isSelected = snap.period_key === activeSnapshot?.period_key;
            return (
              <button
                key={snap.period_key}
                type="button"
                onClick={() => setSelectedPeriodKey(snap.period_key)}
                style={{
                  textAlign: 'left',
                  padding: 10,
                  borderRadius: 10,
                  border: `2px solid ${
                    isSelected ? T.colors.primaryGreen : T.colors.borderSubtle
                  }`,
                  backgroundColor: isSelected ? T.colors.softGreenBg : T.colors.surfaceElevated,
                  cursor: 'pointer',
                  display: 'grid',
                  gap: 6,
                }}
              >
                <CenteredHistoricalParcelSvg
                  snapshot={snap}
                  coordinates={activeCoordinates}
                  width={280}
                  height={160}
                  showLabels={false}
                />
                <strong style={{ fontSize: '0.84rem', color: T.colors.primaryGreen }}>
                  {snap.label}
                </strong>
                <span style={{ fontSize: '0.76rem', color: T.colors.textSecondary }}>
                  Referencia: {snap.captured_date_iso}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Estado amigable y descarga de expediente */}
      <div
        style={{
          backgroundColor: T.colors.backgroundPrimary,
          borderRadius: 10,
          padding: '14px 16px',
          border: `1px solid ${T.colors.borderSubtle}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ fontSize: '0.84rem', color: T.colors.textSecondary }}>
          <strong>Resumen de parcela:</strong> {friendlyStatus.forestStatusLabel} ·{' '}
          <strong>Papeles:</strong> {friendlyStatus.papersAreClear ? 'En regla' : 'Pendientes'} ·{' '}
          <strong>Expediente:</strong>{' '}
          <strong>{canExportOriginDossier ? 'Disponible' : 'Pendiente de revisión'}</strong>
        </div>

        <button type="button" onClick={handleDownloadOriginFile} className="btn-cacao">
          Descargar expediente de origen
        </button>
      </div>

      {exportMsg ? (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: T.colors.statusGreenBg,
            border: '1.5px solid #15803D',
            color: T.colors.statusGreen,
            fontWeight: 700,
            fontSize: '0.85rem',
          }}
        >
          {exportMsg}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: T.colors.statusRedBg,
            border: '1.5px solid #B91C1C',
            color: T.colors.statusRed,
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}
    </section>
  );
}
