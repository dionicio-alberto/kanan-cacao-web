'use client';

import React, { useState } from 'react';
import {
  GEO_ENGINE_BASE_URL,
  PRESET_POLYGONS,
  PresetPolygonKey,
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
}) {
  const points = projectCoordinatesToSvgPoints(coordinates, SVG_W, SVG_H);
  const pointList = points.split(' ').map((pt) => {
    const [x, y] = pt.split(',').map(Number);
    return { x, y };
  });

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
  const [presetKey, setPresetKey] = useState<PresetPolygonKey>('SELF_INTERSECTING_BOWTIE');
  const [report, setReport] = useState<TopologyValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const preset = PRESET_POLYGONS[presetKey];
  const custf = evaluateCustfAdminCompliance(parcel);
  const canExportTraces = parcel.eudrStatus === 'VERDE' && !custf.isProducerBlocked;

  const runLinter = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      setReport(await validateTopologyLive(parcel.parcelId, preset.coordinates));
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message}. Verifica que el servidor FastAPI esté activo en ${GEO_ENGINE_BASE_URL}.`
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
        coordinates: report ? report.polygon.coordinates[0] : preset.coordinates,
        eudrStatus: parcel.eudrStatus,
        acahualRemovalPost2020: parcel.acahualRemovalPost2020,
        hasVerifiedCustfPermit: parcel.hasVerifiedCustfPermit,
        deliveredDryEquivalentKg: 220,
      });
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TRACES-NT_${parcel.parcelId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(
        `Paquete Due Diligence descargado para ${parcel.parcelId}. Huella SHA-256: ${String(
          pkg.package_integrity_sha256,
        ).slice(0, 20)}...`,
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
        marginTop: 28,
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
          3. Laboratorio cartográfico del linter topológico y conector TRACES NT
        </h2>

        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            padding: '4px 10px',
            borderRadius: 4,
            backgroundColor: T.colors.softGreenBg,
            color: T.colors.primaryGreen,
            border: `1px solid ${T.colors.primaryGreen}`,
          }}
        >
          Motor FastAPI: {GEO_ENGINE_BASE_URL}
        </span>
      </div>

      <p style={{ fontSize: '0.9rem', color: T.colors.textSecondary, marginTop: 0 }}>
        Selecciona un trazo de campo y envíalo al motor Python para reparar auto-intersecciones,
        forzar el cierre del anillo exterior según estándar GeoJSON RFC 7946 y comprobar que el
        archivo sea menor a 25 MB:
      </p>

      <div
        role="group"
        aria-label="Seleccionar geometría de prueba para el linter"
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        {(Object.keys(PRESET_POLYGONS) as PresetPolygonKey[]).map((key) => {
          const isSelected = presetKey === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
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
              {PRESET_POLYGONS[key].label}
            </button>
          );
        })}
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
        Escenario activo: {preset.description}
      </p>

      <div className="dual-canvas-grid" style={{ marginBottom: 18 }}>
        <PolygonSvg
          title="Antes: trazo GPS crudo de campo"
          subtitle={`${preset.coordinates.length} vértices capturados sin validación topológica`}
          badgeText="Anillo crudo"
          badgeBg={T.colors.statusRedBg}
          badgeColor={T.colors.statusRed}
          badgeBorder="#B91C1C"
          coordinates={preset.coordinates}
          closeRing={false}
          stroke="#FCA5A5"
          fill="none"
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
              Ejecutando validación topológica en Geo-Engine...
            </div>
            <p style={{ fontSize: '0.85rem', color: T.colors.textSecondary, marginTop: 8 }}>
              Verificando cierre de anillo RFC 7946, eliminación de cruces y cálculo geodésico de
              hectáreas.
            </p>
          </div>
        )}

        {!loading && report && (
          <PolygonSvg
            title="Después: geometría reparada (RFC 7946)"
            subtitle={`Superficie geodésica: ${report.area_hectares} ha · ${report.vertex_count} vértices · ${report.byte_size} bytes`}
            badgeText="Topología válida EUDR"
            badgeBg={T.colors.statusGreenBg}
            badgeColor={T.colors.statusGreen}
            badgeBorder="#15803D"
            coordinates={report.polygon.coordinates[0]}
            closeRing
            stroke="#86EFAC"
            fill="rgba(134, 239, 172, 0.22)"
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
              Sin ejecución del linter para el trazo actual
            </div>
            <p
              style={{
                fontSize: '0.85rem',
                color: T.colors.textSecondary,
                maxWidth: 340,
                margin: '8px 0 0',
              }}
            >
              Pulsa el botón <strong>Ejecutar linter topológico en Geo-Engine</strong> debajo de
              este panel para procesar las coordenadas en el servidor y comparar el polígono
              reparado.
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
              Estado topológico
            </div>
            <div style={{ fontWeight: 700, color: T.colors.statusGreen, fontSize: '0.9rem' }}>
              {report.is_topology_valid ? 'Válido RFC 7946' : 'Inválido'}
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
              Cierre de anillo exterior
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {report.was_ring_auto_closed ? 'Cerrado automáticamente' : 'Cerrado de origen'}
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
              Auto-intersección
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {report.was_self_intersection_repaired
                ? 'Reparada por envolvente'
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
              Superficie y peso GeoJSON
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.9rem',
                color: T.colors.primaryGreen,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {report.area_hectares} ha · {report.byte_size} bytes
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
              Regla EUDR ({'>'} 4.0 ha)
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {report.requires_mandatory_polygon_eudr
                ? 'Polígono obligatorio'
                : 'Minifundio menor o igual a 4 ha'}
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
            {loading ? 'Validando geometría...' : 'Ejecutar linter topológico en Geo-Engine'}
          </button>

          <button type="button" onClick={exportTraces} className="btn-cacao">
            Descargar paquete aduanal TRACES NT ({parcel.parcelId})
          </button>
        </div>

        <div style={{ fontSize: '0.8125rem', color: T.colors.textSecondary }}>
          <strong>Compuerta aduanal ({parcel.parcelId}):</strong> EUDR{' '}
          <span
            style={{
              fontWeight: 700,
              color: parcel.eudrStatus === 'VERDE' ? T.colors.statusGreen : T.colors.statusRed,
            }}
          >
            {parcel.eudrStatus}
          </span>{' '}
          · CUSTF{' '}
          <span
            style={{
              fontWeight: 700,
              color: custf.isProducerBlocked ? T.colors.statusRed : T.colors.statusGreen,
            }}
          >
            {custf.isProducerBlocked ? 'Bloqueado' : 'En regla'}
          </span>{' '}
          · Dictamen de exportación:{' '}
          <strong>{canExportTraces ? 'Autorizada' : 'Rechazo preventivo'}</strong>
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
            Acción sugerida: para exportar a TRACES NT, la parcela debe tener estatus EUDR VERDE y
            no estar bloqueada por permiso CUSTF de SEMARNAT.
          </div>
        </div>
      )}
    </section>
  );
}
