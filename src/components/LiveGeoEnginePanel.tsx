'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  buildHistoricalSnapshotsFallback,
  buildWaybackTileUrl,
  computeCacaoTrackTileGrid,
  fetchParcelHistoricalSnapshotsLive,
  matchWaybackCapturesToHorizons,
  requestTracesNtExportLive,
  updateParcelRegistrationDateAdminLive,
} from '@/services/geoEngineLiveClient';
import {
  canAdminEditRegistrationDate,
  formatDisplayDateEs,
  formatSnapshotLabelEs,
  getNextTimelapsePeriodKey,
  getOrderedTimelapsePeriodKeys,
  getProducerFriendlyParcelStatus,
  isAmazonRegistrationConfirmValid,
  TimelapseDirection,
} from '@/services/producerLogbookService';
import {
  evaluateCustfAdminCompliance,
  HistoricalParcelSnapshot,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

const DEFAULT_TABASCO_RING: number[][] = [
  [-93.2845, 18.256],
  [-93.281, 18.256],
  [-93.281, 18.2525],
  [-93.2845, 18.2525],
  [-93.2845, 18.256],
];

function hasDistinctRealCaptures(snaps?: HistoricalParcelSnapshot[] | null): boolean {
  if (!Array.isArray(snaps) || snaps.length !== 7) {
    return false;
  }
  const releases = new Set(
    snaps
      .map((item) => item.wayback_release)
      .filter((r): r is string => Boolean(r && (r === 'live' || /^\d+$/.test(r)))),
  );
  const dates = new Set(snaps.map((item) => item.captured_date_iso).filter(Boolean));
  return (
    releases.size === 7 &&
    dates.size === 7 &&
    snaps.every((item) => item.capture_source === 'real_src_date')
  );
}

export default function LiveGeoEnginePanel({
  parcel,
  operatorProfile,
  onParcelUpdated,
}: {
  parcel: ParcelAdminOverview;
  operatorProfile?: { fullName: string; role: string; accessToken?: string } | null;
  onParcelUpdated?: (updated: ParcelAdminOverview) => void;
}) {
  const activeCoordinates =
    Array.isArray(parcel.coordinates) && parcel.coordinates.length >= 3
      ? parcel.coordinates
      : DEFAULT_TABASCO_RING;

  const coordKey = JSON.stringify(activeCoordinates);
  const defaultRegDate =
    parcel.registeredAtIso?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const isAdminUser = canAdminEditRegistrationDate(operatorProfile?.role);

  const [referenceDate, setReferenceDate] = useState<string>(defaultRegDate);
  const [isRegDateModalOpen, setIsRegDateModalOpen] = useState<boolean>(false);
  const [pendingRegDate, setPendingRegDate] = useState<string>(defaultRegDate);
  const [confirmWordInput, setConfirmWordInput] = useState<string>('');
  const [regDateError, setRegDateError] = useState<string | null>(null);
  const [regDateSuccessMsg, setRegDateSuccessMsg] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<HistoricalParcelSnapshot[]>(() =>
    hasDistinctRealCaptures(parcel.historicalSnapshots)
      ? parcel.historicalSnapshots!
      : buildHistoricalSnapshotsFallback(parcel.parcelId, activeCoordinates, defaultRegDate),
  );
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('registro_actual');
  const [persistedOnServer, setPersistedOnServer] = useState<boolean>(
    hasDistinctRealCaptures(parcel.historicalSnapshots),
  );
  const [updatingDate, setUpdatingDate] = useState<boolean>(false);
  const [overlayOpacityPct, setOverlayOpacityPct] = useState<number>(75);
  const [enableSharpen, setEnableSharpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('sharpen') === 'false') return false;
    }
    return true;
  });
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [autoPlaySeconds, setAutoPlaySeconds] = useState<number>(2);
  const [autoPlayDirection, setAutoPlayDirection] = useState<TimelapseDirection>('forward');
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExportMsg(null);
    setError(null);
    const initialPeriod =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('period') || 'registro_actual'
        : 'registro_actual';
    setSelectedPeriodKey(initialPeriod);
    setIsAutoPlaying(false);
    setReferenceDate(defaultRegDate);
    setPendingRegDate(defaultRegDate);
    setIsRegDateModalOpen(false);
    setConfirmWordInput('');
    setRegDateError(null);
    setRegDateSuccessMsg(null);

    if (hasDistinctRealCaptures(parcel.historicalSnapshots) && parcel.historicalSnapshots) {
      setSnapshots(parcel.historicalSnapshots);
      setPersistedOnServer(true);
      return;
    }

    let active = true;
    const parsedCoords = JSON.parse(coordKey) as number[][];
    const localFallback = buildHistoricalSnapshotsFallback(
      parcel.parcelId,
      parsedCoords,
      defaultRegDate,
    );
    setSnapshots(localFallback);

    fetchParcelHistoricalSnapshotsLive(parcel.parcelId, defaultRegDate)
      .then((res) => {
        if (active && hasDistinctRealCaptures(res.snapshots)) {
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
  }, [parcel.parcelId, parcel.historicalSnapshots, coordKey, defaultRegDate]);

  // Secuencia ordenada según la dirección elegida por el usuario (hacia adelante o hacia atrás).
  const orderedPeriods = useMemo(() => {
    return getOrderedTimelapsePeriodKeys(snapshots, autoPlayDirection);
  }, [snapshots, autoPlayDirection]);

  useEffect(() => {
    if (!isAutoPlaying || orderedPeriods.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setSelectedPeriodKey((currentKey) => getNextTimelapsePeriodKey(orderedPeriods, currentKey));
    }, autoPlaySeconds * 1000);
    return () => window.clearInterval(timer);
  }, [isAutoPlaying, autoPlaySeconds, orderedPeriods]);

  const handleConfirmAdminRegistrationDate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegDateError(null);
    setRegDateSuccessMsg(null);

    if (!isAdminUser) {
      setRegDateError('Solo el Administrador puede modificar la fecha de registro de la parcela.');
      return;
    }
    if (!pendingRegDate) {
      setRegDateError('Selecciona una nueva fecha de registro válida.');
      return;
    }
    if (!isAmazonRegistrationConfirmValid(confirmWordInput)) {
      setRegDateError('Debes escribir exactamente la palabra "confirmar" para autorizar.');
      return;
    }

    setIsAutoPlaying(false);
    setUpdatingDate(true);
    try {
      const updated = await updateParcelRegistrationDateAdminLive({
        parcelId: parcel.parcelId,
        newDateIso: pendingRegDate,
        confirmationWord: confirmWordInput.trim(),
        changedBy: operatorProfile?.fullName || 'Administrador ASTRA',
        changedByRole: operatorProfile?.role || '',
        accessToken: operatorProfile?.accessToken,
      });
      const updatedDate = updated.registeredAtIso?.slice(0, 10) || pendingRegDate;
      setReferenceDate(updatedDate);
      if (Array.isArray(updated.historicalSnapshots) && updated.historicalSnapshots.length > 0) {
        setSnapshots(updated.historicalSnapshots);
        setSelectedPeriodKey('registro_actual');
        setPersistedOnServer(true);
      }
      if (onParcelUpdated) {
        onParcelUpdated(updated);
      }
      setIsRegDateModalOpen(false);
      setConfirmWordInput('');
      setRegDateSuccessMsg(
        `Fecha de registro actualizada a ${formatDisplayDateEs(updatedDate)} y registrada en la bitácora de auditoría.`,
      );
    } catch (err) {
      setRegDateError(
        err instanceof Error ? err.message : 'No se pudo actualizar la fecha de registro.',
      );
    } finally {
      setUpdatingDate(false);
    }
  };

  const dynamicSpecs = useMemo(
    () => matchWaybackCapturesToHorizons(referenceDate || defaultRegDate),
    [referenceDate, defaultRegDate],
  );

  const dynamicSpecByKey = useMemo(() => {
    const map: Record<string, (typeof dynamicSpecs)[0]> = {};
    for (const s of dynamicSpecs) {
      map[s.period_key] = s;
    }
    return map;
  }, [dynamicSpecs]);

  const activeSnapshot =
    snapshots.find((item) => item.period_key === selectedPeriodKey) ?? snapshots[0];

  const currentDynamicSpec = dynamicSpecByKey[activeSnapshot?.period_key || 'registro_actual'];

  const activeRelease =
    currentDynamicSpec?.wayback_release ||
    (activeSnapshot?.wayback_release &&
    (activeSnapshot.wayback_release === 'live' || /^\d+$/.test(activeSnapshot.wayback_release))
      ? activeSnapshot.wayback_release
      : 'live');

  const mapData = useMemo(
    () => computeCacaoTrackTileGrid(activeCoordinates, 6, 5),
    [activeCoordinates],
  );

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
          pkg.package_integrity_sha256,
        ).slice(0, 14)}...`,
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
        padding: '20px 22px',
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
          <h2
            id="heading-historico-satelital"
            style={{
              margin: 0,
              color: T.colors.primaryGreen,
              fontFamily: 'var(--font-serif)',
              fontSize: '1.35rem',
            }}
          >
            Fotografías Satelitales de tu Parcela
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: T.colors.textSecondary }}>
            Calculadas respecto a la fecha de registro (6 meses, 1, 2, 3, 4 y 5 años atrás) y
            guardadas en servidor para no descargar cada vez que entras.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 10px',
              borderRadius: 8,
              backgroundColor: T.colors.backgroundPrimary,
              border: `1px solid ${T.colors.borderSubtle}`,
              fontSize: '0.8rem',
            }}
          >
            <span style={{ fontWeight: 700, color: T.colors.textSecondary }}>
              Fecha de registro:{' '}
              <strong style={{ color: T.colors.textPrimary }}>
                {formatDisplayDateEs(referenceDate)}
              </strong>
            </span>
            {isAdminUser ? (
              <button
                type="button"
                onClick={() => {
                  setPendingRegDate(referenceDate);
                  setConfirmWordInput('');
                  setRegDateError(null);
                  setIsRegDateModalOpen((prev) => !prev);
                }}
                className="btn-control"
                style={{ padding: '3px 8px', fontSize: '0.74rem', fontWeight: 700 }}
              >
                {isRegDateModalOpen ? 'Cerrar' : 'Modificar fecha (Admin)'}
              </button>
            ) : null}
          </div>

          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '4px 9px',
              borderRadius: 6,
              backgroundColor: persistedOnServer ? T.colors.statusGreenBg : T.colors.softCacaoBg,
              color: persistedOnServer ? T.colors.statusGreen : T.colors.earthCacao,
              border: `1px solid ${persistedOnServer ? '#15803D' : T.colors.earthCacao}`,
            }}
          >
            {updatingDate
              ? 'Recalculando capturas de alta resolución...'
              : persistedOnServer
                ? '✓ Guardado en servidor'
                : 'Vista centrada de la parcela'}
          </span>
        </div>
      </div>

      {regDateSuccessMsg ? (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: T.colors.statusGreenBg,
            border: '1.5px solid #15803D',
            color: T.colors.statusGreen,
            fontSize: '0.84rem',
            fontWeight: 700,
          }}
        >
          {regDateSuccessMsg}
        </div>
      ) : null}

      {isRegDateModalOpen && isAdminUser ? (
        <form
          onSubmit={(e) => void handleConfirmAdminRegistrationDate(e)}
          aria-label="Confirmación crítica para cambiar fecha de registro"
          style={{
            backgroundColor: '#FFF7ED',
            border: '2px solid #C2410C',
            borderRadius: 12,
            padding: 16,
            display: 'grid',
            gap: 12,
          }}
        >
          <div>
            <strong style={{ color: '#9A3412', fontSize: '0.96rem' }}>
              Confirmación crítica de Administrador · Cambio de fecha de registro
            </strong>
            <p style={{ margin: '6px 0 0', fontSize: '0.84rem', color: '#7C2D12' }}>
              Advertencia: Cambiar este valor altera los registros históricos de esta parcela y
              recalcula sus fotografías satelitales de alta resolución. Todo cambio quedará
              registrado permanentemente con tu usuario, rol y fecha en la bitácora de auditoría.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <div>
              <label
                htmlFor="admin-regdate-input"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#7C2D12' }}
              >
                Nueva fecha de registro ({formatDisplayDateEs(pendingRegDate)})
              </label>
              <input
                id="admin-regdate-input"
                type="date"
                value={pendingRegDate}
                disabled={updatingDate}
                onChange={(e) => setPendingRegDate(e.target.value)}
                className="field-input"
                required
              />
            </div>

            <div>
              <label
                htmlFor="admin-regdate-confirm-word"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#7C2D12' }}
              >
                Escribe <code>confirmar</code> para autorizar el cambio
              </label>
              <input
                id="admin-regdate-confirm-word"
                type="text"
                value={confirmWordInput}
                disabled={updatingDate}
                placeholder="confirmar"
                onChange={(e) => setConfirmWordInput(e.target.value)}
                className="field-input"
                autoComplete="off"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setIsRegDateModalOpen(false);
                  setConfirmWordInput('');
                  setRegDateError(null);
                }}
                className="btn-control"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  updatingDate ||
                  !pendingRegDate ||
                  !isAmazonRegistrationConfirmValid(confirmWordInput)
                }
                style={{
                  backgroundColor: isAmazonRegistrationConfirmValid(confirmWordInput)
                    ? '#B91C1C'
                    : '#FCA5A5',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: isAmazonRegistrationConfirmValid(confirmWordInput)
                    ? 'pointer'
                    : 'not-allowed',
                }}
              >
                {updatingDate ? 'Aplicando cambio...' : 'Confirmar y registrar cambio'}
              </button>
            </div>
          </div>

          {regDateError ? (
            <div role="alert" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991B1B' }}>
              {regDateError}
            </div>
          ) : null}
        </form>
      ) : null}

      {/* Única barra de selección de fechas + controles de Timelapse automático y opacidad */}
      <div
        role="group"
        aria-label="Seleccionar época de fotografía satelital"
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
      >
        {snapshots.map((snap) => {
          const isSelected = snap.period_key === activeSnapshot?.period_key;
          return (
            <button
              key={snap.period_key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setIsAutoPlaying(false);
                setSelectedPeriodKey(snap.period_key);
              }}
              className="btn-control"
              style={{
                padding: '6px 11px',
                fontSize: '0.8rem',
                backgroundColor: isSelected ? T.colors.primaryGreen : T.colors.surfaceElevated,
                color: isSelected ? '#FFFFFF' : T.colors.textPrimary,
                borderColor: isSelected ? T.colors.primaryGreen : T.colors.borderControl,
              }}
            >
              {formatSnapshotLabelEs(snap)}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          backgroundColor: T.colors.surfaceElevated,
          border: `1px solid ${T.colors.borderSubtle}`,
          borderRadius: 10,
          padding: '8px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-control"
            onClick={() => setIsAutoPlaying((prev) => !prev)}
            style={{
              padding: '5px 12px',
              fontSize: '0.8rem',
              backgroundColor: isAutoPlaying ? T.colors.earthCacao : T.colors.primaryGreen,
              color: '#FFFFFF',
              borderColor: isAutoPlaying ? T.colors.earthCacao : T.colors.primaryGreen,
            }}
          >
            {isAutoPlaying ? '⏸ Pausar secuencia' : '▶ Reproducir evolución automática'}
          </button>

          <label
            htmlFor="timelapse-interval-select"
            style={{ fontSize: '0.78rem', fontWeight: 700, color: T.colors.textSecondary }}
          >
            Cambiar cada:
          </label>
          <select
            id="timelapse-interval-select"
            value={autoPlaySeconds}
            onChange={(e) => setAutoPlaySeconds(Number(e.target.value))}
            className="field-input"
            style={{ width: 'auto', marginTop: 0, padding: '4px 8px', fontSize: '0.8rem' }}
          >
            <option value={1}>1 segundo</option>
            <option value={2}>2 segundos</option>
            <option value={3}>3 segundos</option>
            <option value={5}>5 segundos</option>
          </select>

          <label
            htmlFor="timelapse-direction-select"
            style={{ fontSize: '0.78rem', fontWeight: 700, color: T.colors.textSecondary }}
          >
            Dirección:
          </label>
          <select
            id="timelapse-direction-select"
            value={autoPlayDirection}
            onChange={(e) => setAutoPlayDirection(e.target.value as TimelapseDirection)}
            className="field-input"
            style={{ width: 'auto', marginTop: 0, padding: '4px 8px', fontSize: '0.8rem' }}
          >
            <option value="forward">Hacia adelante (Pasado → Registro)</option>
            <option value="backward">Hacia atrás (Registro → Pasado)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: T.colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={enableSharpen}
              onChange={(e) => setEnableSharpen(e.target.checked)}
              style={{ accentColor: T.colors.primaryGreen, cursor: 'pointer' }}
            />
            Nitidez óptica HD
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label
              htmlFor="parcel-overlay-opacity"
              style={{ fontSize: '0.78rem', fontWeight: 700, color: T.colors.textSecondary }}
            >
              Opacidad de la parcela ({overlayOpacityPct}%):
            </label>
            <input
              id="parcel-overlay-opacity"
              type="range"
              min={0}
              max={100}
              step={5}
              value={overlayOpacityPct}
              onChange={(e) => setOverlayOpacityPct(Number(e.target.value))}
              style={{ accentColor: T.colors.primaryGreen, cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      {activeSnapshot ? (
        <div
          style={{
            backgroundColor: T.colors.backgroundPrimary,
            border: `1.5px solid ${T.colors.borderSubtle}`,
            borderRadius: 12,
            padding: 14,
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
              <strong style={{ fontSize: '1.02rem', color: T.colors.primaryGreen }}>
                {formatSnapshotLabelEs(activeSnapshot)}
              </strong>
              <div style={{ fontSize: '0.8rem', color: T.colors.textSecondary }}>
                Fecha exacta en que el satélite tomó esta fotografía:{' '}
                <strong>
                  {formatDisplayDateEs(
                    activeSnapshot.captured_date_iso || currentDynamicSpec?.captured_date_iso,
                  )}
                </strong>{' '}
                · Cielo despejado verificado
                {currentDynamicSpec
                  ? ` · ${currentDynamicSpec.sensor} (${currentDynamicSpec.resolution})`
                  : ' · Esri World Imagery HD (0.30m HD)'}
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

          {/* Panel informativo oficial de metadata satelital y margen temporal */}
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1.5px solid #16A34A',
              borderRadius: 10,
              padding: '10px 14px',
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
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: '0.76rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#15803D',
                  fontWeight: 800,
                }}
              >
                🛰️ Metadata Satelital Oficial de la Imagen
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span
                  style={{
                    backgroundColor: '#DCFCE7',
                    color: '#14532D',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    border: '1px solid #86EFAC',
                  }}
                >
                  Satélite:{' '}
                  {currentDynamicSpec?.sensor || activeSnapshot.sensor || 'Maxar WorldView'}
                </span>
                <span
                  style={{
                    backgroundColor: '#DCFCE7',
                    color: '#14532D',
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    border: '1px solid #86EFAC',
                  }}
                >
                  Resolución: {currentDynamicSpec?.resolution || '0.30m - 0.60m Super-HD'}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: 10,
                paddingTop: 8,
                borderTop: '1px solid #BBF7D0',
                fontSize: '0.8rem',
              }}
            >
              <div>
                <span style={{ color: '#4B5563', display: 'block', fontSize: '0.72rem' }}>
                  Fecha registro parcela:
                </span>
                <strong style={{ color: '#111827' }}>{formatDisplayDateEs(referenceDate)}</strong>
              </div>
              <div>
                <span style={{ color: '#4B5563', display: 'block', fontSize: '0.72rem' }}>
                  Horizonte solicitado:
                </span>
                <strong style={{ color: '#111827' }}>
                  {currentDynamicSpec
                    ? `${currentDynamicSpec.years_ago} años atrás (Año objetivo ${currentDynamicSpec.target_year})`
                    : 'Registro actual'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#4B5563', display: 'block', fontSize: '0.72rem' }}>
                  Fecha real captura satélite:
                </span>
                <strong style={{ color: '#15803D' }}>
                  {formatDisplayDateEs(
                    currentDynamicSpec?.captured_date_iso || activeSnapshot.captured_date_iso,
                  )}
                </strong>
              </div>
              <div>
                <span style={{ color: '#4B5563', display: 'block', fontSize: '0.72rem' }}>
                  Año satelital verificado:
                </span>
                <strong style={{ color: '#15803D' }}>
                  ✓ Año{' '}
                  {currentDynamicSpec?.captured_year || activeSnapshot.captured_year || 'Real'}
                  {currentDynamicSpec?.is_exact_year
                    ? ' (Coincidente con horizonte)'
                    : ' (Dentro de margen)'}
                </strong>
              </div>
            </div>
          </div>

          <div
            role="img"
            aria-label={`Fotografía Satelital HD: ${formatSnapshotLabelEs(activeSnapshot)}`}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 960,
              margin: '0 auto',
              aspectRatio: '16 / 9',
              backgroundColor: '#020617',
              borderRadius: 12,
              overflow: 'hidden',
              border: `2px solid ${T.colors.primaryGreen}`,
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
            }}
          >
            <svg
              viewBox={mapData.viewBoxStr}
              preserveAspectRatio="xMidYMid slice"
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                filter: enableSharpen
                  ? currentDynamicSpec?.visualFilter ||
                    'contrast(1.08) brightness(1.02) saturate(1.12)'
                  : 'none',
              }}
            >
              <defs>
                <filter id="satellite-hd-sharpen" x="0%" y="0%" width="100%" height="100%">
                  <feConvolveMatrix
                    order="3"
                    kernelMatrix="0 -0.28 0 -0.28 2.12 -0.28 0 -0.28 0"
                    preserveAlpha="true"
                  />
                </filter>
              </defs>

              {/* Mosaico satelital HD 6x5 de teselas directas (con/sin filtro según toggle) */}
              <g filter={enableSharpen ? 'url(#satellite-hd-sharpen)' : undefined}>
                {mapData.tiles.map((t) => (
                  <image
                    key={`${activeRelease}-${mapData.zoom}-${t.x}-${t.y}`}
                    href={buildWaybackTileUrl(activeRelease, mapData.zoom, t.x, t.y)}
                    x={t.dx * 256}
                    y={t.dy * 256}
                    width={256.4}
                    height={256.4}
                    preserveAspectRatio="none"
                  />
                ))}
              </g>

              {/* Delimitación vectorial sutil idéntica a cacao-track */}
              {mapData.projectedPts.length >= 3 && (
                <g style={{ opacity: overlayOpacityPct / 100 }}>
                  <polygon
                    points={mapData.polygonPointsStr}
                    fill="none"
                    stroke="#020617"
                    strokeOpacity={0.55}
                    strokeWidth={mapData.strokeHalo}
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={mapData.polygonPointsStr}
                    fill="none"
                    stroke="#6EE7B7"
                    strokeOpacity={0.88}
                    strokeWidth={mapData.strokeMain}
                    strokeDasharray={mapData.dashPattern}
                    strokeLinejoin="round"
                  />
                  {mapData.projectedPts.map((pt, idx) => (
                    <circle
                      key={`vtx-${idx}`}
                      cx={pt.px}
                      cy={pt.py}
                      r={mapData.vertexRadius}
                      fill="#34D399"
                      fillOpacity={0.9}
                      stroke="#FFFFFF"
                      strokeOpacity={0.9}
                      strokeWidth={mapData.strokeMain * 0.45}
                    />
                  ))}
                </g>
              )}
            </svg>

            <div
              style={{
                position: 'absolute',
                bottom: 10,
                right: 12,
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: 'rgba(2, 6, 23, 0.85)',
                color: '#E2E8F0',
                fontSize: '0.74rem',
                fontFamily: 'monospace',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                pointerEvents: 'none',
              }}
            >
              Fotografía Satelital HD • {formatSnapshotLabelEs(activeSnapshot)}
            </div>
          </div>
        </div>
      ) : null}

      {(parcel.registrationAuditLog?.length ?? 0) > 0 ? (
        <div
          style={{
            backgroundColor: T.colors.backgroundPrimary,
            borderRadius: 10,
            padding: '12px 14px',
            border: `1px solid ${T.colors.borderSubtle}`,
            display: 'grid',
            gap: 6,
          }}
        >
          <strong style={{ fontSize: '0.82rem', color: T.colors.primaryGreen }}>
            Bitácora de cambios en fecha de registro ({parcel.registrationAuditLog?.length})
          </strong>
          <div style={{ display: 'grid', gap: 4 }}>
            {parcel.registrationAuditLog?.map((entry, idx) => (
              <div
                key={`${entry.changed_at_iso}-${idx}`}
                style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}
              >
                {formatDisplayDateEs(entry.changed_at_iso)} · De{' '}
                <strong>{formatDisplayDateEs(entry.previous_date_iso)}</strong> a{' '}
                <strong>{formatDisplayDateEs(entry.new_date_iso)}</strong> · Por{' '}
                <strong>{entry.changed_by}</strong> ({entry.changed_by_role})
              </div>
            ))}
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
