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

const cardStyle: React.CSSProperties = {
  backgroundColor: T.colors.surfaceCard,
  border: `1px solid ${T.colors.borderSubtle}`,
  borderRadius: 20,
  padding: '26px 28px',
  marginTop: 24,
  boxShadow: T.shadows.card,
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
        flex: '1 1 360px',
        backgroundColor: T.colors.backgroundPrimary,
        padding: 16,
        borderRadius: 16,
        border: `1px solid ${T.colors.borderSubtle}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
          gap: 8,
        }}
      >
        <figcaption style={{ fontWeight: 800, fontSize: 14.5, color: T.colors.textPrimary }}>
          {title}
        </figcaption>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 999,
            backgroundColor: badgeBg,
            color: badgeColor,
          }}
        >
          {badgeText}
        </span>
      </div>
      <div style={{ fontSize: 12, color: T.colors.textSecondary, marginBottom: 10 }}>
        {subtitle}
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{
          backgroundColor: '#132A1C',
          borderRadius: 12,
          border: `1px solid ${T.colors.primaryGreen}`,
          display: 'block',
        }}
      >
        {/* Subtle GIS Topographic Grid */}
        {[40, 80, 120, 160, 200].map((y) => (
          <line
            key={`h-${y}`}
            x1={0}
            y1={y}
            x2={SVG_W}
            y2={y}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={1}
          />
        ))}
        {[70, 140, 210, 280, 350].map((x) => (
          <line
            key={`v-${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={SVG_H}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={1}
          />
        ))}

        {/* Compass Rose & Datum */}
        <g transform="translate(385, 28)">
          <circle r="14" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" />
          <text x="0" y="4" textAnchor="middle" fill="#E7F3EC" fontSize="10" fontWeight="bold">
            N▲
          </text>
        </g>
        <text x="12" y="228" fill="rgba(231,243,236,0.55)" fontSize="10" fontFamily="monospace">
          WGS84 · EPSG:4326 · Chontalpa, TAB
        </text>

        {/* Geometry Ring */}
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

        {/* Vertex Nodes */}
        {pointList.map((pt, i) => (
          <g key={`${pt.x}-${pt.y}-${i}`}>
            <circle cx={pt.x} cy={pt.y} r={6} fill="#FFFFFF" stroke={stroke} strokeWidth={2.5} />
            <text
              x={pt.x + 9}
              y={pt.y - 7}
              fill="#FFFFFF"
              fontSize="10"
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
          ? `${e.message}. ¿Está encendido el Geo-Engine en ${GEO_ENGINE_BASE_URL}?`
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
        `✅ Paquete Due Diligence descargado. Huella SHA-256: ${String(
          pkg.package_integrity_sha256,
        ).slice(0, 20)}…`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section style={cardStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 10,
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
            Épica 1 & Conector Europeo · Geometría Geoespacial y Aduanas UE
          </span>
          <h2
            style={{
              margin: '4px 0 0',
              color: T.colors.primaryGreen,
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            🗺️ Linter Topológico en Vivo (HU-01, HU-02) & Conector TRACES NT
          </h2>
        </div>

        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'monospace',
            padding: '5px 12px',
            borderRadius: 999,
            backgroundColor: T.colors.softGreenBg,
            color: T.colors.primaryGreen,
            border: `1px solid ${T.colors.secondaryGreen}40`,
          }}
        >
          ⚡ Endpoint: {GEO_ENGINE_BASE_URL}
        </span>
      </div>

      <p style={{ fontSize: 13.5, color: T.colors.textSecondary, marginTop: 0, marginBottom: 16 }}>
        Simula la captura de un polígono GPS caminado en campo y envíalo al motor analítico Python
        (FastAPI) para reparar auto-intersecciones, forzar el cierre del anillo exterior según{' '}
        <strong>GeoJSON RFC 7946</strong> y verificar el peso {'<'} 25 MB:
      </p>

      {/* Preset Selector Pills */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
          backgroundColor: T.colors.backgroundPrimary,
          padding: 10,
          borderRadius: 14,
          border: `1px solid ${T.colors.borderSubtle}`,
        }}
      >
        {(Object.keys(PRESET_POLYGONS) as PresetPolygonKey[]).map((key) => {
          const isSelected = presetKey === key;
          return (
            <button
              key={key}
              onClick={() => {
                setPresetKey(key);
                setReport(null);
                setError(null);
                setExportMsg(null);
              }}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
                border: `2px solid ${isSelected ? T.colors.primaryGreen : T.colors.borderSubtle}`,
                backgroundColor: isSelected ? T.colors.softGreenBg : '#FFFFFF',
                color: isSelected ? T.colors.primaryGreen : T.colors.textPrimary,
              }}
            >
              📐 {PRESET_POLYGONS[key].label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 13,
          color: T.colors.earthCacao,
          backgroundColor: T.colors.softCacaoBg,
          padding: '8px 14px',
          borderRadius: 10,
          marginBottom: 16,
          fontWeight: 600,
        }}
      >
        🔎 <strong>Escenario seleccionado:</strong> {preset.description}
      </div>

      {/* Dual Cartographic Canvas */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
        <PolygonSvg
          title="Antes: Trazo GPS Crudo de Campo"
          subtitle={`${preset.coordinates.length} vértices capturados sin validación topológica`}
          badgeText="Anillo Abierto / Crudo"
          badgeBg="#FEE2E2"
          badgeColor={T.colors.statusRed}
          coordinates={preset.coordinates}
          closeRing={false}
          stroke="#F87171"
          fill="none"
        />

        {report ? (
          <PolygonSvg
            title="Después: Geometría Oficial Reparada (RFC 7946)"
            subtitle={`Área geodésica: ${report.area_hectares} ha · ${report.vertex_count} vértices · ${report.byte_size} bytes`}
            badgeText="Topología Válida EUDR"
            badgeBg="#DCFCE7"
            badgeColor={T.colors.statusGreen}
            coordinates={report.polygon.coordinates[0]}
            closeRing
            stroke="#4ADE80"
            fill="rgba(74, 222, 128, 0.24)"
          />
        ) : (
          <div
            style={{
              flex: '1 1 360px',
              backgroundColor: T.colors.backgroundPrimary,
              borderRadius: 16,
              border: `2px dashed ${T.colors.borderStrong}`,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minHeight: 280,
            }}
          >
            <div style={{ fontSize: 34, marginBottom: 10 }}>🛰️</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.colors.primaryGreen }}>
              Listo para Inspección Topológica
            </div>
            <p
              style={{
                fontSize: 13,
                color: T.colors.textSecondary,
                maxWidth: 320,
                margin: '6px 0 0',
              }}
            >
              Haz clic en <strong>“▶ Ejecutar Linter en Geo-Engine”</strong> para enviar las
              coordenadas al microservicio FastAPI y visualizar el polígono reparado.
            </p>
          </div>
        )}
      </div>

      {/* Diagnostic Telemetry Metrics */}
      {report && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              backgroundColor: T.colors.softGreenBg,
              padding: '10px 14px',
              borderRadius: 12,
              border: `1px solid ${T.colors.secondaryGreen}30`,
            }}
          >
            <div style={{ fontSize: 11.5, color: T.colors.textSecondary }}>Estado Topológico</div>
            <div style={{ fontWeight: 800, color: T.colors.statusGreen, fontSize: 14 }}>
              {report.is_topology_valid ? '✅ Válido RFC 7946' : '❌ Inválido'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              padding: '10px 14px',
              borderRadius: 12,
              border: `1px solid ${T.colors.borderSubtle}`,
            }}
          >
            <div style={{ fontSize: 11.5, color: T.colors.textSecondary }}>
              Cierre de Anillo Exterior
            </div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {report.was_ring_auto_closed ? '🔧 Auto-cerrado' : '✓ Cerrado de origen'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              padding: '10px 14px',
              borderRadius: 12,
              border: `1px solid ${T.colors.borderSubtle}`,
            }}
          >
            <div style={{ fontSize: 11.5, color: T.colors.textSecondary }}>
              Auto-intersección (&quot;8&quot;)
            </div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {report.was_self_intersection_repaired ? '🔧 Reparada (Hull)' : '✓ Sin cruces'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              padding: '10px 14px',
              borderRadius: 12,
              border: `1px solid ${T.colors.borderSubtle}`,
            }}
          >
            <div style={{ fontSize: 11.5, color: T.colors.textSecondary }}>
              Superficie & Peso GeoJSON
            </div>
            <div style={{ fontWeight: 800, fontSize: 14, color: T.colors.primaryGreen }}>
              {report.area_hectares} ha · {report.byte_size} B
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              padding: '10px 14px',
              borderRadius: 12,
              border: `1px solid ${T.colors.borderSubtle}`,
            }}
          >
            <div style={{ fontSize: 11.5, color: T.colors.textSecondary }}>
              Regla EUDR ({'>'} 4.0 ha)
            </div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {report.requires_mandatory_polygon_eudr
                ? '📌 Polígono Obligatorio'
                : 'Minifundio ≤ 4 ha'}
            </div>
          </div>
        </div>
      )}

      {/* Action Bar & Pre-Flight Checklist for TRACES NT */}
      <div
        style={{
          backgroundColor: T.colors.backgroundPrimary,
          borderRadius: 14,
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
          <button
            onClick={runLinter}
            disabled={loading}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              border: 'none',
              background: `linear-gradient(135deg, ${T.colors.primaryGreen} 0%, ${T.colors.secondaryGreen} 100%)`,
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(22, 74, 40, 0.2)',
            }}
          >
            {loading ? 'Validando…' : '▶ Ejecutar Linter en Geo-Engine'}
          </button>

          <button
            onClick={exportTraces}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              border: `2px solid ${T.colors.earthCacao}`,
              backgroundColor: '#FFFFFF',
              color: T.colors.earthCacao,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            🇪🇺 Descargar Paquete TRACES NT ({parcel.parcelId})
          </button>
        </div>

        <div style={{ fontSize: 12.5, color: T.colors.textSecondary }}>
          <strong>Compuerta Aduanal ({parcel.parcelId}):</strong> EUDR{' '}
          <span
            style={{
              fontWeight: 800,
              color: parcel.eudrStatus === 'VERDE' ? T.colors.statusGreen : T.colors.statusRed,
            }}
          >
            {parcel.eudrStatus}
          </span>{' '}
          · CUSTF{' '}
          <span
            style={{
              fontWeight: 800,
              color: custf.isProducerBlocked ? T.colors.statusRed : T.colors.statusGreen,
            }}
          >
            {custf.isProducerBlocked ? '⛔ Bloqueado' : '✅ En Regla'}
          </span>{' '}
          · Exportación:{' '}
          <strong>{canExportTraces ? '🟢 Autorizada' : '🔴 Rechazo Automático'}</strong>
        </div>
      </div>

      {exportMsg && (
        <div
          style={{
            marginTop: 12,
            padding: '12px 16px',
            borderRadius: 10,
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: T.colors.statusGreen,
            fontWeight: 700,
            fontSize: 13.5,
          }}
        >
          {exportMsg}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: '12px 16px',
            borderRadius: 10,
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: T.colors.statusRed,
            fontWeight: 700,
            fontSize: 13.5,
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}
