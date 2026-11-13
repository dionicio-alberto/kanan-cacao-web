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

const card: React.CSSProperties = {
  backgroundColor: T.colors.surfaceCard,
  border: `1px solid ${T.colors.borderSubtle}`,
  borderRadius: 16,
  padding: 24,
  marginTop: 24,
};

const SVG_W = 320;
const SVG_H = 200;

function PolygonSvg({
  coordinates,
  closeRing,
  stroke,
  fill,
  title,
}: {
  coordinates: number[][];
  closeRing: boolean;
  stroke: string;
  fill: string;
  title: string;
}) {
  const points = projectCoordinatesToSvgPoints(coordinates, SVG_W, SVG_H);
  return (
    <figure style={{ margin: 0, flex: 1, minWidth: 300 }}>
      <figcaption style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{title}</figcaption>
      <svg
        width="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{
          backgroundColor: T.colors.backgroundSecondary,
          borderRadius: 12,
          border: `1px solid ${T.colors.borderSubtle}`,
        }}
      >
        {closeRing ? (
          <polygon points={points} fill={fill} stroke={stroke} strokeWidth={3} />
        ) : (
          <polyline
            points={points}
            fill="none"
            stroke={stroke}
            strokeWidth={3}
            strokeDasharray="6 4"
          />
        )}
        {points.split(' ').map((pt, i) => {
          const [x, y] = pt.split(',').map(Number);
          return <circle key={`${pt}-${i}`} cx={x} cy={y} r={5} fill={stroke} />;
        })}
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
        `✅ Paquete descargado. Huella SHA-256: ${String(pkg.package_integrity_sha256).slice(0, 16)}…`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section style={card}>
      <h2 style={{ marginTop: 0, color: T.colors.primaryGreen }}>
        🗺️ Linter Topológico en Vivo (HU-01, HU-02) — conectado a Geo-Engine
      </h2>
      <p style={{ fontSize: 14, color: T.colors.textSecondary, marginTop: 0 }}>
        Envía un polígono de campo al motor Python (<code>{GEO_ENGINE_BASE_URL}</code>) y compara el
        trazo crudo contra la geometría reparada.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {(Object.keys(PRESET_POLYGONS) as PresetPolygonKey[]).map((key) => (
          <button
            key={key}
            onClick={() => {
              setPresetKey(key);
              setReport(null);
              setError(null);
              setExportMsg(null);
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              border: `2px solid ${presetKey === key ? T.colors.primaryGreen : T.colors.borderSubtle}`,
              backgroundColor: presetKey === key ? T.colors.softGreenBg : '#FFFFFF',
            }}
          >
            {PRESET_POLYGONS[key].label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 13, marginTop: 0 }}>{preset.description}</p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <PolygonSvg
          title="Antes: trazo GPS crudo"
          coordinates={preset.coordinates}
          closeRing={false}
          stroke={T.colors.statusRed}
          fill="none"
        />
        {report && (
          <PolygonSvg
            title="Después: geometría reparada por el Linter"
            coordinates={report.polygon.coordinates[0]}
            closeRing
            stroke={T.colors.statusGreen}
            fill="rgba(27,127,55,0.18)"
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <button
          onClick={runLinter}
          disabled={loading}
          style={{
            padding: '12px 18px',
            borderRadius: 10,
            border: 'none',
            backgroundColor: T.colors.primaryGreen,
            color: '#FFFFFF',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Validando…' : '▶ Ejecutar Linter en Geo-Engine'}
        </button>
        <button
          onClick={exportTraces}
          style={{
            padding: '12px 18px',
            borderRadius: 10,
            border: `2px solid ${T.colors.earthCacao}`,
            backgroundColor: '#FFFFFF',
            color: T.colors.earthCacao,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          🇪🇺 Descargar Paquete TRACES NT ({parcel.parcelId})
        </button>
      </div>

      {report && (
        <ul style={{ fontSize: 14, marginTop: 16, lineHeight: 1.7 }}>
          <li>Anillo cerrado automáticamente: {report.was_ring_auto_closed ? 'Sí' : 'No'}</li>
          <li>Auto-intersección reparada: {report.was_self_intersection_repaired ? 'Sí' : 'No'}</li>
          <li>Topología válida: {report.is_topology_valid ? '✅ Sí' : '❌ No'}</li>
          <li>
            Superficie: <strong>{report.area_hectares} ha</strong> · Vértices: {report.vertex_count}{' '}
            · Peso: {report.byte_size} bytes
          </li>
          <li>
            Polígono obligatorio EUDR ({'>'} 4 ha):{' '}
            {report.requires_mandatory_polygon_eudr ? 'Sí' : 'No'}
          </li>
        </ul>
      )}

      <p style={{ fontSize: 13, color: T.colors.textSecondary }}>
        Estado de exportación para la parcela seleccionada: EUDR{' '}
        <strong>{parcel.eudrStatus}</strong> · CUSTF{' '}
        {custf.isProducerBlocked ? '⛔ bloqueado' : '✅ en regla'}. El Geo-Engine rechazará la
        exportación si alguna compuerta falla.
      </p>

      {exportMsg && (
        <div style={{ color: T.colors.statusGreen, fontWeight: 600, fontSize: 14 }}>
          {exportMsg}
        </div>
      )}
      {error && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 10,
            backgroundColor: '#FEE2E2',
            color: T.colors.statusRed,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}
