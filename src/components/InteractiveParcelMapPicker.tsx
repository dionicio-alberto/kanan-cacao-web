'use client';

import React, { useMemo, useRef, useState } from 'react';
import { validateTopologyLive } from '@/services/geoEngineLiveClient';
import {
  estimatePolygonHectares,
  latLngToScreenPoint,
  latLngToWorldPixel,
  screenClickToLatLng,
  worldPixelToLatLng,
} from '@/services/producerLogbookService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

export type InteractiveMapLayer = 'satellite' | 'traffic';

interface InteractiveParcelMapPickerProps {
  initialCenterLat?: number;
  initialCenterLng?: number;
  onPolygonChange: (coordinates: number[][], estimatedHectares: number) => void;
}

const VIEW_W = 760;
const VIEW_H = 420;
const TILE_SIZE = 256;

export default function InteractiveParcelMapPicker({
  initialCenterLat = 18.2545,
  initialCenterLng = -93.2825,
  onPolygonChange,
}: InteractiveParcelMapPickerProps) {
  const [mapLayer, setMapLayer] = useState<InteractiveMapLayer>('satellite');
  const [zoom, setZoom] = useState<number>(16);
  const [centerLat, setCenterLat] = useState<number>(initialCenterLat);
  const [centerLng, setCenterLng] = useState<number>(initialCenterLng);
  const [gpsMarker, setGpsMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  const [vertices, setVertices] = useState<number[][]>([]);
  const [repairing, setRepairing] = useState<boolean>(false);
  const [lintNotice, setLintNotice] = useState<string | null>(null);

  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    moved: boolean;
    origCenterWorldX: number;
    origCenterWorldY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    moved: false,
    origCenterWorldX: 0,
    origCenterWorldY: 0,
  });

  const tiles = useMemo(() => {
    const centerWorld = latLngToWorldPixel(centerLat, centerLng, zoom);
    const topLeftX = centerWorld.x - VIEW_W / 2;
    const topLeftY = centerWorld.y - VIEW_H / 2;
    const maxTile = Math.pow(2, zoom) - 1;

    const minTx = Math.max(0, Math.floor(topLeftX / TILE_SIZE));
    const maxTx = Math.min(maxTile, Math.floor((topLeftX + VIEW_W) / TILE_SIZE));
    const minTy = Math.max(0, Math.floor(topLeftY / TILE_SIZE));
    const maxTy = Math.min(maxTile, Math.floor((topLeftY + VIEW_H) / TILE_SIZE));

    const list: Array<{
      key: string;
      baseUrl: string;
      overlayUrl?: string;
      leftPct: number;
      topPct: number;
      widthPct: number;
      heightPct: number;
    }> = [];

    for (let tx = minTx; tx <= maxTx; tx += 1) {
      for (let ty = minTy; ty <= maxTy; ty += 1) {
        const leftPct = ((tx * TILE_SIZE - topLeftX) / VIEW_W) * 100;
        const topPct = ((ty * TILE_SIZE - topLeftY) / VIEW_H) * 100;
        const widthPct = (TILE_SIZE / VIEW_W) * 100;
        const heightPct = (TILE_SIZE / VIEW_H) * 100;

        const baseUrl =
          mapLayer === 'satellite'
            ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`
            : `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;

        const overlayUrl =
          mapLayer === 'satellite'
            ? `https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${zoom}/${ty}/${tx}`
            : undefined;

        list.push({
          key: `${mapLayer}-${zoom}-${tx}-${ty}`,
          baseUrl,
          overlayUrl,
          leftPct,
          topPct,
          widthPct,
          heightPct,
        });
      }
    }
    return list;
  }, [centerLat, centerLng, zoom, mapLayer]);

  const emitUpdatedVertices = (nextVertices: number[][]) => {
    setVertices(nextVertices);
    if (nextVertices.length >= 3) {
      const closed = [...nextVertices, nextVertices[0]];
      const ha = Number(estimatePolygonHectares(closed).toFixed(2));
      onPolygonChange(closed, ha);
    } else {
      onPolygonChange(nextVertices, 0);
    }
  };

  const handleLocateGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsMessage('Tu navegador no permite leer GPS; puedes mover el mapa y dar clic manual.');
      return;
    }
    setGpsMessage('Buscando tu ubicación GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = Number(pos.coords.latitude.toFixed(6));
        const nextLng = Number(pos.coords.longitude.toFixed(6));
        setCenterLat(nextLat);
        setCenterLng(nextLng);
        setGpsMarker({ lat: nextLat, lng: nextLng });
        setZoom(17);
        setGpsMessage(`Mapa centrado en tu ubicación GPS (${nextLat}, ${nextLng}).`);
      },
      () => {
        setGpsMessage(
          'No se autorizó la ubicación GPS en el navegador; desplaza el mapa y marca tus esquinas con clic.',
        );
      },
    );
  };

  const handlePanByPixels = (dx: number, dy: number) => {
    const centerWorld = latLngToWorldPixel(centerLat, centerLng, zoom);
    const next = worldPixelToLatLng(centerWorld.x + dx, centerWorld.y + dy, zoom);
    setCenterLat(next.lat);
    setCenterLng(next.lng);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const centerWorld = latLngToWorldPixel(centerLat, centerLng, zoom);
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      origCenterWorldX: centerWorld.x,
      origCenterWorldY: centerWorld.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active || !mapBoxRef.current) {
      return;
    }
    const rawDx = e.clientX - dragStateRef.current.startX;
    const rawDy = e.clientY - dragStateRef.current.startY;
    if (Math.hypot(rawDx, rawDy) > 5) {
      dragStateRef.current.moved = true;
      const rect = mapBoxRef.current.getBoundingClientRect();
      const scaleX = VIEW_W / Math.max(rect.width, 1);
      const scaleY = VIEW_H / Math.max(rect.height, 1);
      const next = worldPixelToLatLng(
        dragStateRef.current.origCenterWorldX - rawDx * scaleX,
        dragStateRef.current.origCenterWorldY - rawDy * scaleY,
        zoom,
      );
      setCenterLat(next.lat);
      setCenterLng(next.lng);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasMoved = dragStateRef.current.moved;
    dragStateRef.current.active = false;
    dragStateRef.current.moved = false;

    if (wasMoved || !mapBoxRef.current) {
      return;
    }

    const rect = mapBoxRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * VIEW_W;
    const clickY = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * VIEW_H;
    const picked = screenClickToLatLng(clickX, clickY, VIEW_W, VIEW_H, centerLat, centerLng, zoom);
    setLintNotice(null);

    // Snap automático de 5 metros al vértice de origen si hay >= 3 esquinas
    if (vertices.length >= 3) {
      const originLng = vertices[0][0];
      const originLat = vertices[0][1];
      const dLat = ((picked.lat - originLat) * Math.PI) / 180;
      const dLon = ((picked.lng - originLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((originLat * Math.PI) / 180) *
          Math.cos((picked.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distMeters = 6378137.0 * c;

      if (distMeters <= 5.0) {
        const closed = [...vertices, [originLng, originLat]];
        const ha = Number(estimatePolygonHectares(closed).toFixed(2));
        onPolygonChange(closed, ha);
        setLintNotice(`🛰️ ¡Polígono cerrado con snap de 5m! (${ha.toFixed(2)} hectáreas medidas).`);
        return;
      }
    }

    emitUpdatedVertices([...vertices, [picked.lng, picked.lat]]);
  };

  const handleValidateAndFixRing = async () => {
    if (vertices.length < 3) {
      setLintNotice(
        'Marca al menos 3 esquinas dando clic sobre el mapa antes de cuadrar linderos.',
      );
      return;
    }
    setRepairing(true);
    setLintNotice(null);
    try {
      const report = await validateTopologyLive('NUEVA-PARCELA-BORRADOR', vertices);
      const repairedRing = report.polygon.coordinates[0];
      const openCorners =
        repairedRing.length > 1 ? repairedRing.slice(0, repairedRing.length - 1) : repairedRing;
      const roundedHa = Number(Number(report.area_hectares).toFixed(2));
      setVertices(openCorners);
      onPolygonChange(repairedRing, roundedHa);
      setLintNotice(
        report.was_self_intersection_repaired
          ? `Linderos corregidos y cerrados automáticamente (${roundedHa.toFixed(2)} hectáreas medidas).`
          : `Linderos cerrados correctamente (${roundedHa.toFixed(2)} hectáreas medidas).`,
      );
    } catch {
      const closed = [...vertices, vertices[0]];
      const ha = Number(estimatePolygonHectares(closed).toFixed(2));
      onPolygonChange(closed, ha);
      setLintNotice(`Lindero cerrado localmente (${ha.toFixed(2)} hectáreas aproximadas).`);
    } finally {
      setRepairing(false);
    }
  };

  const screenPoints = vertices.map(([lng, lat]) =>
    latLngToScreenPoint(lat, lng, VIEW_W, VIEW_H, centerLat, centerLng, zoom),
  );
  const polygonSvgStr = screenPoints.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const gpsScreenPoint = gpsMarker
    ? latLngToScreenPoint(gpsMarker.lat, gpsMarker.lng, VIEW_W, VIEW_H, centerLat, centerLng, zoom)
    : null;
  const currentEstHa =
    vertices.length >= 3 ? estimatePolygonHectares([...vertices, vertices[0]]) : 0;

  return (
    <div
      style={{
        backgroundColor: T.colors.surfaceCard,
        border: `1.5px solid ${T.colors.borderSubtle}`,
        borderRadius: 12,
        padding: 14,
        display: 'grid',
        gap: 12,
      }}
    >
      {/* Barra de controles del mapa interactivo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-control"
            aria-pressed={mapLayer === 'satellite'}
            onClick={() => setMapLayer('satellite')}
            style={{
              padding: '6px 11px',
              fontSize: '0.8rem',
              backgroundColor:
                mapLayer === 'satellite' ? T.colors.primaryGreen : T.colors.surfaceCard,
              color: mapLayer === 'satellite' ? '#FFFFFF' : T.colors.textPrimary,
              borderColor:
                mapLayer === 'satellite' ? T.colors.primaryGreen : T.colors.borderControl,
            }}
          >
            🛰️ Satélite Sentinel-2
          </button>

          <button
            type="button"
            className="btn-control"
            aria-pressed={mapLayer === 'traffic'}
            onClick={() => setMapLayer('traffic')}
            style={{
              padding: '6px 11px',
              fontSize: '0.8rem',
              backgroundColor: mapLayer === 'traffic' ? T.colors.earthCacao : T.colors.surfaceCard,
              color: mapLayer === 'traffic' ? '#FFFFFF' : T.colors.textPrimary,
              borderColor: mapLayer === 'traffic' ? T.colors.earthCacao : T.colors.borderControl,
            }}
          >
            🛣️ Mapa de Calles y Caminos
          </button>

          <button
            type="button"
            className="btn-control"
            onClick={handleLocateGps}
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            📍 Centrar con mi GPS
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-control"
            aria-label="Alejar mapa"
            disabled={zoom <= 12}
            onClick={() => setZoom((z) => Math.max(12, z - 1))}
            style={{ padding: '6px 10px', fontSize: '0.84rem' }}
          >
            ➖ Alejar
          </button>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0 4px' }}>
            Zoom {zoom}x
          </span>
          <button
            type="button"
            className="btn-control"
            aria-label="Acercar mapa"
            disabled={zoom >= 19}
            onClick={() => setZoom((z) => Math.min(19, z + 1))}
            style={{ padding: '6px 10px', fontSize: '0.84rem' }}
          >
            ➕ Acercar
          </button>
        </div>
      </div>

      {/* Botones de desplazamiento por si el usuario prefiere mover sin arrastrar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          fontSize: '0.8rem',
          color: T.colors.textSecondary,
        }}
      >
        <span>
          <strong>Cómo marcar tu parcela:</strong> Arrastra para moverte por el mapa y{' '}
          <strong>haz clic en cada esquina</strong> de tu terreno para ir dibujando el área.
        </span>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            className="btn-control"
            aria-label="Mover mapa al norte"
            onClick={() => handlePanByPixels(0, -140)}
            style={{ padding: '4px 8px', minHeight: 30, fontSize: '0.78rem' }}
          >
            ⬆️
          </button>
          <button
            type="button"
            className="btn-control"
            aria-label="Mover mapa al sur"
            onClick={() => handlePanByPixels(0, 140)}
            style={{ padding: '4px 8px', minHeight: 30, fontSize: '0.78rem' }}
          >
            ⬇️
          </button>
          <button
            type="button"
            className="btn-control"
            aria-label="Mover mapa al oeste"
            onClick={() => handlePanByPixels(-160, 0)}
            style={{ padding: '4px 8px', minHeight: 30, fontSize: '0.78rem' }}
          >
            ⬅️
          </button>
          <button
            type="button"
            className="btn-control"
            aria-label="Mover mapa al este"
            onClick={() => handlePanByPixels(160, 0)}
            style={{ padding: '4px 8px', minHeight: 30, fontSize: '0.78rem' }}
          >
            ➡️
          </button>
        </div>
      </div>

      {gpsMessage ? (
        <div
          role="status"
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            backgroundColor: T.colors.softGreenBg,
            color: T.colors.primaryGreen,
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          {gpsMessage}
        </div>
      ) : null}

      {/* Lienzo interactivo de mosaicos Web Mercator */}
      <div
        ref={mapBoxRef}
        role="application"
        aria-label="Mapa interactivo para seleccionar las esquinas de la parcela"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${VIEW_W} / ${VIEW_H}`,
          backgroundColor: '#17281e',
          borderRadius: 10,
          overflow: 'hidden',
          border: `2px solid ${T.colors.primaryGreen}`,
          cursor: 'crosshair',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {tiles.map((tile) => (
          <React.Fragment key={tile.key}>
            <img
              src={tile.baseUrl}
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
            {tile.overlayUrl ? (
              <img
                src={tile.overlayUrl}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: `${tile.leftPct}%`,
                  top: `${tile.topPct}%`,
                  width: `${tile.widthPct}%`,
                  height: `${tile.heightPct}%`,
                  pointerEvents: 'none',
                  opacity: 0.8,
                }}
              />
            ) : null}
          </React.Fragment>
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
          {screenPoints.length >= 3 ? (
            <polygon
              points={polygonSvgStr}
              fill="rgba(74, 222, 128, 0.28)"
              stroke="#4ADE80"
              strokeWidth={3}
            />
          ) : screenPoints.length >= 2 ? (
            <polyline
              points={polygonSvgStr}
              fill="none"
              stroke="#FDE047"
              strokeWidth={3}
              strokeDasharray="6 4"
            />
          ) : null}

          {screenPoints.map((pt, index) => (
            <g key={`corner-${index}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={10}
                fill="#144526"
                stroke="#FFFFFF"
                strokeWidth={2.5}
              />
              <text
                x={pt.x}
                y={pt.y + 3.5}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="700"
              >
                {index + 1}
              </text>
            </g>
          ))}

          {gpsScreenPoint ? (
            <g>
              <circle
                cx={gpsScreenPoint.x}
                cy={gpsScreenPoint.y}
                r={12}
                fill="rgba(59, 130, 246, 0.25)"
              />
              <circle
                cx={gpsScreenPoint.x}
                cy={gpsScreenPoint.y}
                r={6}
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            </g>
          ) : null}
        </svg>

        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            backgroundColor: 'rgba(17, 36, 24, 0.85)',
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '0.74rem',
            fontWeight: 700,
            pointerEvents: 'none',
          }}
        >
          Centro: {centerLat}, {centerLng} · Esquinas marcadas: {vertices.length}
          {currentEstHa > 0 ? ` · Superficie aprox.: ${currentEstHa} ha` : ''}
        </div>
      </div>

      {/* Herramientas de corrección de linderos durante la selección */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-control"
            disabled={vertices.length === 0}
            onClick={() => {
              setLintNotice(null);
              emitUpdatedVertices(vertices.slice(0, -1));
            }}
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
          >
            ↩️ Quitar última esquina
          </button>
          <button
            type="button"
            className="btn-control"
            disabled={vertices.length === 0}
            onClick={() => {
              setLintNotice(null);
              emitUpdatedVertices([]);
            }}
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
          >
            🗑️ Limpiar puntos
          </button>
        </div>

        <button
          type="button"
          className="btn-cacao"
          disabled={repairing || vertices.length < 3}
          onClick={() => void handleValidateAndFixRing()}
          style={{ fontSize: '0.82rem', padding: '7px 14px' }}
        >
          {repairing ? 'Corrigiendo linderos...' : '✨ Revisar y cuadrar linderos'}
        </button>
      </div>

      {lintNotice ? (
        <div
          role="status"
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: T.colors.softGreenBg,
            color: T.colors.primaryGreen,
            border: `1px solid ${T.colors.secondaryGreen}`,
            fontSize: '0.82rem',
            fontWeight: 700,
          }}
        >
          {lintNotice}
        </div>
      ) : null}
    </div>
  );
}
