'use client';

import React, { useState } from 'react';
import InteractiveParcelMapPicker from '@/components/InteractiveParcelMapPicker';
import LiveGeoEnginePanel from '@/components/LiveGeoEnginePanel';
import {
  buildClosedPolygonFromCenter,
  getProducerFriendlyParcelStatus,
  parseCoordinatePairsText,
} from '@/services/producerLogbookService';
import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

export interface CreateGeorefParcelPayload {
  parcelName: string;
  producerName: string;
  municipality: string;
  areaHectares: number;
  shadeTreeCount: number;
  coordinates: number[][];
}

interface ParcelsAndGeorefModuleProps {
  parcels: ParcelAdminOverview[];
  selectedParcel: ParcelAdminOverview;
  onSelectParcel: (parcelId: string) => void;
  onToggleCustf: (parcelId: string) => void;
  onCreateGeorefParcel: (payload: CreateGeorefParcelPayload) => Promise<void>;
  savingGeoref: boolean;
  georefStatusMsg: string | null;
  georefErrorMsg: string | null;
}

const TABASCO_MUNICIPALITIES = [
  'Comalcalco',
  'Cunduacán',
  'Paraíso',
  'Cárdenas',
  'Huimanguillo',
  'Jalpa de Méndez',
] as const;

export default function ParcelsAndGeorefModule({
  parcels,
  selectedParcel,
  onSelectParcel,
  onToggleCustf,
  onCreateGeorefParcel,
  savingGeoref,
  georefStatusMsg,
  georefErrorMsg,
}: ParcelsAndGeorefModuleProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [municipalityFilter, setMunicipalityFilter] = useState('TODAS');
  const [captureMethod, setCaptureMethod] = useState<
    'MAPA_INTERACTIVO' | 'CENTRO_GPS' | 'ESQUINAS'
  >('MAPA_INTERACTIVO');

  const [parcelName, setParcelName] = useState('');
  const [producerName, setProducerName] = useState('');
  const [municipality, setMunicipality] = useState<string>('Comalcalco');
  const [areaHectares, setAreaHectares] = useState('3.2');
  const [shadeTreeCount, setShadeTreeCount] = useState('85');
  const [centerLat, setCenterLat] = useState('18.2485');
  const [centerLng, setCenterLng] = useState('-93.2615');
  const [mapCoordinates, setMapCoordinates] = useState<number[][]>([]);
  const [customCoordsText, setCustomCoordsText] = useState(
    '-93.263, 18.250\n-93.259, 18.250\n-93.259, 18.247\n-93.263, 18.247'
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const visibleParcels = parcels.filter((item) =>
    municipalityFilter === 'TODAS' ? true : item.municipality === municipalityFilter
  );

  const handleUseBrowserGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('Tu navegador no permite leer ubicación GPS directa; captura las coordenadas abajo.');
      return;
    }
    setGpsStatus('Leyendo ubicación actual...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenterLat(pos.coords.latitude.toFixed(6));
        setCenterLng(pos.coords.longitude.toFixed(6));
        setGpsStatus('Ubicación cargada desde tu dispositivo.');
      },
      () => {
        setGpsStatus(
          'No se pudo obtener el permiso de ubicación. Puedes escribir la latitud y longitud manualmente.'
        );
      }
    );
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsedArea = Number(areaHectares);
    const parsedShade = Number(shadeTreeCount);
    if (!parcelName.trim() || !producerName.trim()) {
      setFormError('Escribe el nombre de la parcela y del productor.');
      return;
    }
    if (!Number.isFinite(parsedArea) || parsedArea <= 0) {
      setFormError('Indica cuántas hectáreas mide la parcela (mayor a 0).');
      return;
    }

    let coordinates: number[][];
    try {
      if (captureMethod === 'MAPA_INTERACTIVO') {
        if (mapCoordinates.length < 3) {
          setFormError(
            'Da clic al menos en 3 esquinas del mapa interactivo para marcar la nueva parcela.'
          );
          return;
        }
        coordinates = mapCoordinates;
      } else if (captureMethod === 'ESQUINAS') {
        coordinates = parseCoordinatePairsText(customCoordsText);
      } else {
        const lat = Number(centerLat);
        const lng = Number(centerLng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setFormError('Escribe coordenadas válidas de latitud y longitud.');
          return;
        }
        coordinates = buildClosedPolygonFromCenter(lat, lng, parsedArea);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Revisa las coordenadas ingresadas.');
      return;
    }

    await onCreateGeorefParcel({
      parcelName: parcelName.trim(),
      producerName: producerName.trim(),
      municipality,
      areaHectares: parsedArea,
      shadeTreeCount: Number.isFinite(parsedShade) && parsedShade >= 0 ? parsedShade : 0,
      coordinates,
    });
    setParcelName('');
    setShowCreateForm(false);
  };

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section
        aria-labelledby="parcels-header-title"
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
              id="parcels-header-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.5rem',
                color: T.colors.primaryGreen,
              }}
            >
              Mis Parcelas y Georreferencia
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: T.colors.textSecondary }}>
              Elige una parcela para ver su mapa satelital real o registra una nueva georreferencia
              en campo.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              aria-label="Filtrar parcelas por municipio"
              value={municipalityFilter}
              onChange={(e) => setMunicipalityFilter(e.target.value)}
              className="field-input"
              style={{ width: 'auto', marginTop: 0, padding: '8px 12px' }}
            >
              <option value="TODAS">Todos los municipios ({parcels.length})</option>
              {TABASCO_MUNICIPALITIES.map((mun) => (
                <option key={mun} value={mun}>
                  {mun}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-primary"
              aria-expanded={showCreateForm}
              onClick={() => setShowCreateForm((prev) => !prev)}
            >
              {showCreateForm ? 'Cerrar formulario' : '➕ Nueva georreferencia de parcela'}
            </button>
          </div>
        </div>

        {georefStatusMsg ? (
          <div
            role="status"
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: T.colors.statusGreenBg,
              color: T.colors.statusGreen,
              border: '1px solid #15803D',
              fontWeight: 700,
              fontSize: '0.86rem',
            }}
          >
            {georefStatusMsg}
          </div>
        ) : null}

        {georefErrorMsg ? (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: T.colors.statusRedBg,
              color: T.colors.statusRed,
              border: '1px solid #B91C1C',
              fontWeight: 700,
              fontSize: '0.86rem',
            }}
          >
            {georefErrorMsg}
          </div>
        ) : null}

        {showCreateForm ? (
          <form
            onSubmit={handleCreateSubmit}
            style={{
              backgroundColor: T.colors.surfaceElevated,
              border: `2px solid ${T.colors.primaryGreen}`,
              borderRadius: 12,
              padding: 18,
              display: 'grid',
              gap: 14,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: T.colors.primaryGreen }}>
                Registrar Nueva Georreferencia en el Mapa
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: T.colors.textSecondary }}>
                Ingresa los datos de tu parcela para trazar automáticamente sus linderos cerrados y
                guardarlos en línea.
              </p>
            </div>

            {formError ? (
              <div
                role="alert"
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: T.colors.statusRedBg,
                  color: T.colors.statusRed,
                  fontWeight: 700,
                  fontSize: '0.84rem',
                }}
              >
                {formError}
              </div>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 12,
              }}
            >
              <div>
                <label
                  htmlFor="new-parcel-name"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Nombre de la parcela
                </label>
                <input
                  id="new-parcel-name"
                  type="text"
                  required
                  value={parcelName}
                  onChange={(e) => setParcelName(e.target.value)}
                  placeholder="Ej. Finca El Cedral"
                  className="field-input"
                />
              </div>

              <div>
                <label
                  htmlFor="new-producer-name"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Nombre del productor o responsable
                </label>
                <input
                  id="new-producer-name"
                  type="text"
                  required
                  value={producerName}
                  onChange={(e) => setProducerName(e.target.value)}
                  placeholder="Ej. Don Roberto López"
                  className="field-input"
                />
              </div>

              <div>
                <label
                  htmlFor="new-parcel-municipality"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Municipio (Tabasco)
                </label>
                <select
                  id="new-parcel-municipality"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="field-input"
                >
                  {TABASCO_MUNICIPALITIES.map((mun) => (
                    <option key={mun} value={mun}>
                      {mun}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="new-parcel-area"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Superficie aproximada (hectáreas)
                </label>
                <input
                  id="new-parcel-area"
                  type="number"
                  step="0.1"
                  min="0.25"
                  required
                  value={areaHectares}
                  onChange={(e) => setAreaHectares(e.target.value)}
                  className="field-input"
                />
              </div>

              <div>
                <label
                  htmlFor="new-parcel-shade"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Árboles de sombra sembrados
                </label>
                <input
                  id="new-parcel-shade"
                  type="number"
                  min="0"
                  required
                  value={shadeTreeCount}
                  onChange={(e) => setShadeTreeCount(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                ¿Cómo quieres marcar la parcela?
              </span>
              <button
                type="button"
                onClick={() => setCaptureMethod('MAPA_INTERACTIVO')}
                className="btn-control"
                style={{
                  backgroundColor:
                    captureMethod === 'MAPA_INTERACTIVO'
                      ? T.colors.primaryGreen
                      : T.colors.surfaceCard,
                  color: captureMethod === 'MAPA_INTERACTIVO' ? '#FFFFFF' : T.colors.textPrimary,
                }}
              >
                🗺️ Marcar con clics en el mapa (Satelital / Tráfico)
              </button>
              <button
                type="button"
                onClick={() => setCaptureMethod('CENTRO_GPS')}
                className="btn-control"
                style={{
                  backgroundColor:
                    captureMethod === 'CENTRO_GPS' ? T.colors.primaryGreen : T.colors.surfaceCard,
                  color: captureMethod === 'CENTRO_GPS' ? '#FFFFFF' : T.colors.textPrimary,
                }}
              >
                Por ubicación del centro + hectáreas
              </button>
              <button
                type="button"
                onClick={() => setCaptureMethod('ESQUINAS')}
                className="btn-control"
                style={{
                  backgroundColor:
                    captureMethod === 'ESQUINAS' ? T.colors.primaryGreen : T.colors.surfaceCard,
                  color: captureMethod === 'ESQUINAS' ? '#FFFFFF' : T.colors.textPrimary,
                }}
              >
                Escribir esquinas manualmente
              </button>
            </div>

            {captureMethod === 'MAPA_INTERACTIVO' ? (
              <InteractiveParcelMapPicker
                initialCenterLat={selectedParcel.coordinates?.[0]?.[1] ?? 18.2545}
                initialCenterLng={selectedParcel.coordinates?.[0]?.[0] ?? -93.2825}
                onPolygonChange={(coords, estHa) => {
                  setMapCoordinates(coords);
                  if (estHa > 0) {
                    setAreaHectares(String(estHa));
                  }
                }}
              />
            ) : captureMethod === 'CENTRO_GPS' ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      htmlFor="new-center-lat"
                      style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      Latitud del terreno (Norte)
                    </label>
                    <input
                      id="new-center-lat"
                      type="text"
                      value={centerLat}
                      onChange={(e) => setCenterLat(e.target.value)}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="new-center-lng"
                      style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      Longitud del terreno (Oeste)
                    </label>
                    <input
                      id="new-center-lng"
                      type="text"
                      value={centerLng}
                      onChange={(e) => setCenterLng(e.target.value)}
                      className="field-input"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-control"
                    onClick={handleUseBrowserGps}
                    style={{ fontSize: '0.82rem' }}
                  >
                    📍 Usar ubicación GPS actual de mi equipo
                  </button>
                  {gpsStatus ? (
                    <span style={{ fontSize: '0.8rem', color: T.colors.textSecondary }}>
                      {gpsStatus}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="new-custom-coords"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Esquinas del terreno (una por línea: longitud, latitud)
                </label>
                <textarea
                  id="new-custom-coords"
                  rows={4}
                  value={customCoordsText}
                  onChange={(e) => setCustomCoordsText(e.target.value)}
                  className="field-input"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-control"
                onClick={() => setShowCreateForm(false)}
                disabled={savingGeoref}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={savingGeoref}>
                {savingGeoref
                  ? 'Guardando georreferencia en mapa...'
                  : 'Guardar parcela georreferenciada'}
              </button>
            </div>
          </form>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 14,
          }}
        >
          {visibleParcels.map((p) => {
            const isSelected = p.parcelId === selectedParcel.parcelId;
            const friendly = getProducerFriendlyParcelStatus(p);
            const toneColors =
              friendly.forestStatusTone === 'verde'
                ? { bg: T.colors.statusGreenBg, fg: T.colors.statusGreen, border: '#15803D' }
                : friendly.forestStatusTone === 'revision'
                  ? { bg: T.colors.statusWarningBg, fg: T.colors.statusWarning, border: '#B45309' }
                  : { bg: T.colors.statusRedBg, fg: T.colors.statusRed, border: '#B91C1C' };

            return (
              <article
                key={p.parcelId}
                style={{
                  backgroundColor: isSelected ? T.colors.softGreenBg : T.colors.surfaceElevated,
                  border: `2px solid ${isSelected ? T.colors.primaryGreen : T.colors.borderSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectParcel(p.parcelId)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    <strong style={{ fontSize: '1rem', color: T.colors.textPrimary }}>
                      {p.parcelName || p.producerName}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        backgroundColor: toneColors.bg,
                        color: toneColors.fg,
                        border: `1px solid ${toneColors.border}`,
                      }}
                    >
                      {friendly.forestStatusLabel}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: T.colors.textSecondary }}>
                    Productor: <strong>{p.producerName}</strong> · {p.municipality} ·{' '}
                    <strong>{p.areaHectares} ha</strong>
                  </div>

                  <div
                    style={{
                      backgroundColor: T.colors.surfaceCard,
                      border: `1px solid ${T.colors.borderSubtle}`,
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: '0.82rem',
                      display: 'grid',
                      gap: 3,
                    }}
                  >
                    <div>
                      🌱 <strong>Cacaotal:</strong> {friendly.canopyHealthLabel}
                    </div>
                    <div>
                      🌳 <strong>Sombra:</strong> {p.shadeTreeCount} árboles registrados
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: friendly.papersAreClear ? T.colors.statusGreen : T.colors.statusRed,
                      }}
                    >
                      📄 {friendly.papersStatusLabel}
                    </div>
                  </div>
                </button>

                {friendly.needsPaperCheck ? (
                  <button
                    type="button"
                    className="btn-control"
                    onClick={() => onToggleCustf(p.parcelId)}
                    style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                  >
                    {p.hasVerifiedCustfPermit
                      ? 'Marcar constancia ambiental como pendiente'
                      : 'Confirmar constancia de limpieza en regla'}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <LiveGeoEnginePanel parcel={selectedParcel} />
    </div>
  );
}
