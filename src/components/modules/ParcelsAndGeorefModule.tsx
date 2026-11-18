'use client';

import React, { useEffect, useMemo, useState } from 'react';
import InteractiveParcelMapPicker from '@/components/InteractiveParcelMapPicker';
import LiveGeoEnginePanel from '@/components/LiveGeoEnginePanel';
import {
  buildHistoricalSnapshotsFallback,
  buildWaybackTileUrl,
  computeCacaoTrackTileGrid,
  deleteParcelAdminLive,
  fetchParcelDocumentsLive,
  fetchParcelHistoricalSnapshotsLive,
  getParcelDocumentDownloadUrl,
  preloadParcelHistoricalTiles,
  updateParcelMetadataAdminLive,
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
  onDeleteParcel?: (parcelId: string) => void;
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
  onDeleteParcel,
  onUpdateParcelSnapshots,
  onUpdateParcelDocuments,
  onToggleCustf,
  onCreateGeorefParcel,
  savingGeoref,
  georefStatusMsg,
  georefErrorMsg,
}: ParcelsAndGeorefModuleProps) {
  const isAdmin =
    operatorProfile?.role === 'ADMIN' ||
    operatorProfile?.role === 'admin_astra' ||
    operatorProfile?.role === 'superadmin';

  // Estados para Edición de Parcela (Admin)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editParcelName, setEditParcelName] = useState('');
  const [editProducerName, setEditProducerName] = useState('');
  const [editMunicipality, setEditMunicipality] = useState('Comalcalco');
  const [editAreaHectares, setEditAreaHectares] = useState<number>(1.0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Estados para Eliminación de Parcela (Admin)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveEditParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcel) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const updated = await updateParcelMetadataAdminLive({
        parcelId: selectedParcel.parcelId,
        parcelName: editParcelName.trim(),
        producerName: editProducerName.trim(),
        municipality: editMunicipality.trim(),
        areaHectares: editAreaHectares,
        accessToken: operatorProfile?.accessToken,
      });
      if (onParcelUpdated) {
        onParcelUpdated(updated);
      }
      setIsEditModalOpen(false);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Error al actualizar la parcela');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDeleteParcel = async () => {
    if (!selectedParcel) return;
    if (deleteConfirmText.trim().toLowerCase() !== 'eliminar') {
      setDeleteError('Por favor escribe la palabra "eliminar" para confirmar.');
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteParcelAdminLive(selectedParcel.parcelId, operatorProfile?.accessToken);
      if (onDeleteParcel) {
        onDeleteParcel(selectedParcel.parcelId);
      }
      onSelectParcel(null);
      setIsDeleteModalOpen(false);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar la parcela');
    } finally {
      setIsDeleting(false);
    }
  };

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [activeDetailSection, setActiveDetailSection] = useState<
    'general' | 'satellite' | 'documents'
  >('general');
  const [enableGeneralSharpen, setEnableGeneralSharpen] = useState<boolean>(true);
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

  useEffect(() => {
    setActiveDetailSection('general');
  }, [selectedParcel?.parcelId]);

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

  const userRole = (operatorProfile?.role || '').toLowerCase();
  const isAdminUser =
    userRole === 'admin' ||
    userRole === 'admin_astra' ||
    userRole === 'superadmin' ||
    userRole === 'auditor_sustentabilidad';
  const isAcopioUser = userRole === 'acopiador' || userRole === 'acopio';
  const isProducerUser = userRole === 'productor';

  const visibleParcels = parcels.filter((item) => {
    if (isAdminUser || (!isAcopioUser && !isProducerUser)) {
      return true;
    }
    if (isAcopioUser) {
      return item.municipality.toLowerCase() === 'comalcalco';
    }
    if (isProducerUser) {
      const profName = (operatorProfile?.fullName || '').toLowerCase().trim();
      const prodName = (item.producerName || '').toLowerCase().trim();
      return profName.length > 0
        ? prodName.includes(profName) || profName.includes(prodName)
        : true;
    }
    return true;
  });

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
                  disabled={savingGeoref}
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
                  disabled={savingGeoref}
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
                  disabled={savingGeoref}
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
                  disabled={savingGeoref}
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
                disabled={savingGeoref}
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
                disabled={savingGeoref}
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
                disabled={savingGeoref}
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
                      disabled={savingGeoref}
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
                      disabled={savingGeoref}
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
                    disabled={savingGeoref}
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
                  disabled={savingGeoref}
                  value={customCoordsText}
                  onChange={(e) => setCustomCoordsText(e.target.value)}
                  className="field-input"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}
                />
              </div>
            )}

            {savingGeoref ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  backgroundColor: T.colors.softGreenBg,
                  border: `1.5px solid ${T.colors.primaryGreen}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      border: `3px solid ${T.colors.borderSubtle}`,
                      borderTopColor: T.colors.primaryGreen,
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <strong
                      style={{
                        fontSize: '0.92rem',
                        color: T.colors.primaryGreen,
                        display: 'block',
                      }}
                    >
                      Guardando georreferencia en servidor...
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: T.colors.textSecondary }}>
                      Sincronizando coordenadas del polígono, consultando satélites y generando la
                      ficha histórica. Por favor espera un momento sin cerrar esta pantalla.
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 6,
                    backgroundColor: 'rgba(20, 69, 38, 0.15)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '60%',
                      height: '100%',
                      backgroundColor: T.colors.primaryGreen,
                      borderRadius: 3,
                      animation: 'pulse 1.2s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-control"
                onClick={() => setIsCreatingNew(false)}
                disabled={savingGeoref}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={savingGeoref}
                aria-busy={savingGeoref}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {savingGeoref ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    <span>Guardando georreferencia...</span>
                  </>
                ) : (
                  <span>Guardar nueva parcela</span>
                )}
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

    const coordinates =
      Array.isArray(selectedParcel.coordinates) && selectedParcel.coordinates.length >= 3
        ? selectedParcel.coordinates
        : [
            [-93.2845, 18.256],
            [-93.281, 18.256],
            [-93.281, 18.2525],
            [-93.2845, 18.2525],
            [-93.2845, 18.256],
          ];
    const vertexCount =
      coordinates.length > 1 &&
      coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
      coordinates[0][1] === coordinates[coordinates.length - 1][1]
        ? coordinates.length - 1
        : coordinates.length;

    const generalMapData = useMemo(
      () => computeCacaoTrackTileGrid(coordinates, 6, 5),
      [coordinates],
    );

    return (
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Cabecera Superior de Navegación de Parcela */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            backgroundColor: T.colors.surfaceCard,
            padding: '14px 20px',
            borderRadius: 12,
            border: `1.5px solid ${T.colors.borderSubtle}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              className="btn-control"
              onClick={() => onSelectParcel(null)}
              style={{ padding: '7px 14px', fontWeight: 700 }}
            >
              ← Volver al menú de parcelas
            </button>
            <div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: T.colors.earthCacao,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                DETALLE DE PARCELA · EUDR
              </span>
              <h2
                style={{
                  margin: '2px 0 0',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.4rem',
                  color: T.colors.primaryGreen,
                }}
              >
                {selectedParcel.parcelName || selectedParcel.producerName}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: toneColors.bg,
                color: toneColors.fg,
                border: `1px solid ${toneColors.border}`,
              }}
            >
              {friendly.forestStatusLabel}
            </span>

            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: '#ECFDF5',
                color: '#065F46',
                border: '1px solid #10B981',
              }}
            >
              ✓ Servidor Conectado
            </span>

            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditParcelName(selectedParcel.parcelName || '');
                    setEditProducerName(selectedParcel.producerName || '');
                    setEditMunicipality(selectedParcel.municipality || 'Comalcalco');
                    setEditAreaHectares(selectedParcel.areaHectares || 1.0);
                    setUpdateError(null);
                    setIsEditModalOpen(true);
                  }}
                  className="btn-control"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    borderColor: '#F59E0B',
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Editar Parcela
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmText('');
                    setDeleteError(null);
                    setIsDeleteModalOpen(true);
                  }}
                  className="btn-control"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    backgroundColor: '#FEE2E2',
                    color: '#B91C1C',
                    borderColor: '#EF4444',
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Borrar Parcela
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Mensajes de Estado o Error */}
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

        {/* Layout Principal: Barra Horizontal a la Izquierda + Panel de Contenido */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          {/* BARRA HORIZONTAL A LA IZQUIERDA: 3 SECCIONES */}
          <nav
            aria-label="Secciones de la parcela"
            style={{
              width: 250,
              minWidth: 220,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              backgroundColor: T.colors.surfaceCard,
              borderRadius: 14,
              border: `1.5px solid ${T.colors.borderSubtle}`,
              padding: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveDetailSection('general')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 10,
                border: 'none',
                borderLeft:
                  activeDetailSection === 'general'
                    ? `5px solid ${T.colors.primaryGreen}`
                    : '5px solid transparent',
                backgroundColor:
                  activeDetailSection === 'general' ? T.colors.softGreenBg : 'transparent',
                color:
                  activeDetailSection === 'general' ? T.colors.primaryGreen : T.colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>📋</span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.94rem' }}>Ficha General</strong>
                <span style={{ fontSize: '0.74rem', color: T.colors.textSecondary }}>
                  Estatus EUDR, métricas y ortofoto
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveDetailSection('satellite')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 10,
                border: 'none',
                borderLeft:
                  activeDetailSection === 'satellite'
                    ? `5px solid ${T.colors.primaryGreen}`
                    : '5px solid transparent',
                backgroundColor:
                  activeDetailSection === 'satellite' ? T.colors.softGreenBg : 'transparent',
                color:
                  activeDetailSection === 'satellite'
                    ? T.colors.primaryGreen
                    : T.colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>🛰️</span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.94rem' }}>Satélite</strong>
                <span style={{ fontSize: '0.74rem', color: T.colors.textSecondary }}>
                  Auditoría multitemporal 5 años
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveDetailSection('documents')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 10,
                border: 'none',
                borderLeft:
                  activeDetailSection === 'documents'
                    ? `5px solid ${T.colors.primaryGreen}`
                    : '5px solid transparent',
                backgroundColor:
                  activeDetailSection === 'documents' ? T.colors.softGreenBg : 'transparent',
                color:
                  activeDetailSection === 'documents'
                    ? T.colors.primaryGreen
                    : T.colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>📄</span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.94rem' }}>Documentación</strong>
                <span style={{ fontSize: '0.74rem', color: T.colors.textSecondary }}>
                  Expediente digital y diligencia
                </span>
              </div>
            </button>
          </nav>

          {/* CONTENIDO DE LA SECCIÓN ACTIVA */}
          <div style={{ flex: 1, minWidth: 300, display: 'grid', gap: 16 }}>
            {activeDetailSection === 'general' && (
              <>
                {/* 1. Tarjeta de Estatus de Conformidad EUDR */}
                <div
                  style={{
                    backgroundColor: T.colors.surfaceCard,
                    border: `1.5px solid ${T.colors.borderSubtle}`,
                    borderRadius: 14,
                    padding: '20px 22px',
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
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.15rem',
                        fontFamily: 'var(--font-serif)',
                        color: T.colors.primaryGreen,
                      }}
                    >
                      Estatus de Conformidad EUDR 2020
                    </h3>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 6,
                        backgroundColor: toneColors.bg,
                        color: toneColors.fg,
                        border: `1px solid ${toneColors.border}`,
                      }}
                    >
                      {friendly.forestStatusLabel}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.88rem',
                      color: T.colors.textSecondary,
                      lineHeight: 1.5,
                    }}
                  >
                    El cacaotal se encuentra georreferenciado bajo los lineamientos del Reglamento
                    UE 2023/1115 y la línea base de cobertura arbórea al 31 de diciembre de 2020.
                  </p>
                </div>

                {/* 2. Métricas Principales */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: T.colors.surfaceCard,
                      border: `1px solid ${T.colors.borderSubtle}`,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
                      Superficie Total
                    </div>
                    <strong
                      style={{
                        fontSize: '1.25rem',
                        color: T.colors.primaryGreen,
                        display: 'block',
                        margin: '2px 0',
                      }}
                    >
                      {selectedParcel.areaHectares.toFixed(2)} ha
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: T.colors.textSecondary }}>
                      {(selectedParcel.areaHectares * 10000).toLocaleString()} m²
                    </span>
                  </div>

                  <div
                    style={{
                      backgroundColor: T.colors.surfaceCard,
                      border: `1px solid ${T.colors.borderSubtle}`,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
                      Vértices GPS
                    </div>
                    <strong
                      style={{
                        fontSize: '1.25rem',
                        color: T.colors.primaryGreen,
                        display: 'block',
                        margin: '2px 0',
                      }}
                    >
                      {vertexCount}
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: T.colors.textSecondary }}>
                      Polígono cerrado WGS84
                    </span>
                  </div>

                  <div
                    style={{
                      backgroundColor: T.colors.surfaceCard,
                      border: `1px solid ${T.colors.borderSubtle}`,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
                      Municipio
                    </div>
                    <strong
                      style={{
                        fontSize: '1.25rem',
                        color: T.colors.primaryGreen,
                        display: 'block',
                        margin: '2px 0',
                      }}
                    >
                      {selectedParcel.municipality}
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: T.colors.textSecondary }}>
                      Tabasco, México
                    </span>
                  </div>

                  <div
                    style={{
                      backgroundColor: T.colors.surfaceCard,
                      border: `1px solid ${T.colors.borderSubtle}`,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
                      Topología RFC 7946
                    </div>
                    <strong
                      style={{
                        fontSize: '1.25rem',
                        color: '#10B981',
                        display: 'block',
                        margin: '2px 0',
                      }}
                    >
                      VÁLIDA
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: T.colors.textSecondary }}>
                      Sin auto-intersección
                    </span>
                  </div>
                </div>

                {/* 3. Foto Satelital al Registro y Delimitación */}
                <div
                  style={{
                    backgroundColor: T.colors.surfaceCard,
                    border: `1.5px solid ${T.colors.borderSubtle}`,
                    borderRadius: 14,
                    padding: '20px 22px',
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
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '1.15rem',
                          fontFamily: 'var(--font-serif)',
                          color: T.colors.primaryGreen,
                        }}
                      >
                        Foto Satelital al Registro
                      </h3>
                      <p
                        style={{
                          margin: '3px 0 0',
                          fontSize: '0.84rem',
                          color: T.colors.textSecondary,
                        }}
                      >
                        Polígono geodésico proyectado sobre la ortofoto satelital capturada al
                        momento del registro:
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                        EUDR 2020 · HD
                      </span>
                      <button
                        type="button"
                        onClick={() => setEnableGeneralSharpen(!enableGeneralSharpen)}
                        className="btn-control"
                        style={{
                          fontSize: '0.78rem',
                          padding: '4px 10px',
                          fontWeight: 700,
                          backgroundColor: enableGeneralSharpen ? '#ECFDF5' : '#FFFFFF',
                          borderColor: enableGeneralSharpen ? '#10B981' : T.colors.borderControl,
                          color: enableGeneralSharpen ? '#065F46' : T.colors.textPrimary,
                        }}
                      >
                        {enableGeneralSharpen ? '✓ Nitidez HD' : 'Nitidez HD'}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 400,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: '#0B1E13',
                      border: '1.5px solid #1E293B',
                    }}
                  >
                    <svg
                      viewBox={generalMapData.viewBoxStr}
                      preserveAspectRatio="xMidYMid slice"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        filter: enableGeneralSharpen
                          ? 'contrast(1.08) brightness(1.02) saturate(1.12)'
                          : 'none',
                      }}
                    >
                      <defs>
                        <filter id="general-hd-sharpen" x="0%" y="0%" width="100%" height="100%">
                          <feConvolveMatrix
                            order="3"
                            kernelMatrix="0 -0.28 0 -0.28 2.12 -0.28 0 -0.28 0"
                            preserveAlpha="true"
                          />
                        </filter>
                      </defs>

                      <g filter={enableGeneralSharpen ? 'url(#general-hd-sharpen)' : undefined}>
                        {generalMapData.tiles.map((t) => (
                          <image
                            key={`gen-tile-${generalMapData.zoom}-${t.x}-${t.y}`}
                            href={buildWaybackTileUrl('live', generalMapData.zoom, t.x, t.y)}
                            x={t.dx * 256}
                            y={t.dy * 256}
                            width={256.4}
                            height={256.4}
                            preserveAspectRatio="none"
                          />
                        ))}
                      </g>

                      {generalMapData.projectedPts.length >= 3 && (
                        <g>
                          <polygon
                            points={generalMapData.polygonPointsStr}
                            fill="rgba(16, 185, 129, 0.22)"
                            stroke="#020617"
                            strokeOpacity={0.65}
                            strokeWidth={generalMapData.strokeHalo}
                            strokeLinejoin="round"
                          />
                          <polygon
                            points={generalMapData.polygonPointsStr}
                            fill="none"
                            stroke="#10B981"
                            strokeOpacity={0.95}
                            strokeWidth={generalMapData.strokeMain}
                            strokeDasharray={generalMapData.dashPattern}
                            strokeLinejoin="round"
                          />
                          {generalMapData.projectedPts.map((pt, idx) => (
                            <circle
                              key={`gen-vtx-${idx}`}
                              cx={pt.px}
                              cy={pt.py}
                              r={generalMapData.vertexRadius}
                              fill="#34D399"
                              stroke="#064E3B"
                              strokeWidth={1.5}
                            />
                          ))}
                        </g>
                      )}
                    </svg>

                    <div
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        left: 12,
                        right: 12,
                        backgroundColor: 'rgba(15, 23, 42, 0.88)',
                        backdropFilter: 'blur(4px)',
                        padding: '6px 14px',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#F8FAFC',
                        fontSize: '0.78rem',
                      }}
                    >
                      <span>
                        🌱 Superficie: <strong>{selectedParcel.areaHectares.toFixed(2)} ha</strong>{' '}
                        · {vertexCount} vértices WGS84
                      </span>
                      <span>🛰️ Ortofoto Satelital de Alta Resolución</span>
                    </div>
                  </div>
                </div>

                {/* 4. Datos del Productor y Registro */}
                <div
                  style={{
                    backgroundColor: T.colors.surfaceCard,
                    border: `1.5px solid ${T.colors.borderSubtle}`,
                    borderRadius: 14,
                    padding: '20px 22px',
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1.15rem',
                      fontFamily: 'var(--font-serif)',
                      color: T.colors.primaryGreen,
                    }}
                  >
                    Datos del Productor Asociado y Registro
                  </h3>

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
                        Folio de Registro
                      </div>
                      <strong
                        style={{
                          fontSize: '0.88rem',
                          fontFamily: 'var(--font-mono)',
                          color: T.colors.primaryGreen,
                        }}
                      >
                        {selectedParcel.parcelId}
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
                          color: friendly.papersAreClear
                            ? T.colors.statusGreen
                            : T.colors.statusRed,
                        }}
                      >
                        {friendly.papersStatusLabel}
                      </strong>
                    </div>
                  </div>

                  {friendly.needsPaperCheck ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
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
                </div>
              </>
            )}

            {activeDetailSection === 'satellite' && (
              <LiveGeoEnginePanel
                parcel={selectedParcel}
                operatorProfile={operatorProfile}
                onParcelUpdated={onParcelUpdated}
              />
            )}

            {activeDetailSection === 'documents' && (
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
                    📁 Expediente Digital de la Parcela ({parcelDocs.length})
                  </h2>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '0.86rem',
                      color: T.colors.textSecondary,
                    }}
                  >
                    Adjunta aquí tu certificado parcelario, título de propiedad o constancia de
                    limpieza en PDF o fotografía para mantener completo el expediente de esta
                    parcela.
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
                      <option value="CERTIFICADO_PARCELARIO">
                        Certificado parcelario / ejidal
                      </option>
                      <option value="TITULO_PROPIEDAD">Título de propiedad o escritura</option>
                      <option value="CUSTF_SEMARNAT">
                        Constancia ambiental / permiso de limpieza
                      </option>
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
                          {doc.sha256_hash && (
                            <span
                              style={{
                                fontSize: '0.74rem',
                                color: T.colors.textSecondary,
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              SHA-256: {doc.sha256_hash.slice(0, 28)}...
                            </span>
                          )}
                        </div>

                        {doc.download_url ? (
                          <a
                            href={getParcelDocumentDownloadUrl(selectedParcel.parcelId, doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-control"
                            style={{
                              textDecoration: 'none',
                              fontSize: '0.78rem',
                              padding: '5px 11px',
                            }}
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

                {/* Declaración de Diligencia Debida (DDS EUDR) */}
                <div
                  style={{
                    backgroundColor: T.colors.surfaceElevated,
                    border: `1px solid ${T.colors.borderSubtle}`,
                    borderRadius: 10,
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.5rem' }}>🇪🇺</span>
                    <div>
                      <strong style={{ fontSize: '0.92rem', color: T.colors.primaryGreen }}>
                        Declaración de Diligencia Debida (DDS EUDR)
                      </strong>
                      <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
                        TRACES-NT Ready · Sello digital geoespacial emitido por el Geo-Engine
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                          color: T.colors.textSecondary,
                        }}
                      >
                        SHA-256: 4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 6,
                      backgroundColor: '#ECFDF5',
                      color: '#065F46',
                      border: '1px solid #10B981',
                    }}
                  >
                    ✓ Emitido
                  </span>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Modal de Edición de Parcela (Admin) */}
        {isEditModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-parcel-modal-title"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <div
              style={{
                backgroundColor: T.colors.surfaceCard,
                borderRadius: 14,
                border: `1.5px solid ${T.colors.borderSubtle}`,
                padding: '24px 28px',
                maxWidth: 480,
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              }}
            >
              <h3
                id="edit-parcel-modal-title"
                style={{
                  margin: '0 0 16px',
                  fontSize: '1.2rem',
                  fontFamily: 'var(--font-serif)',
                  color: T.colors.primaryGreen,
                }}
              >
                ✏️ Editar Parcela y Productor
              </h3>

              <form onSubmit={handleSaveEditParcel} style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label
                    htmlFor="edit-parcel-name"
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Nombre de la Parcela:
                  </label>
                  <input
                    id="edit-parcel-name"
                    type="text"
                    value={editParcelName}
                    onChange={(e) => setEditParcelName(e.target.value)}
                    required
                    className="field-input"
                    style={{ width: '100%' }}
                    placeholder="Ej. Finca La Chontalpa Lote 1"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-producer-name"
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Nombre del Productor:
                  </label>
                  <input
                    id="edit-producer-name"
                    type="text"
                    value={editProducerName}
                    onChange={(e) => setEditProducerName(e.target.value)}
                    required
                    className="field-input"
                    style={{ width: '100%' }}
                    placeholder="Ej. Mateo Chablé Méndez"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label
                      htmlFor="edit-municipality"
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      Municipio:
                    </label>
                    <select
                      id="edit-municipality"
                      value={editMunicipality}
                      onChange={(e) => setEditMunicipality(e.target.value)}
                      className="field-input"
                      style={{ width: '100%' }}
                    >
                      {TABASCO_MUNICIPALITIES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-area"
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      Superficie (ha):
                    </label>
                    <input
                      id="edit-area"
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={editAreaHectares}
                      onChange={(e) => setEditAreaHectares(parseFloat(e.target.value) || 0)}
                      className="field-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {updateError && (
                  <div
                    role="alert"
                    style={{ color: '#B91C1C', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    ⚠️ {updateError}
                  </div>
                )}

                <div
                  style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}
                >
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="btn-control"
                    disabled={isUpdating}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating || !editParcelName.trim() || !editProducerName.trim()}
                    className="btn-control"
                    style={{
                      backgroundColor: T.colors.primaryGreen,
                      color: '#FFFFFF',
                      borderColor: T.colors.primaryGreen,
                      fontWeight: 700,
                    }}
                  >
                    {isUpdating ? 'Guardando...' : '💾 Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Eliminación de Parcela (Admin) */}
        {isDeleteModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-parcel-modal-title"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <div
              style={{
                backgroundColor: T.colors.surfaceCard,
                borderRadius: 14,
                border: '1.5px solid #EF4444',
                padding: '24px 28px',
                maxWidth: 480,
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              }}
            >
              <h3
                id="delete-parcel-modal-title"
                style={{
                  margin: '0 0 12px',
                  fontSize: '1.2rem',
                  fontFamily: 'var(--font-serif)',
                  color: '#B91C1C',
                }}
              >
                🗑️ Confirmar Eliminación de Parcela
              </h3>

              <p
                style={{
                  fontSize: '0.86rem',
                  color: T.colors.textPrimary,
                  lineHeight: 1.5,
                  margin: '0 0 14px',
                }}
              >
                ¿Estás seguro de que deseas eliminar permanentemente la parcela{' '}
                <strong>{selectedParcel.parcelName || selectedParcel.producerName}</strong> (Folio:{' '}
                <code>{selectedParcel.parcelId}</code>)?
              </p>

              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: '0.8rem',
                  color: '#991B1B',
                }}
              >
                ⚠️ <strong>Aviso Importante:</strong> Esta acción eliminará el polígono geodésico y
                sus registros de Supabase PostGIS y del Geo-Engine. Al sincronizar la app móvil,
                esta parcela será removida automáticamente del dispositivo.
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="delete-confirm-input"
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  Para confirmar, escribe <code>eliminar</code> abajo:
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="field-input"
                  placeholder="eliminar"
                  style={{ width: '100%' }}
                  autoComplete="off"
                />
              </div>

              {deleteError && (
                <div
                  role="alert"
                  style={{
                    color: '#B91C1C',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  ⚠️ {deleteError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="btn-control"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteParcel}
                  disabled={isDeleting || deleteConfirmText.trim().toLowerCase() !== 'eliminar'}
                  className="btn-control"
                  style={{
                    backgroundColor:
                      deleteConfirmText.trim().toLowerCase() === 'eliminar' ? '#DC2626' : '#FCA5A5',
                    color: '#FFFFFF',
                    borderColor: '#DC2626',
                    fontWeight: 700,
                    cursor:
                      deleteConfirmText.trim().toLowerCase() === 'eliminar'
                        ? 'pointer'
                        : 'not-allowed',
                  }}
                >
                  {isDeleting ? 'Eliminando...' : '🗑️ Eliminar Definitivamente'}
                </button>
              </div>
            </div>
          </div>
        )}
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
            Menú de Parcelas Registradas ({visibleParcels.length})
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: T.colors.textSecondary }}>
            Haz clic sobre cualquier parcela para entrar a su ficha completa y ver sus fotografías
            satelitales históricas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: 8,
              backgroundColor: isAdminUser ? '#ECFDF5' : isAcopioUser ? '#FEF3C7' : '#F3E8FF',
              color: isAdminUser ? '#065F46' : isAcopioUser ? '#92400E' : '#6B21A8',
              border: `1px solid ${isAdminUser ? '#10B981' : isAcopioUser ? '#F59E0B' : '#A855F7'}`,
            }}
          >
            {isAdminUser
              ? '🛡️ Visualización Global · Todas las Parcelas de Tabasco'
              : isAcopioUser
                ? '📦 Parcelas del Centro de Acopio · Comalcalco'
                : '🌾 Mis Parcelas Registradas · Productor'}
          </span>

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
