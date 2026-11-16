'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  buildHistoricalSnapshotsFallback,
  fetchParcelHistoricalSnapshotsLive,
  requestTracesNtExportLive,
} from '@/services/geoEngineLiveClient';
import {
  getProducerFriendlyParcelStatus,
  latLngToScreenPoint,
  latLngToWorldPixel,
} from '@/services/producerLogbookService';
import {
  evaluateCustfAdminCompliance,
  HistoricalParcelSnapshot,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

const VIEW_W = 760;
const VIEW_H = 420;
const TILE_SIZE = 256;

const DEFAULT_TABASCO_RING: number[][] = [
  [-93.2845, 18.256],
  [-93.281, 18.256],
  [-93.281, 18.2525],
  [-93.2845, 18.2525],
  [-93.2845, 18.256],
];

const DEFAULT_WAYBACK_BY_PERIOD: Record<string, string> = {
  registro_actual: '43291',
  hace_6_meses: '10842',
  hace_1_anio: '52930',
  hace_2_anios: '46399',
  hace_3_anios: '4905',
  hace_4_anios: '8432',
  hace_5_anios: '26751',
};

function computeCenteredZoomAndCenter(coordinates: number[][]): {
  centerLat: number;
  centerLng: number;
  zoom: number;
} {
  const lngs = coordinates.map((pt) => pt[0]);
  const lats = coordinates.map((pt) => pt[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  // Escoge un zoom entre 14 y 17 donde la parcela quepa holgadamente centrada dentro de 760x420.
  for (let z = 17; z >= 14; z -= 1) {
    const tl = latLngToWorldPixel(maxLat, minLng, z);
    const br = latLngToWorldPixel(minLat, maxLng, z);
    const spanX = Math.abs(br.x - tl.x);
    const spanY = Math.abs(br.y - tl.y);
    if (spanX <= VIEW_W * 0.52 && spanY <= VIEW_H * 0.52) {
      return { centerLat, centerLng, zoom: z };
    }
  }
  return { centerLat, centerLng, zoom: 14 };
}

export default function LiveGeoEnginePanel({ parcel }: { parcel: ParcelAdminOverview }) {
  const activeCoordinates =
    Array.isArray(parcel.coordinates) && parcel.coordinates.length >= 3
      ? parcel.coordinates
      : DEFAULT_TABASCO_RING;

  const coordKey = JSON.stringify(activeCoordinates);

  const [snapshots, setSnapshots] = useState<HistoricalParcelSnapshot[]>(() =>
    Array.isArray(parcel.historicalSnapshots) &&
    parcel.historicalSnapshots.length === 7 &&
    parcel.historicalSnapshots.every((item) => Boolean(item.wayback_release))
      ? parcel.historicalSnapshots
      : buildHistoricalSnapshotsFallback(parcel.parcelId, activeCoordinates)
  );
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('registro_actual');
  const [persistedOnServer, setPersistedOnServer] = useState<boolean>(
    Boolean(
      parcel.historicalSnapshots &&
        parcel.historicalSnapshots.length === 7 &&
        parcel.historicalSnapshots.every((item) => Boolean(item.wayback_release))
    )
  );
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExportMsg(null);
    setError(null);
    setSelectedPeriodKey('registro_actual');

    const hasDistinctWayback =
      Array.isArray(parcel.historicalSnapshots) &&
      parcel.historicalSnapshots.length === 7 &&
      parcel.historicalSnapshots.every((item) => Boolean(item.wayback_release));

    if (hasDistinctWayback && parcel.historicalSnapshots) {
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
        if (
          active &&
          Array.isArray(res.snapshots) &&
          res.snapshots.length === 7 &&
          res.snapshots.every((item) => Boolean(item.wayback_release))
        ) {
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

  const activeRelease =
    activeSnapshot?.wayback_release ||
    DEFAULT_WAYBACK_BY_PERIOD[activeSnapshot?.period_key || 'registro_actual'] ||
    '43291';

  const { centerLat, centerLng, zoom } = useMemo(
    () => computeCenteredZoomAndCenter(JSON.parse(coordKey) as number[][]),
    [coordKey]
  );

  // Construye los mosaicos Esri World Imagery Wayback reales de la época seleccionada, centrados en la parcela.
  const waybackTiles = useMemo(() => {
    const centerWorld = latLngToWorldPixel(centerLat, centerLng, zoom);
    const topLeftX = centerWorld.x - VIEW_W / 2;
    const topLeftY = centerWorld.y - VIEW_H / 2;
    const maxTile = Math.pow(2, zoom) - 1;

    const minTx = Math.max(0, Math.floor(topLeftX / TILE_SIZE));
    const maxTx = Math.min(maxTile, Math.floor((topLeftX + VIEW_W) / TILE_SIZE));
    const minTy = Math.max(0, Math.floor(topLeftY / TILE_SIZE));
    const maxTy = Math.min(maxTile, Math.floor((topLeftY + VIEW_H) / TILE_SIZE));

    const tiles: Array<{
      key: string;
      url: string;
      leftPct: number;
      topPct: number;
      widthPct: number;
      heightPct: number;
    }> = [];

    for (let tx = minTx; tx <= maxTx; tx += 1) {
      for (let ty = minTy; ty <= maxTy; ty += 1) {
        tiles.push({
          key: `${activeRelease}-${zoom}-${tx}-${ty}`,
          url: `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${activeRelease}/${zoom}/${ty}/${tx}`,
          leftPct: ((tx * TILE_SIZE - topLeftX) / VIEW_W) * 100,
          topPct: ((ty * TILE_SIZE - topLeftY) / VIEW_H) * 100,
          widthPct: (TILE_SIZE / VIEW_W) * 100,
          heightPct: (TILE_SIZE / VIEW_H) * 100,
        });
      }
    }
    return tiles;
  }, [activeRelease, centerLat, centerLng, zoom]);

  const polygonPoints = activeCoordinates.map(([lng, lat]) =>
    latLngToScreenPoint(lat, lng, VIEW_W, VIEW_H, centerLat, centerLng, zoom)
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
          <h2
            id="heading-historico-satelital"
            style={{
              margin: 0,
              color: T.colors.primaryGreen,
              fontFamily: 'var(--font-serif)',
              fontSize: '1.38rem',
            }}
          >
            Fotografías Satelitales de tu Parcela (Últimos 5 Años)
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: T.colors.textSecondary }}>
            Elige el momento que deseas consultar; la vista satelital cambia automáticamente según la
            fecha histórica y mantiene centrada tu parcela.
          </p>
        </div>

        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '5px 10px',
            borderRadius: 6,
            backgroundColor: persistedOnServer ? T.colors.statusGreenBg : T.colors.softCacaoBg,
            color: persistedOnServer ? T.colors.statusGreen : T.colors.earthCacao,
            border: `1px solid ${persistedOnServer ? '#15803D' : T.colors.earthCacao}`,
          }}
        >
          {persistedOnServer
            ? '✓ Georreferencia e historial guardados en servidor'
            : 'Vista centrada de la parcela'}
        </span>
      </div>

      {/* Única lista de selección de años/época arriba de la imagen */}
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

      {/* Visor satelital único centrado en la parcela */}
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
                Fecha de la captura satelital:{' '}
                <strong>{activeSnapshot.captured_date_iso}</strong>
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
            {waybackTiles.map((tile) => (
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
            ))}

            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {polygonPoints.length >= 3 ? (
                <polygon
                  points={polygonSvgStr}
                  fill="rgba(74, 222, 128, 0.24)"
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
