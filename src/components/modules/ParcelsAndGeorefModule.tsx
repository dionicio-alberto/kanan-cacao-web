'use client';

import React, { useEffect, useState } from 'react';
import InteractiveParcelMapPicker from '@/components/InteractiveParcelMapPicker';
import LiveGeoEnginePanel from '@/components/LiveGeoEnginePanel';
import {
  buildHistoricalSnapshotsFallback,
  fetchParcelDocumentsLive,
  fetchParcelHistoricalSnapshotsLive,
  getParcelDocumentDownloadUrl,
  preloadParcelHistoricalTiles,
  uploadParcelDocumentLive,
} from '@/services/geoEngineLiveClient';
import {
  buildClosedPolygonFromCenter,
  formatDisplayDateEs,
  getProducerFriendlyParcelStatus,
  parseCoordinatePairsText,
} from '@/services/producerLogbookService';
import {
  HistoricalParcelSnapshot,
  ParcelAdminOverview,
  ParcelLegalDocument,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

export interface CreateGeorefParcelPayload {
  parcelName: string;
  producerName: string;
  municipality: string;
  areaHectares: number;
  coordinates: number[][];
}

interface ParcelsAndGeorefModuleProps {
  parcels: ParcelAdminOverview[];
  selectedParcel: ParcelAdminOverview | null;
  operatorProfile?: { fullName: string; role: string; accessToken?: string } | null;
  onSelectParcel: (parcelId: string | null) => void;
  onParcelUpdated?: (parcel: ParcelAdminOverview) => void;
  onUpdateParcelSnapshots?: (parcelId: string, snapshots: HistoricalParcelSnapshot[]) => void;
  onUpdateParcelDocuments?: (parcelId: string, documents: ParcelLegalDocument[]) => void;
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
  operatorProfile,
  onSelectParcel,
  onParcelUpdated,
  onUpdateParcelSnapshots,
  onUpdateParcelDocuments,
  onToggleCustf,
  onCreateGeorefParcel,
  savingGeoref,
  georefStatusMsg,
  georefErrorMsg,
}: ParcelsAndGeorefModuleProps) {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [municipalityFilter, setMunicipalityFilter] = useState('TODAS');
  const [preloadingParcelId, setPreloadingParcelId] = useState<string | null>(null);
  const [preloadDoneCount, setPreloadDoneCount] = useState<number>(0);
  const [preloadTotalCount, setPreloadTotalCount] = useState<number>(7);
  const [parcelDocs, setParcelDocs] = useState<ParcelLegalDocument[]>(
    selectedParcel?.documents ?? [],
  );
  const [docTypeToUpload, setDocTypeToUpload] = useState<
    'CERTIFICADO_PARCELARIO' | 'TITULO_PROPIEDAD' | 'CUSTF_SEMARNAT'
  >('CERTIFICADO_PARCELARIO');
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const [docStatusMsg, setDocStatusMsg] = useState<string | null>(null);
  const [docErrorMsg, setDocErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDocStatusMsg(null);
    setDocErrorMsg(null);
    setSelectedDocFile(null);
    if (!selectedParcel) {
      setParcelDocs([]);
      return;
    }
    setParcelDocs(selectedParcel.documents ?? []);
    let active = true;
    fetchParcelDocumentsLive(selectedParcel.parcelId)
      .then((docs) => {
        if (active) {
          setParcelDocs(docs);
        }
      })
      .catch(() => {
        // Conserva documentos ya cargados si el servidor remoto no responde.
      });
    return () => {
      active = false;
    };
  }, [selectedParcel?.parcelId, selectedParcel]);

  const handleUploadDocumentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedParcel) {
      return;
    }
    setDocStatusMsg(null);
    setDocErrorMsg(null);
    if (!selectedDocFile) {
      setDocErrorMsg('Selecciona un archivo PDF o fotografía del documento antes de subir.');
      return;
    }
    setUploadingDoc(true);
    try {
      const created = await uploadParcelDocumentLive(
        selectedParcel.parcelId,
        docTypeToUpload,
        selectedDocFile,
      );
      const nextDocs = [created, ...parcelDocs.filter((d) => d.id !== created.id)];
      setParcelDocs(nextDocs);
      setSelectedDocFile(null);
      if (onUpdateParcelDocuments) {
        onUpdateParcelDocuments(selectedParcel.parcelId, nextDocs);
      }
      setDocStatusMsg(`Documento "${created.file_name}" guardado en el expediente del servidor.`);
    } catch (err) {
      setDocErrorMsg(err instanceof Error ? err.message : 'No se pudo adjuntar el documento.');
    } finally {
      setUploadingDoc(false);
    }
  };
  const [captureMethod, setCaptureMethod] = useState<
    'MAPA_INTERACTIVO' | 'CENTRO_GPS' | 'ESQUINAS'
  >('MAPA_INTERACTIVO');

  const [parcelName, setParcelName] = useState('');
  const [producerName, setProducerName] = useState('');
  const [municipality, setMunicipality] = useState<string>('Comalcalco');
  const [areaHectares, setAreaHectares] = useState('0.00');
  const [centerLat, setCenterLat] = useState('18.2485');
  const [centerLng, setCenterLng] = useState('-93.2615');
  const [mapCoordinates, setMapCoordinates] = useState<number[][]>([]);
  const [customCoordsText, setCustomCoordsText] = useState(
    '-93.263, 18.250\n-93.259, 18.250\n-93.259, 18.247\n-93.263, 18.247',
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const visibleParcels = parcels.filter((item) =>
    municipalityFilter === 'TODAS' ? true : item.municipality === municipalityFilter,
  );

  const handleSelectAndPreloadParcel = async (parcelItem: ParcelAdminOverview) => {
    if (preloadingParcelId) {
      return;
    }

    setPreloadingParcelId(parcelItem.parcelId);
    setPreloadDoneCount(0);
    setPreloadTotalCount(7);

    const coords =
      Array.isArray(parcelItem.coordinates) && parcelItem.coordinates.length >= 3
        ? parcelItem.coordinates
        : [
            [-93.2845, 18.256],
            [-93.281, 18.256],
            [-93.281, 18.2525],
            [-93.2845, 18.2525],
            [-93.2845, 18.256],
          ];

    let snaps: HistoricalParcelSnapshot[] = [];
    const hasRealSnaps =
      Array.isArray(parcelItem.historicalSnapshots) &&
      parcelItem.historicalSnapshots.length === 7 &&
      parcelItem.historicalSnapshots.every((item) => item.capture_source === 'real_src_date');

    if (hasRealSnaps && parcelItem.historicalSnapshots) {
      snaps = parcelItem.historicalSnapshots;
    } else {
      try {
        const res = await fetchParcelHistoricalSnapshotsLive(parcelItem.parcelId);
        if (Array.isArray(res.snapshots) && res.snapshots.length === 7) {
          snaps = res.snapshots;
          if (onUpdateParcelSnapshots) {
            onUpdateParcelSnapshots(parcelItem.parcelId, snaps);
          }
        }
      } catch {
        snaps = buildHistoricalSnapshotsFallback(parcelItem.parcelId, coords);
      }
    }

    if (snaps.length === 0) {
      snaps = buildHistoricalSnapshotsFallback(parcelItem.parcelId, coords);
    }

    setPreloadTotalCount(snaps.length);
    await preloadParcelHistoricalTiles(coords, snaps, (done, total) => {
      setPreloadDoneCount(done);
      setPreloadTotalCount(total);
    });

    setPreloadingParcelId(null);
    onSelectParcel(parcelItem.parcelId);
  };

  const handleUseBrowserGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus(
        'Tu navegador no permite leer ubicación GPS directa; captura las coordenadas abajo.',
      );
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
          'No se pudo obtener el permiso de ubicación. Puedes escribir la latitud y longitud manualmente.',
        );
      },
    );
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!parcelName.trim() || !producerName.trim()) {
      setFormError('Escribe el nombre de la parcela y del productor.');
      return;
    }

    const rawArea = Number(areaHectares);
    const parsedArea = Number((Number.isFinite(rawArea) ? rawArea : 0).toFixed(2));
    if (parsedArea <= 0) {
      setFormError('Selecciona las esquinas en el mapa o ingresa una superficie mayor a 0.00 ha.');
      return;
    }

    let coordinates: number[][];
    try {
      if (captureMethod === 'MAPA_INTERACTIVO') {
        if (mapCoordinates.length < 3) {
          setFormError(
            'Marca al menos 3 esquinas dando clic sobre el mapa interactivo antes de guardar.',
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
      coordinates,
    });
    setParcelName('');
    setProducerName('');
    setMapCoordinates([]);
    setAreaHectares('0.00');
    setIsCreatingNew(false);
  };

  // VISTA 1: PÁGINA DEDICADA PARA AGREGAR UNA NUEVA PARCELA
  if (isCreatingNew) {
    return (
      <div style={{ display: 'grid', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <button type="button" className="btn-control" onClick={() => setIsCreatingNew(false)}>
            ← Volver a parcelas
          </button>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textSecondary }}>
            Registro único en servidor
          </span>
        </div>

        <section
          aria-labelledby="new-parcel-page-title"
          style={{
            backgroundColor: T.colors.surfaceCard,
            border: `2px solid ${T.colors.primaryGreen}`,
            borderRadius: 14,
            padding: '24px 22px',
            display: 'grid',
            gap: 16,
          }}
        >
          <div>
            <h1
              id="new-parcel-page-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.55rem',
                color: T.colors.primaryGreen,
              }}
            >
              Agregar Nueva Parcela y Georreferencia
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: T.colors.textSecondary }}>
              Marca tu parcela directamente en el mapa interactivo dando clic en cada esquina. Las
              hectáreas se calculan automáticamente con 2 decimales y el mapa se guarda una sola vez
              en el servidor.
            </p>
          </div>

          {formError ? (
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
              {formError}
            </div>
          ) : null}

          <form onSubmit={handleCreateSubmit} style={{ display: 'grid', gap: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
                  Superficie calculada (hectáreas, 2 decimales)
                </label>
                <input
                  id="new-parcel-area"
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  readOnly={captureMethod === 'MAPA_INTERACTIVO'}
                  value={areaHectares}
                  onChange={(e) => setAreaHectares(e.target.value)}
                  onBlur={() => {
                    const num = Number(areaHectares);
                    if (Number.isFinite(num) && num > 0) {
                      setAreaHectares(num.toFixed(2));
                    }
                  }}
                  className="field-input"
                  style={{
                    backgroundColor:
                      captureMethod === 'MAPA_INTERACTIVO' ? T.colors.softGreenBg : '#FFFFFF',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Método de marcado:</span>
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
                🗺️ Seleccionar en mapa interactivo (Satelital / Calles)
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
                initialCenterLat={selectedParcel?.coordinates?.[0]?.[1] ?? 18.2545}
                initialCenterLng={selectedParcel?.coordinates?.[0]?.[0] ?? -93.2825}
                onPolygonChange={(coords, estHa) => {
                  setMapCoordinates(coords);
                  setAreaHectares(estHa > 0 ? estHa.toFixed(2) : '0.00');
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
                      Latitud del terreno
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
                      Longitud del terreno
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
                onClick={() => setIsCreatingNew(false)}
                disabled={savingGeoref}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={savingGeoref}>
                {savingGeoref
                  ? 'Guardando georreferencia y fotos en servidor...'
                  : 'Guardar nueva parcela'}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  // VISTA 2: PÁGINA DE DETALLE DE LA PARCELA SELECCIONADA (CUANDO HAY PARCELA ACTIVA)
  if (selectedParcel) {
    const friendly = getProducerFriendlyParcelStatus(selectedParcel);
    const toneColors =
      friendly.forestStatusTone === 'verde'
        ? { bg: T.colors.statusGreenBg, fg: T.colors.statusGreen, border: '#15803D' }
        : friendly.forestStatusTone === 'revision'
          ? { bg: T.colors.statusWarningBg, fg: T.colors.statusWarning, border: '#B45309' }
          : { bg: T.colors.statusRedBg, fg: T.colors.statusRed, border: '#B91C1C' };

    return (
      <div style={{ display: 'grid', gap: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <button type="button" className="btn-control" onClick={() => onSelectParcel(null)}>
            ← Ver menú de todas las parcelas
          </button>
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

        <section
          aria-labelledby="parcel-detail-title"
          style={{
            backgroundColor: T.colors.surfaceCard,
            border: `1.5px solid ${T.colors.borderSubtle}`,
            borderRadius: 14,
            padding: '22px 22px',
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
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: T.colors.earthCacao,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                INFORMACIÓN GENERAL DE LA PARCELA
              </span>
              <h1
                id="parcel-detail-title"
                style={{
                  margin: '4px 0 0',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.6rem',
                  color: T.colors.primaryGreen,
                }}
              >
                {selectedParcel.parcelName || selectedParcel.producerName}
              </h1>
            </div>

            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: 8,
                backgroundColor: toneColors.bg,
                color: toneColors.fg,
                border: `1.5px solid ${toneColors.border}`,
              }}
            >
              {friendly.forestStatusLabel}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 12,
            }}
          >
            <div
              style={{
                backgroundColor: T.colors.surfaceElevated,
                border: `1px solid ${T.colors.borderSubtle}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontSize: '0.76rem', color: T.colors.textSecondary }}>
                Productor responsable
              </div>
              <strong style={{ fontSize: '0.96rem' }}>{selectedParcel.producerName}</strong>
            </div>

            <div
              style={{
                backgroundColor: T.colors.surfaceElevated,
                border: `1px solid ${T.colors.borderSubtle}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontSize: '0.76rem', color: T.colors.textSecondary }}>
                Municipio y superficie
              </div>
              <strong style={{ fontSize: '0.96rem' }}>
                {selectedParcel.municipality} · {selectedParcel.areaHectares.toFixed(2)} hectáreas
              </strong>
            </div>

            <div
              style={{
                backgroundColor: T.colors.surfaceElevated,
                border: `1px solid ${T.colors.borderSubtle}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontSize: '0.76rem', color: T.colors.textSecondary }}>
                Salud del cacaotal
              </div>
              <strong style={{ fontSize: '0.96rem', color: T.colors.primaryGreen }}>
                {friendly.canopyHealthLabel}
              </strong>
            </div>

            <div
              style={{
                backgroundColor: T.colors.surfaceElevated,
                border: `1px solid ${T.colors.borderSubtle}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontSize: '0.76rem', color: T.colors.textSecondary }}>
                Papeles y constancia
              </div>
              <strong
                style={{
                  fontSize: '0.94rem',
                  color: friendly.papersAreClear ? T.colors.statusGreen : T.colors.statusRed,
                }}
              >
                {friendly.papersStatusLabel}
              </strong>
            </div>
          </div>

          {friendly.needsPaperCheck ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-control"
                onClick={() => onToggleCustf(selectedParcel.parcelId)}
                style={{ fontSize: '0.82rem', padding: '7px 12px' }}
              >
                {selectedParcel.hasVerifiedCustfPermit
                  ? 'Marcar constancia ambiental como pendiente'
                  : 'Confirmar constancia de limpieza en regla'}
              </button>
            </div>
          ) : null}
        </section>

        <section
          aria-labelledby="parcel-docs-title"
          style={{
            backgroundColor: T.colors.surfaceCard,
            border: `1.5px solid ${T.colors.borderSubtle}`,
            borderRadius: 14,
            padding: '20px 22px',
            display: 'grid',
            gap: 14,
          }}
        >
          <div>
            <h2
              id="parcel-docs-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.3rem',
                color: T.colors.primaryGreen,
              }}
            >
              📁 Documentación Legal de esta Parcela ({parcelDocs.length})
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: T.colors.textSecondary }}>
              Adjunta aquí tu certificado parcelario, título de propiedad o constancia de limpieza
              en PDF o fotografía para mantener completo el expediente de esta parcela.
            </p>
          </div>

          <form
            onSubmit={handleUploadDocumentSubmit}
            style={{
              backgroundColor: T.colors.surfaceElevated,
              border: `1px solid ${T.colors.borderSubtle}`,
              borderRadius: 10,
              padding: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 10,
              alignItems: 'end',
            }}
          >
            <div>
              <label
                htmlFor="parcel-doc-type"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700 }}
              >
                Tipo de documento
              </label>
              <select
                id="parcel-doc-type"
                value={docTypeToUpload}
                onChange={(e) =>
                  setDocTypeToUpload(
                    e.target.value as
                      'CERTIFICADO_PARCELARIO' | 'TITULO_PROPIEDAD' | 'CUSTF_SEMARNAT',
                  )
                }
                className="field-input"
              >
                <option value="CERTIFICADO_PARCELARIO">Certificado parcelario / ejidal</option>
                <option value="TITULO_PROPIEDAD">Título de propiedad o escritura</option>
                <option value="CUSTF_SEMARNAT">Constancia ambiental / permiso de limpieza</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="parcel-doc-file"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700 }}
              >
                Archivo (PDF, JPG, PNG o WEBP)
              </label>
              <input
                id="parcel-doc-file"
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setSelectedDocFile(e.target.files?.[0] ?? null)}
                className="field-input"
                style={{ padding: '6px 8px' }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={uploadingDoc}
              style={{ height: 40 }}
            >
              {uploadingDoc ? 'Subiendo al servidor...' : '📤 Subir documento al expediente'}
            </button>
          </form>

          {docStatusMsg ? (
            <div
              role="status"
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                backgroundColor: T.colors.statusGreenBg,
                color: T.colors.statusGreen,
                border: '1px solid #15803D',
                fontWeight: 700,
                fontSize: '0.84rem',
              }}
            >
              {docStatusMsg}
            </div>
          ) : null}

          {docErrorMsg ? (
            <div
              role="alert"
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                backgroundColor: T.colors.statusRedBg,
                color: T.colors.statusRed,
                border: '1px solid #B91C1C',
                fontWeight: 700,
                fontSize: '0.84rem',
              }}
            >
              {docErrorMsg}
            </div>
          ) : null}

          {parcelDocs.length === 0 ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                backgroundColor: T.colors.backgroundPrimary,
                border: `1px dashed ${T.colors.borderControl}`,
                fontSize: '0.85rem',
                color: T.colors.textSecondary,
              }}
            >
              Aún no hay archivos adjuntos en el expediente digital de esta parcela.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {parcelDocs.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    backgroundColor: T.colors.backgroundPrimary,
                    border: `1px solid ${T.colors.borderSubtle}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'grid', gap: 2 }}>
                    <strong style={{ fontSize: '0.9rem', color: T.colors.primaryGreen }}>
                      {doc.document_label}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
                      Archivo: <strong>{doc.file_name}</strong> ·{' '}
                      {doc.verified_by_admin ? '✓ En regla' : 'Registrado'}
                      {doc.uploaded_at ? ` · ${formatDisplayDateEs(doc.uploaded_at)}` : ''}
                    </span>
                  </div>

                  {doc.download_url ? (
                    <a
                      href={getParcelDocumentDownloadUrl(selectedParcel.parcelId, doc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-control"
                      style={{ textDecoration: 'none', fontSize: '0.78rem', padding: '5px 11px' }}
                    >
                      📄 Ver / Descargar
                    </a>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        backgroundColor: T.colors.softGreenBg,
                        color: T.colors.primaryGreen,
                      }}
                    >
                      Folio verificado
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <LiveGeoEnginePanel
          parcel={selectedParcel}
          operatorProfile={operatorProfile}
          onParcelUpdated={onParcelUpdated}
        />
      </div>
    );
  }

  // VISTA 3: MENÚ DE TODAS LAS PARCELAS (CUANDO NO HAY UNA PARCELA SELECCIONADA)
  return (
    <section
      aria-labelledby="parcels-menu-title"
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
            id="parcels-menu-title"
            style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: '1.5rem',
              color: T.colors.primaryGreen,
            }}
          >
            Menú de Parcelas Registradas ({parcels.length})
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: T.colors.textSecondary }}>
            Haz clic sobre cualquier parcela para entrar a su ficha completa y ver sus fotografías
            satelitales históricas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            aria-label="Filtrar menú por municipio"
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

          <button type="button" className="btn-primary" onClick={() => setIsCreatingNew(true)}>
            ➕ Agregar nueva parcela
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: 14,
        }}
      >
        {visibleParcels.map((p) => {
          const friendly = getProducerFriendlyParcelStatus(p);
          const isLoadingThisParcel = preloadingParcelId === p.parcelId;
          const progressPct = Math.round((preloadDoneCount / Math.max(preloadTotalCount, 1)) * 100);
          const toneColors =
            friendly.forestStatusTone === 'verde'
              ? { bg: T.colors.statusGreenBg, fg: T.colors.statusGreen, border: '#15803D' }
              : friendly.forestStatusTone === 'revision'
                ? { bg: T.colors.statusWarningBg, fg: T.colors.statusWarning, border: '#B45309' }
                : { bg: T.colors.statusRedBg, fg: T.colors.statusRed, border: '#B91C1C' };

          return (
            <button
              key={p.parcelId}
              type="button"
              disabled={Boolean(preloadingParcelId)}
              aria-busy={isLoadingThisParcel}
              onClick={() => void handleSelectAndPreloadParcel(p)}
              style={{
                textAlign: 'left',
                cursor: preloadingParcelId ? 'wait' : 'pointer',
                backgroundColor: isLoadingThisParcel
                  ? T.colors.softGreenBg
                  : T.colors.surfaceElevated,
                border: `2px solid ${
                  isLoadingThisParcel ? T.colors.primaryGreen : T.colors.borderSubtle
                }`,
                borderRadius: 12,
                padding: 16,
                display: 'grid',
                gap: 10,
                opacity: preloadingParcelId && !isLoadingThisParcel ? 0.65 : 1,
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
                <strong style={{ fontSize: '1.04rem', color: T.colors.primaryGreen }}>
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
                <strong>{p.areaHectares.toFixed(2)} ha</strong>
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
                <div
                  style={{
                    fontWeight: 700,
                    color: friendly.papersAreClear ? T.colors.statusGreen : T.colors.statusRed,
                  }}
                >
                  📄 {friendly.papersStatusLabel} · {p.documents?.length ?? 0} archivo(s)
                </div>
              </div>

              {isLoadingThisParcel ? (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1.5px solid ${T.colors.primaryGreen}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div
                    style={{ fontSize: '0.82rem', fontWeight: 800, color: T.colors.primaryGreen }}
                  >
                    🛰️ Descargando fotografías satelitales ({preloadDoneCount} / {preloadTotalCount}
                    )...
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 8,
                      backgroundColor: T.colors.backgroundSecondary,
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(10, progressPct)}%`,
                        height: '100%',
                        backgroundColor: T.colors.primaryGreen,
                        transition: 'width 150ms ease',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <span
                  style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.primaryGreen }}
                >
                  Abrir página de esta parcela →
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
