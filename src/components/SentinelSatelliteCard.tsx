'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchLiveSentinel2Scene,
  LiveSentinel2SceneResponse,
} from '@/services/geoEngineLiveClient';
import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

interface SentinelSatelliteCardProps {
  parcel: ParcelAdminOverview;
  coordinates: number[][];
  geometrySourceLabel: string;
  onSceneLoaded?: (scene: LiveSentinel2SceneResponse) => void;
}

export default function SentinelSatelliteCard({
  parcel,
  coordinates,
  geometrySourceLabel,
  onSceneLoaded,
}: SentinelSatelliteCardProps) {
  const [scene, setScene] = useState<LiveSentinel2SceneResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSceneLoadedRef = useRef(onSceneLoaded);
  onSceneLoadedRef.current = onSceneLoaded;

  const coordSignature = JSON.stringify(coordinates);

  const loadScene = useCallback(async () => {
    const parsedCoords = JSON.parse(coordSignature) as number[][];
    if (!parsedCoords || parsedCoords.length < 3) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLiveSentinel2Scene(parcel.parcelId, parsedCoords);
      setScene(result);
      if (onSceneLoadedRef.current) {
        onSceneLoadedRef.current(result);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo obtener la escena Sentinel-2 L2A en vivo.'
      );
    } finally {
      setLoading(false);
    }
  }, [parcel.parcelId, coordSignature]);

  useEffect(() => {
    void loadScene();
  }, [loadScene]);

  const isLiveStac = scene?.source_mode === 'live_stac';

  return (
    <section
      aria-labelledby="sentinel2-telemetry-title"
      style={{
        backgroundColor: T.colors.surfaceElevated,
        border: `1px solid ${T.colors.borderSubtle}`,
        borderRadius: 12,
        padding: 16,
        display: 'grid',
        gap: 12,
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
          <h4
            id="sentinel2-telemetry-title"
            style={{
              margin: 0,
              fontSize: '0.98rem',
              color: T.colors.primaryGreen,
            }}
          >
            Vista Satelital Reciente de tu Parcela
          </h4>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: '0.8rem',
              color: T.colors.textSecondary,
            }}
          >
            Parcela: <strong>{parcel.parcelName || parcel.producerName}</strong> ·{' '}
            {geometrySourceLabel}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {scene ? (
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                backgroundColor: isLiveStac
                  ? T.colors.statusGreenBg
                  : T.colors.statusWarningBg,
                color: isLiveStac ? T.colors.statusGreen : T.colors.statusWarning,
                border: `1px solid ${isLiveStac ? '#15803D' : '#B45309'}`,
              }}
            >
              {isLiveStac ? 'Imagen satelital en vivo' : 'Vista de respaldo'}
            </span>
          ) : null}

          <button
            type="button"
            className="btn-control"
            disabled={loading}
            onClick={() => void loadScene()}
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
          >
            {loading ? 'Buscando fotografía...' : 'Actualizar foto satelital'}
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: T.colors.statusRedBg,
            color: T.colors.statusRed,
            fontSize: '0.82rem',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      ) : null}

      {scene ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'grid', gap: 6, fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: T.colors.textSecondary }}>Toma satelital reciente: </span>
              <code style={{ fontWeight: 700, color: T.colors.textPrimary }}>
                {scene.latest_scene_id}
              </code>
            </div>
            <div>
              <span style={{ color: T.colors.textSecondary }}>Fecha de la fotografía: </span>
              <strong>{scene.captured_at_iso.slice(0, 10)}</strong>
            </div>
            <div>
              <span style={{ color: T.colors.textSecondary }}>Nubosidad en la zona: </span>
              <strong>{scene.cloud_cover_pct}% de nubes</strong>
            </div>
            <div>
              <span style={{ color: T.colors.textSecondary }}>Superficie medida desde arriba: </span>
              <strong>{scene.area_hectares} hectáreas</strong>
            </div>

            {scene.stac_item_url ? (
              <div>
                <a
                  href={scene.stac_item_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: T.colors.primaryGreen,
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    textDecoration: 'underline',
                  }}
                >
                  Ver detalle de la toma satelital ↗
                </a>
              </div>
            ) : null}
          </div>

          {scene.sentinel_preview_url ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                justifySelf: 'end',
              }}
            >
              <img
                src={scene.sentinel_preview_url}
                alt={`Fotografía satelital reciente de ${parcel.parcelName || parcel.producerName}`}
                width={150}
                height={100}
                style={{
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: `1px solid ${T.colors.borderSubtle}`,
                  backgroundColor: '#112418',
                }}
              />
            </div>
          ) : null}
        </div>
      ) : loading ? (
        <p style={{ margin: 0, fontSize: '0.82rem', color: T.colors.textSecondary }}>
          Buscando la fotografía satelital más despejada sobre tu parcela...
        </p>
      ) : null}
    </section>
  );
}
