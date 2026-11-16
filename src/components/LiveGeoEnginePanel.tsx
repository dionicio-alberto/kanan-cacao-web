'use client';

import React, { useEffect, useState } from 'react';
import SentinelSatelliteCard from '@/components/SentinelSatelliteCard';
import {
  buildSatelliteOrthoExportUrl,
  PRESET_POLYGONS,
  PresetPolygonKey,
  projectCoordinatesToOrthoSvgPoints,
  projectCoordinatesToSvgPoints,
  requestTracesNtExportLive,
  TopologyValidationResponse,
  validateTopologyLive,
} from '@/services/geoEngineLiveClient';
import {
  evaluateCustfAdminCompliance,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import { getProducerFriendlyParcelStatus } from '@/services/producerLogbookService';

const FRIENDLY_PRESET_LABELS: Record<PresetPolygonKey, { label: string; description: string }> = {
  SELF_INTERSECTING_BOWTIE: {
    label: 'Ejemplo: Terreno con líneas cruzadas',
    description:
      'Ejemplo práctico de cuando al caminar la parcela con el teléfono se cruzan los lados o falta cerrar la última esquina.',
  },
  CLEAN_COMALCALCO: {
    label: 'Ejemplo: Parcela bien medida (> 4 ha)',
    description: 'Ejemplo de un terreno medido en cuadro sin cruces en Comalcalco.',
  },
};

const SVG_W = 420;
const SVG_H = 240;

function PolygonSvg({
  coordinates,
  closeRing,
  stroke,
  fill,
  title,
  subtitle,
  badgeText,
  badgeBg,
  badgeColor,
  badgeBorder,
  showSatelliteBackdrop = true,
}: {
  coordinates: number[][];
  closeRing: boolean;
  stroke: string;
  fill: string;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  showSatelliteBackdrop?: boolean;
}) {
  const orthoData = showSatelliteBackdrop
    ? buildSatelliteOrthoExportUrl(coordinates, SVG_W * 2, SVG_H * 2)
    : null;
  const pointList = orthoData
    ? projectCoordinatesToOrthoSvgPoints(coordinates, orthoData.extentBbox, SVG_W, SVG_H)
    : projectCoordinatesToSvgPoints(coordinates, SVG_W, SVG_H)
        .split(' ')
        .map((pt) => {
          const [x, y] = pt.split(',').map(Number);
          return { x, y };
        });
  const points = pointList.map((pt) => `${pt.x},${pt.y}`).join(' ');

  return (
    <figure
      style={{
        margin: 0,
        backgroundColor: T.colors.backgroundPrimary,
        padding: 16,
        borderRadius: 10,
        border: `1px solid ${T.colors.borderSubtle}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 4,
          gap: 8,
        }}
      >
        <figcaption style={{ fontWeight: 700, fontSize: '0.95rem', color: T.colors.textPrimary }}>
          {title}
        </figcaption>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            backgroundColor: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
          }}
        >
          {badgeText}
        </span>
      </div>
      <div style={{ fontSize: '0.8125rem', color: T.colors.textSecondary, marginBottom: 10 }}>
        {subtitle}
      </div>

      <svg
        role="img"
        aria-label={`${title}: ${subtitle}`}
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{
          width: '100%',
          height: 'auto',
          aspectRatio: `${SVG_W} / ${SVG_H}`,
          backgroundColor: '#112418',
          borderRadius: 8,
          border: `2px solid ${T.colors.primaryGreen}`,
          display: 'block',
        }}
      >
        {orthoData ? (
          <image
            href={orthoData.orthoUrl}
            x={0}
            y={0}
            width={SVG_W}
            height={SVG_H}
            preserveAspectRatio="none"
            opacity={0.86}
          />
        ) : null}
        <g transform="translate(384, 28)" aria-hidden="true">
          <circle r="14" fill="#1E3A28" stroke="#B7C9BD" strokeWidth="1.2" />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#F7F4EC"
            fontSize="10"
            fontWeight="bold"
            fontFamily="monospace"
          >
            N
          </text>
        </g>
        <text x="12" y="226" fill="#B7C9BD" fontSize="11" fontFamily="monospace" aria-hidden="true">
          Datum WGS84 · EPSG:4326 · Chontalpa, Tabasco
        </text>

        {closeRing ? (
          <polygon points={points} fill={fill} stroke={stroke} strokeWidth={3} />
        ) : (
          <polyline
            points={points}
            fill="none"
            stroke={stroke}
            strokeWidth={3}
            strokeDasharray="7 5"
          />
        )}

        {pointList.map((pt, i) => (
          <g key={`${pt.x}-${pt.y}-${i}`} aria-hidden="true">
            <circle cx={pt.x} cy={pt.y} r={5.5} fill="#112418" stroke={stroke} strokeWidth={2.5} />
            <text
              x={pt.x + 8}
              y={pt.y - 7}
              fill="#F7F4EC"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
            >
              V{i + 1}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

export default function LiveGeoEnginePanel({ parcel }: { parcel: ParcelAdminOverview }) {
  const [geometryMode, setGeometryMode] = useState<'PARCEL_POSTGIS' | 'PRESET'>('PARCEL_POSTGIS');
  const [presetKey, setPresetKey] = useState<PresetPolygonKey>('SELF_INTERSECTING_BOWTIE');
  const [showSatelliteBackdrop, setShowSatelliteBackdrop] = useState<boolean>(true);
  const [report, setReport] = useState<TopologyValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  useEffect(() => {
    setReport(null);
    setError(null);
    setExportMsg(null);
  }, [parcel.parcelId]);

  const preset = PRESET_POLYGONS[presetKey];
  const hasParcelCoords = Array.isArray(parcel.coordinates) && parcel.coordinates.length >= 3;
  const usingPostgisParcel = geometryMode === 'PARCEL_POSTGIS' && hasParcelCoords;
  const activeCoordinates = usingPostgisParcel ? parcel.coordinates! : preset.coordinates;
  const activeGeometryLabel = usingPostgisParcel
    ? `Linderos guardados (${parcel.parcelName || parcel.parcelId})`
    : FRIENDLY_PRESET_LABELS[presetKey].label;

  const friendlyStatus = getProducerFriendlyParcelStatus(parcel);
  const custf = evaluateCustfAdminCompliance(parcel);
  const canExportTraces = parcel.eudrStatus === 'VERDE' && !custf.isProducerBlocked;

  const runLinter = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      setReport(await validateTopologyLive(parcel.parcelId, activeCoordinates));
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message}. Verifica la conexión con el servicio de mapas.`
          : String(e),
      );
    } finally {
      setLoading(false);
    }
  };

  const exportTraces = async () => {
    setExportMsg(null);
    setError(null);
    try {
      const pkg = await requestTracesNtExportLive({
        parcelId: parcel.parcelId,
        producerId: parcel.producerId,
        municipality: parcel.municipality,
        coordinates: report ? report.polygon.coordinates[0] : activeCoordinates,
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
        `Expediente de origen descargado para ${parcel.parcelName || parcel.parcelId}. Folio de seguridad: ${String(
          pkg.package_integrity_sha256,
        ).slice(0, 16)}...`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section
      id="linter-cartografico"
      aria-labelledby="heading-linter"
      style={{
        backgroundColor: T.colors.surfaceCard,
        border: `1px solid ${T.colors.borderSubtle}`,
        borderRadius: 12,
        padding: '24px 22px',
        marginTop: 22,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <h2
          id="heading-linter"
          style={{
            margin: 0,
            color: T.colors.primaryGreen,
            fontFamily: 'var(--font-serif)',
            fontSize: '1.35rem',
          }}
        >
          Mapa Satelital y Revisión de Linderos de tu Parcela
        </h2>

        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 6,
            backgroundColor: T.colors.softGreenBg,
            color: T.colors.primaryGreen,
            border: `1px solid ${T.colors.primaryGreen}`,
          }}
        >
          Servicio satelital conectado
        </span>
      </div>

      <p style={{ fontSize: '0.9rem', color: T.colors.textSecondary, marginTop: 0 }}>
        Revisa los linderos de tu parcela sobre fotografía satelital real o prueba con un ejemplo
        para asegurarte de que todas las esquinas del terreno cierren bien:
      </p>

      <div
        role="group"
        aria-label="Seleccionar linderos y vista satelital"
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          aria-pressed={usingPostgisParcel}
          disabled={!hasParcelCoords}
          onClick={() => {
            setGeometryMode('PARCEL_POSTGIS');
            setReport(null);
            setError(null);
            setExportMsg(null);
          }}
          className="btn-control"
          style={{
            backgroundColor: usingPostgisParcel ? T.colors.primaryGreen : T.colors.surfaceCard,
            color: usingPostgisParcel ? '#FFFFFF' : T.colors.textPrimary,
            borderColor: usingPostgisParcel ? T.colors.primaryGreen : T.colors.borderControl,
            opacity: hasParcelCoords ? 1 : 0.6,
          }}
        >
          Linderos registrados de mi parcela
        </button>

        {(Object.keys(PRESET_POLYGONS) as PresetPolygonKey[]).map((key) => {
          const isSelected = geometryMode === 'PRESET' && presetKey === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setGeometryMode('PRESET');
                setPresetKey(key);
                setReport(null);
                setError(null);
                setExportMsg(null);
              }}
              className="btn-control"
              style={{
                backgroundColor: isSelected ? T.colors.primaryGreen : T.colors.surfaceCard,
                color: isSelected ? '#FFFFFF' : T.colors.textPrimary,
                borderColor: isSelected ? T.colors.primaryGreen : T.colors.borderControl,
              }}
            >
              {FRIENDLY_PRESET_LABELS[key].label}
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={showSatelliteBackdrop}
          onClick={() => setShowSatelliteBackdrop((prev) => !prev)}
          className="btn-control"
          style={{
            marginLeft: 'auto',
            backgroundColor: showSatelliteBackdrop ? T.colors.earthCacao : T.colors.surfaceCard,
            color: showSatelliteBackdrop ? '#FFFFFF' : T.colors.textPrimary,
            borderColor: showSatelliteBackdrop ? T.colors.earthCacao : T.colors.borderControl,
          }}
        >
          {showSatelliteBackdrop ? 'Viendo foto satelital real' : 'Viendo fondo oscuro'}
        </button>
      </div>

      <p
        style={{
          fontSize: '0.85rem',
          color: T.colors.earthCacao,
          backgroundColor: T.colors.softCacaoBg,
          padding: '10px 14px',
          borderRadius: 6,
          border: `1px solid ${T.colors.earthCacao}`,
          marginTop: 0,
          marginBottom: 18,
          fontWeight: 600,
        }}
      >
        Vista actual:{' '}
        {usingPostgisParcel
          ? `Mapa georreferenciado de ${parcel.parcelName || parcel.producerName} (${parcel.municipality}, ${parcel.areaHectares} hectáreas).`
          : FRIENDLY_PRESET_LABELS[presetKey].description}
      </p>

      <div style={{ marginBottom: 18 }}>
        <SentinelSatelliteCard
          parcel={parcel}
          coordinates={activeCoordinates}
          geometrySourceLabel={activeGeometryLabel}
        />
      </div>

      <div className="dual-canvas-grid" style={{ marginBottom: 18 }}>
        <PolygonSvg
          title="Linderos tomados en terreno"
          subtitle={`${activeCoordinates.length} puntos del recorrido · ${activeGeometryLabel}`}
          badgeText="Trazo tomado"
          badgeBg={T.colors.statusRedBg}
          badgeColor={T.colors.statusRed}
          badgeBorder="#B91C1C"
          coordinates={activeCoordinates}
          closeRing={false}
          stroke="#FCA5A5"
          fill="none"
          showSatelliteBackdrop={showSatelliteBackdrop}
        />

        {loading && (
          <div
            role="status"
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              borderRadius: 10,
              border: `2px solid ${T.colors.primaryGreen}`,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minHeight: 260,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '1rem', color: T.colors.primaryGreen }}>
              Revisando linderos y midiendo superficie...
            </div>
            <p style={{ fontSize: '0.85rem', color: T.colors.textSecondary, marginTop: 8 }}>
              Comprobando que las esquinas cierren bien, no haya líneas cruzadas y calculando las
              hectáreas exactas.
            </p>
          </div>
        )}

        {!loading && report && (
          <PolygonSvg
            title="Linderos corregidos y cerrados"
            subtitle={`Superficie medida: ${report.area_hectares} hectáreas · ${report.vertex_count} esquinas`}
            badgeText="Linderos en regla"
            badgeBg={T.colors.statusGreenBg}
            badgeColor={T.colors.statusGreen}
            badgeBorder="#15803D"
            coordinates={report.polygon.coordinates[0]}
            closeRing
            stroke="#86EFAC"
            fill="rgba(134, 239, 172, 0.22)"
            showSatelliteBackdrop={showSatelliteBackdrop}
          />
        )}

        {!loading && !report && (
          <div
            role="status"
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              borderRadius: 10,
              border: `2px dashed ${T.colors.borderControl}`,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minHeight: 260,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '1rem', color: T.colors.primaryGreen }}>
              Aún no se revisan estos linderos
            </div>
            <p
              style={{
                fontSize: '0.85rem',
                color: T.colors.textSecondary,
                maxWidth: 340,
                margin: '8px 0 0',
              }}
            >
              Pulsa el botón <strong>Revisar y corregir linderos en el mapa</strong> aquí abajo para
              comprobar el tamaño y cierre de la parcela.
            </p>
          </div>
        )}
      </div>

      {report && (
        <div className="diagnostics-strip" style={{ marginBottom: 18 }}>
          <div
            style={{
              backgroundColor: T.colors.statusGreenBg,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #15803D',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: T.colors.textSecondary }}>
              Estado del mapa
            </div>
            <div style={{ fontWeight: 700, color: T.colors.statusGreen, fontSize: '0.9rem' }}>
              {report.is_topology_valid ? 'Cerrado y sin cruces' : 'Con errores'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${T.colors.borderSubtle}`,
            }}
          >
            <div style={{ fontSize: '0.75rem', color: T.colors.textSecondary }}>
              Cierre de esquinas
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {report.was_ring_auto_closed ? 'Cerrado automáticamente' : 'Cerrado desde campo'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${T.colors.borderSubtle}`,
            }}
          >
            <div style={{ fontSize: '0.75rem', color: T.colors.textSecondary }}>
              Líneas cruzadas
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {report.was_self_intersection_repaired
                ? 'Corregido en el mapa'
                : 'Sin cruces detectados'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${T.colors.borderSubtle}`,
            }}
          >
            <div style={{ fontSize: '0.75rem', color: T.colors.textSecondary }}>
              Superficie medida
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.9rem',
                color: T.colors.primaryGreen,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {report.area_hectares} hectáreas
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${T.colors.borderSubtle}`,
            }}
          >
            <div style={{ fontSize: '0.75rem', color: T.colors.textSecondary }}>
              Requisito por tamaño ({'>'} 4 ha)
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {report.requires_mandatory_polygon_eudr
                ? 'Requiere mapa completo'
                : 'Parcela pequeña (menor o igual a 4 ha)'}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          backgroundColor: T.colors.backgroundPrimary,
          borderRadius: 10,
          padding: '16px 18px',
          border: `1px solid ${T.colors.borderSubtle}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={runLinter} disabled={loading} className="btn-primary">
            {loading ? 'Revisando mapa...' : 'Revisar y corregir linderos en el mapa'}
          </button>

          <button type="button" onClick={exportTraces} className="btn-cacao">
            Descargar expediente de origen ({parcel.parcelName || parcel.parcelId})
          </button>
        </div>

        <div style={{ fontSize: '0.8125rem', color: T.colors.textSecondary }}>
          <strong>Estado de la parcela:</strong>{' '}
          <span
            style={{
              fontWeight: 700,
              color:
                friendlyStatus.forestStatusTone === 'verde'
                  ? T.colors.statusGreen
                  : friendlyStatus.forestStatusTone === 'revision'
                    ? T.colors.statusWarning
                    : T.colors.statusRed,
            }}
          >
            {friendlyStatus.forestStatusLabel}
          </span>{' '}
          · Papeles:{' '}
          <span
            style={{
              fontWeight: 700,
              color: friendlyStatus.papersAreClear ? T.colors.statusGreen : T.colors.statusRed,
            }}
          >
            {friendlyStatus.papersAreClear ? 'En regla' : 'Pendientes'}
          </span>{' '}
          · Expediente:{' '}
          <strong>{canExportTraces ? 'Listo para descargar' : 'Por completar revisión'}</strong>
        </div>
      </div>

      {exportMsg && (
        <div
          role="status"
          style={{
            marginTop: 12,
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: T.colors.statusGreenBg,
            border: '2px solid #15803D',
            color: T.colors.statusGreen,
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          {exportMsg}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: T.colors.statusRedBg,
            border: '2px solid #B91C1C',
            color: T.colors.statusRed,
            fontSize: '0.875rem',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{error}</div>
          <div style={{ fontSize: '0.8125rem' }}>
            Acción sugerida: para descargar el expediente de origen, la parcela debe tener sus
            revisión de monte al día y su constancia de terreno en regla.
          </div>
        </div>
      )}
    </section>
  );
}
