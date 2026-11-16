'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  buildHistoricalSnapshotsFallback,
  computeCenteredWaybackViewport,
  computeWaybackTileLayout,
  fetchParcelHistoricalSnapshotsLive,
  requestTracesNtExportLive,
} from '@/services/geoEngineLiveClient';
import {
  getNextTimelapsePeriodKey,
  getOrderedTimelapsePeriodKeys,
  getProducerFriendlyParcelStatus,
  latLngToScreenPoint,
  TimelapseDirection,
} from '@/services/producerLogbookService';
import {
  evaluateCustfAdminCompliance,
  HistoricalParcelSnapshot,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

const VIEW_W = 760;
const VIEW_H = 420;

const DEFAULT_TABASCO_RING: number[][] = [
  [-93.2845, 18.256],
  [-93.281, 18.256],
  [-93.281, 18.2525],
  [-93.2845, 18.2525],
  [-93.2845, 18.256],
];

const DEFAULT_WAYBACK_BY_PERIOD: Record<string, string> = {
  registro_actual: '43291',
  hace_6_meses: '36557',
  hace_1_anio: '4905',
  hace_2_anios: '48376',
  hace_3_anios: '239',
  hace_4_anios: '26751',
  hace_5_anios: '1052',
};

function hasDistinctRealCaptures(snaps?: HistoricalParcelSnapshot[] | null): boolean {
  if (!Array.isArray(snaps) || snaps.length !== 7) {
    return false;
  }
  const releases = new Set(snaps.map((item) => item.wayback_release).filter(Boolean));
  const dates = new Set(snaps.map((item) => item.captured_date_iso).filter(Boolean));
  return (
    releases.size === 7 &&
    dates.size === 7 &&
    snaps.every((item) => item.capture_source === 'real_src_date')
  );
}

export default function LiveGeoEnginePanel({ parcel }: { parcel: ParcelAdminOverview }) {
  const activeCoordinates =
    Array.isArray(parcel.coordinates) && parcel.coordinates.length >= 3
      ? parcel.coordinates
      : DEFAULT_TABASCO_RING;

  const coordKey = JSON.stringify(activeCoordinates);
  const defaultRegDate =
    parcel.registeredAtIso?.slice(0, 10) || new Date().toISOString().slice(0, 10);

  const [referenceDate, setReferenceDate] = useState<string>(defaultRegDate);
  const [snapshots, setSnapshots] = useState<HistoricalParcelSnapshot[]>(() =>
    hasDistinctRealCaptures(parcel.historicalSnapshots)
      ? parcel.historicalSnapshots!
      : buildHistoricalSnapshotsFallback(parcel.parcelId, activeCoordinates),
  );
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('registro_actual');
  const [persistedOnServer, setPersistedOnServer] = useState<boolean>(
    hasDistinctRealCaptures(parcel.historicalSnapshots),
  );
  const [updatingDate, setUpdatingDate] = useState<boolean>(false);
  const [overlayOpacityPct, setOverlayOpacityPct] = useState<number>(75);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [autoPlaySeconds, setAutoPlaySeconds] = useState<number>(2);
  const [autoPlayDirection, setAutoPlayDirection] = useState<TimelapseDirection>('forward');
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExportMsg(null);
    setError(null);
    setSelectedPeriodKey('registro_actual');
    setIsAutoPlaying(false);
    setReferenceDate(defaultRegDate);

    if (hasDistinctRealCaptures(parcel.historicalSnapshots) && parcel.historicalSnapshots) {
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
        if (active && hasDistinctRealCaptures(res.snapshots)) {
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
  }, [parcel.parcelId, parcel.historicalSnapshots, coordKey, defaultRegDate]);

  // Secuencia ordenada según la dirección elegida por el usuario (hacia adelante o hacia atrás).
  const orderedPeriods = useMemo(() => {
    return getOrderedTimelapsePeriodKeys(snapshots, autoPlayDirection);
  }, [snapshots, autoPlayDirection]);

  useEffect(() => {
    if (!isAutoPlaying || orderedPeriods.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setSelectedPeriodKey((currentKey) => getNextTimelapsePeriodKey(orderedPeriods, currentKey));
    }, autoPlaySeconds * 1000);
    return () => window.clearInterval(timer);
  }, [isAutoPlaying, autoPlaySeconds, orderedPeriods]);

  const handleChangeReferenceDate = async (nextDate: string) => {
    setReferenceDate(nextDate);
    setIsAutoPlaying(false);
    if (!nextDate) {
      return;
    }
    setUpdatingDate(true);
    try {
      const res = await fetchParcelHistoricalSnapshotsLive(parcel.parcelId, nextDate);
      if (Array.isArray(res.snapshots) && res.snapshots.length === 7) {
        setSnapshots(res.snapshots);
        setSelectedPeriodKey('registro_actual');
      }
    } catch {
      // Mantiene las tomas actuales si el servidor remoto no está disponible.
    } finally {
      setUpdatingDate(false);
    }
  };

  const activeSnapshot =
    snapshots.find((item) => item.period_key === selectedPeriodKey) ?? snapshots[0];

  const activeRelease =
    activeSnapshot?.wayback_release ||
    DEFAULT_WAYBACK_BY_PERIOD[activeSnapshot?.period_key || 'registro_actual'] ||
    '43291';

  const { centerLat, centerLng, zoom } = useMemo(
    () => computeCenteredWaybackViewport(JSON.parse(coordKey) as number[][], VIEW_W, VIEW_H),
    [coordKey],
  );

  const waybackTiles = useMemo(
    () =>
      activeSnapshot?.cached_image_url
        ? []
        : computeWaybackTileLayout(
            JSON.parse(coordKey) as number[][],
            activeRelease,
            VIEW_W,
            VIEW_H,
          ),
    [coordKey, activeRelease, activeSnapshot?.cached_image_url],
  );

  const polygonPoints = activeCoordinates.map(([lng, lat]) =>
    latLngToScreenPoint(lat, lng, VIEW_W, VIEW_H, centerLat, centerLng, zoom),
  );
  const polygonSvgStr = polygonPoints.map((pt) => `${pt.x},${pt.y}`).join(' ');

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
          pkg.package_integrity_sha256,
        ).slice(0, 14)}...`,
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
        padding: '20px 22px',
        display: 'grid',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <h2
            id="heading-historico-satelital"
            style={{
              margin: 0,
              color: T.colors.primaryGreen,
              fontFamily: 'var(--font-serif)',
              fontSize: '1.35rem',
            }}
          >
            Fotografías Satelitales de tu Parcela (Sin Nubes)
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: T.colors.textSecondary }}>
            Calculadas respecto a la fecha de registro (6 meses, 1, 2, 3, 4 y 5 años atrás) y
            guardadas en servidor para no descargar cada vez que entras.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label
              htmlFor="history-reference-date"
              style={{ fontSize: '0.78rem', fontWeight: 700, color: T.colors.textSecondary }}
            >
              Fecha de registro:
            </label>
            <input
              id="history-reference-date"
              type="date"
              value={referenceDate}
              disabled={updatingDate}
              onChange={(e) => void handleChangeReferenceDate(e.target.value)}
              className="field-input"
              style={{ width: 'auto', marginTop: 0, padding: '4px 8px', fontSize: '0.8rem' }}
            />
          </div>

          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '4px 9px',
              borderRadius: 6,
              backgroundColor: persistedOnServer ? T.colors.statusGreenBg : T.colors.softCacaoBg,
              color: persistedOnServer ? T.colors.statusGreen : T.colors.earthCacao,
              border: `1px solid ${persistedOnServer ? '#15803D' : T.colors.earthCacao}`,
            }}
          >
            {updatingDate
              ? 'Buscando fechas despejadas...'
              : persistedOnServer
                ? '✓ Guardado en servidor sin nubes'
                : 'Vista centrada de la parcela'}
          </span>
        </div>
      </div>

      {/* Única barra de selección de fechas + controles de Timelapse automático y opacidad */}
      <div
        role="group"
        aria-label="Seleccionar época de fotografía satelital"
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
      >
        {snapshots.map((snap) => {
          const isSelected = snap.period_key === activeSnapshot?.period_key;
          return (
            <button
              key={snap.period_key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setIsAutoPlaying(false);
                setSelectedPeriodKey(snap.period_key);
              }}
              className="btn-control"
              style={{
                padding: '6px 11px',
                fontSize: '0.8rem',
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

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          backgroundColor: T.colors.surfaceElevated,
          border: `1px solid ${T.colors.borderSubtle}`,
          borderRadius: 10,
          padding: '8px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-control"
            onClick={() => setIsAutoPlaying((prev) => !prev)}
            style={{
              padding: '5px 12px',
              fontSize: '0.8rem',
              backgroundColor: isAutoPlaying ? T.colors.earthCacao : T.colors.primaryGreen,
              color: '#FFFFFF',
              borderColor: isAutoPlaying ? T.colors.earthCacao : T.colors.primaryGreen,
            }}
          >
            {isAutoPlaying ? '⏸ Pausar secuencia' : '▶ Reproducir evolución automática'}
          </button>

          <label
            htmlFor="timelapse-interval-select"
            style={{ fontSize: '0.78rem', fontWeight: 700, color: T.colors.textSecondary }}
          >
            Cambiar cada:
          </label>
          <select
            id="timelapse-interval-select"
            value={autoPlaySeconds}
            onChange={(e) => setAutoPlaySeconds(Number(e.target.value))}
            className="field-input"
            style={{ width: 'auto', marginTop: 0, padding: '4px 8px', fontSize: '0.8rem' }}
          >
            <option value={1}>1 segundo</option>
            <option value={2}>2 segundos</option>
            <option value={3}>3 segundos</option>
            <option value={5}>5 segundos</option>
          </select>

          <label
            htmlFor="timelapse-direction-select"
            style={{ fontSize: '0.78rem', fontWeight: 700, color: T.colors.textSecondary }}
          >
            Dirección:
          </label>
          <select
            id="timelapse-direction-select"
            value={autoPlayDirection}
            onChange={(e) => setAutoPlayDirection(e.target.value as TimelapseDirection)}
            className="field-input"
            style={{ width: 'auto', marginTop: 0, padding: '4px 8px', fontSize: '0.8rem' }}
          >
            <option value="forward">Hacia adelante (Pasado → Registro)</option>
            <option value="backward">Hacia atrás (Registro → Pasado)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label
            htmlFor="parcel-overlay-opacity"
            style={{ fontSize: '0.78rem', fontWeight: 700, color: T.colors.textSecondary }}
          >
            Opacidad de la parcela ({overlayOpacityPct}%):
          </label>
          <input
            id="parcel-overlay-opacity"
            type="range"
            min={0}
            max={100}
            step={5}
            value={overlayOpacityPct}
            onChange={(e) => setOverlayOpacityPct(Number(e.target.value))}
            style={{ accentColor: T.colors.primaryGreen, cursor: 'pointer' }}
          />
        </div>
      </div>

      {activeSnapshot ? (
        <div
          style={{
            backgroundColor: T.colors.backgroundPrimary,
            border: `1.5px solid ${T.colors.borderSubtle}`,
            borderRadius: 12,
            padding: 14,
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
              <strong style={{ fontSize: '1.02rem', color: T.colors.primaryGreen }}>
                {activeSnapshot.label}
              </strong>
              <div style={{ fontSize: '0.8rem', color: T.colors.textSecondary }}>
                Fecha exacta en que el satélite tomó esta fotografía:{' '}
                <strong>{activeSnapshot.captured_date_iso}</strong> · Cielo despejado verificado
                {activeSnapshot.cached_image_url ? ' · Almacenada en servidor CDN' : ''}
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
              Superficie: {parcel.areaHectares.toFixed(2)} hectáreas
            </span>
          </div>

          <div
            role="img"
            aria-label={`Vista satelital centrada: ${activeSnapshot.label} (${activeSnapshot.captured_date_iso})`}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 820,
              margin: '0 auto',
              aspectRatio: `${VIEW_W} / ${VIEW_H}`,
              backgroundColor: '#112418',
              borderRadius: 10,
              overflow: 'hidden',
              border: `2px solid ${T.colors.primaryGreen}`,
            }}
          >
            {activeSnapshot.cached_image_url ? (
              <img
                src={activeSnapshot.cached_image_url}
                alt={`Fotografía satelital ${activeSnapshot.label}`}
                draggable={false}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                }}
              />
            ) : (
              waybackTiles.map((tile) => (
                <img
                  key={tile.key}
                  src={tile.url}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: `${tile.leftPct}%`,
                    top: `${tile.topPct}%`,
                    width: `${tile.widthPct}%`,
                    height: `${tile.heightPct}%`,
                    pointerEvents: 'none',
                  }}
                />
              ))
            )}

            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                opacity: overlayOpacityPct / 100,
              }}
            >
              {polygonPoints.length >= 3 ? (
                <polygon
                  points={polygonSvgStr}
                  fill="rgba(74, 222, 128, 0.36)"
                  stroke="#4ADE80"
                  strokeWidth={3.5}
                />
              ) : null}
              {polygonPoints.map((pt, idx) => (
                <circle
                  key={`corner-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={4.5}
                  fill="#112418"
                  stroke="#86EFAC"
                  strokeWidth={2}
                />
              ))}
            </svg>
          </div>
        </div>
      ) : null}

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
          <strong>Estado de la parcela:</strong> {friendlyStatus.forestStatusLabel} ·{' '}
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
