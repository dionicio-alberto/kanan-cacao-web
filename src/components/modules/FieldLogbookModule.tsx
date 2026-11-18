'use client';

import React, { useState } from 'react';
import {
  createFieldLogEntry,
  FIELD_ACTIVITY_LABELS,
  FieldActivityType,
  FieldEvidencePhoto,
  FieldLogEntry,
  formatDisplayDateEs,
} from '@/services/producerLogbookService';
import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

interface FieldLogbookModuleProps {
  parcels: ParcelAdminOverview[];
  selectedParcel: ParcelAdminOverview;
  onSelectParcel: (parcelId: string) => void;
  fieldLogs: FieldLogEntry[];
  onAddFieldLog: (entry: FieldLogEntry) => void;
}

const ALL_ACTIVITIES = Object.keys(FIELD_ACTIVITY_LABELS) as FieldActivityType[];

export default function FieldLogbookModule({
  parcels,
  selectedParcel,
  onSelectParcel,
  fieldLogs,
  onAddFieldLog,
}: FieldLogbookModuleProps) {
  const [activityType, setActivityType] = useState<FieldActivityType>('FERTILIZACION');
  const [performedDate, setPerformedDate] = useState('2026-11-15');
  const [fertilizationDate, setFertilizationDate] = useState('2026-11-15');
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('2026-12-20');
  const [inputUsed, setInputUsed] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<FieldEvidencePhoto[]>([]);
  const [filterParcelId, setFilterParcelId] = useState<string>('ALL');
  const [filterProducerQuery, setFilterProducerQuery] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [
            ...prev,
            {
              id: `IMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              fileName: file.name,
              previewDataUrl: reader.result as string,
              capturedAtIso: new Date().toISOString(),
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((item) => item.id !== photoId));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const entry = createFieldLogEntry({
        parcelId: selectedParcel.parcelId,
        parcelName: selectedParcel.parcelName || selectedParcel.producerName,
        producerId: selectedParcel.producerId,
        producerName: selectedParcel.producerName,
        activityType,
        performedDate,
        fertilizationDate: fertilizationDate || undefined,
        expectedHarvestDate: expectedHarvestDate || undefined,
        inputUsed,
        notes,
        photos,
      });
      onAddFieldLog(entry);
      setInputUsed('');
      setNotes('');
      setPhotos([]);
      setSuccessMsg(
        `Actividad guardada en la bitácora de ${selectedParcel.parcelName || selectedParcel.producerName}.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const displayedLogs = fieldLogs.filter((entry) => {
    if (filterParcelId !== 'ALL' && entry.parcelId !== filterParcelId) {
      return false;
    }
    if (filterProducerQuery.trim()) {
      const q = filterProducerQuery.toLowerCase().trim();
      const matchName = entry.producerName?.toLowerCase().includes(q);
      const matchId = entry.producerId?.toLowerCase().includes(q);
      const matchParcel = entry.parcelName?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchParcel) {
        return false;
      }
    }
    if (filterStartDate && entry.performedDate < filterStartDate) {
      return false;
    }
    if (filterEndDate && entry.performedDate > filterEndDate) {
      return false;
    }
    return true;
  });

  const handleResetFilters = () => {
    setFilterParcelId('ALL');
    setFilterProducerQuery('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section
        aria-labelledby="logbook-form-title"
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
              id="logbook-form-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.5rem',
                color: T.colors.primaryGreen,
              }}
            >
              Bitácora Diaria de la Parcela y Evidencias Fotográficas
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: T.colors.textSecondary }}>
              Registra tus fechas de fertilización, podas, limpia, fecha estimada o real de cosecha
              y sube fotografías de respaldo del trabajo diario.
            </p>
          </div>
        </div>

        {successMsg ? (
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
            {successMsg}
          </div>
        ) : null}

        {errorMsg ? (
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
            {errorMsg}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <div>
              <label
                htmlFor="log-parcel-select"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Parcela trabajada
              </label>
              <select
                id="log-parcel-select"
                value={selectedParcel.parcelId}
                onChange={(e) => onSelectParcel(e.target.value)}
                className="field-input"
              >
                {parcels.map((p) => (
                  <option key={p.parcelId} value={p.parcelId}>
                    {p.parcelName || p.producerName} ({p.municipality})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="log-activity-type"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Acción tomada en el día a día
              </label>
              <select
                id="log-activity-type"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as FieldActivityType)}
                className="field-input"
              >
                {ALL_ACTIVITIES.map((act) => (
                  <option key={act} value={act}>
                    {FIELD_ACTIVITY_LABELS[act]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="log-performed-date"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Fecha de la actividad
              </label>
              <input
                id="log-performed-date"
                type="date"
                required
                value={performedDate}
                onChange={(e) => setPerformedDate(e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label
                htmlFor="log-fertilization-date"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Fecha de fertilización / abono
              </label>
              <input
                id="log-fertilization-date"
                type="date"
                value={fertilizationDate}
                onChange={(e) => setFertilizationDate(e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label
                htmlFor="log-harvest-date"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Fecha estimada o realizada de cosecha
              </label>
              <input
                id="log-harvest-date"
                type="date"
                value={expectedHarvestDate}
                onChange={(e) => setExpectedHarvestDate(e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label
                htmlFor="log-input-used"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Abono, herramienta o insumo usado
              </label>
              <input
                id="log-input-used"
                type="text"
                value={inputUsed}
                onChange={(e) => setInputUsed(e.target.value)}
                placeholder="Ej. Abono orgánico / Caldo bordelés"
                className="field-input"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="log-notes"
              style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Notas y observaciones del día en la parcela
            </label>
            <textarea
              id="log-notes"
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe qué parte del terreno se trabajó, cuántos árboles se atendieron o cómo se ven las mazorcas."
              className="field-input"
            />
          </div>

          <div
            style={{
              backgroundColor: T.colors.surfaceElevated,
              border: `1.5px dashed ${T.colors.borderControl}`,
              borderRadius: 10,
              padding: 16,
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
                gap: 10,
              }}
            >
              <div>
                <label
                  htmlFor="log-photo-upload"
                  style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700 }}
                >
                  📷 Adjuntar fotografías y evidencias de campo
                </label>
                <span style={{ fontSize: '0.8rem', color: T.colors.textSecondary }}>
                  Sube una o varias fotos del abono aplicado, poda realizada, plagas o mazorcas.
                </span>
              </div>

              <input
                id="log-photo-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {photos.length > 0 ? (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    style={{
                      backgroundColor: T.colors.surfaceCard,
                      border: `1px solid ${T.colors.borderSubtle}`,
                      borderRadius: 8,
                      padding: 6,
                      width: 140,
                      display: 'grid',
                      gap: 4,
                    }}
                  >
                    <img
                      src={photo.previewDataUrl}
                      alt={photo.fileName}
                      style={{
                        width: '100%',
                        height: 88,
                        objectFit: 'cover',
                        borderRadius: 6,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.72rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {photo.fileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="btn-control"
                      style={{ padding: '3px 6px', fontSize: '0.72rem', minHeight: 28 }}
                    >
                      Quitar foto
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary">
              Guardar registro en bitácora ({photos.length} fotos)
            </button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="logbook-history-title"
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
          <h2
            id="logbook-history-title"
            style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: '1.3rem',
              color: T.colors.primaryGreen,
            }}
          >
            Historial de la Bitácora ({displayedLogs.length} registros)
          </h2>

          {(filterParcelId !== 'ALL' ||
            filterProducerQuery ||
            filterStartDate ||
            filterEndDate) && (
            <button
              type="button"
              className="btn-control"
              onClick={handleResetFilters}
              style={{ fontSize: '0.8rem', padding: '5px 10px' }}
            >
              🔄 Limpiar filtros
            </button>
          )}
        </div>

        {/* Barra de Filtros interactiva: Parcela, Productor y Rango de Fechas */}
        <div
          style={{
            backgroundColor: T.colors.surfaceElevated,
            border: `1px solid ${T.colors.borderSubtle}`,
            borderRadius: 10,
            padding: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div>
            <label
              htmlFor="filter-parcel-select"
              style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}
            >
              Filtrar por Parcela
            </label>
            <select
              id="filter-parcel-select"
              value={filterParcelId}
              onChange={(e) => setFilterParcelId(e.target.value)}
              className="field-input"
              style={{ fontSize: '0.84rem', padding: '6px 8px' }}
            >
              <option value="ALL">Todas las parcelas</option>
              {parcels.map((p) => (
                <option key={p.parcelId} value={p.parcelId}>
                  {p.parcelName || p.producerName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-producer-input"
              style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}
            >
              Filtrar por Productor
            </label>
            <input
              id="filter-producer-input"
              type="text"
              value={filterProducerQuery}
              onChange={(e) => setFilterProducerQuery(e.target.value)}
              placeholder="Buscar por productor..."
              className="field-input"
              style={{ fontSize: '0.84rem', padding: '6px 8px' }}
            />
          </div>

          <div>
            <label
              htmlFor="filter-start-date"
              style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}
            >
              Fecha desde
            </label>
            <input
              id="filter-start-date"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="field-input"
              style={{ fontSize: '0.84rem', padding: '6px 8px' }}
            />
          </div>

          <div>
            <label
              htmlFor="filter-end-date"
              style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}
            >
              Fecha hasta
            </label>
            <input
              id="filter-end-date"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="field-input"
              style={{ fontSize: '0.84rem', padding: '6px 8px' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {displayedLogs.map((entry) => (
            <article
              key={entry.id}
              style={{
                backgroundColor: T.colors.surfaceElevated,
                border: `1px solid ${T.colors.borderSubtle}`,
                borderRadius: 12,
                padding: 16,
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
                  <strong style={{ fontSize: '1rem', color: T.colors.primaryGreen }}>
                    {entry.activityLabel}
                  </strong>
                  <div style={{ fontSize: '0.82rem', color: T.colors.textSecondary }}>
                    Parcela: <strong>{entry.parcelName}</strong>
                    {entry.producerName ? (
                      <>
                        {' '}
                        · Productor: <strong>{entry.producerName}</strong>
                      </>
                    ) : null}{' '}
                    · Realizado el <strong>{formatDisplayDateEs(entry.performedDate)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.76rem' }}>
                  {entry.fertilizationDate ? (
                    <span
                      style={{
                        backgroundColor: T.colors.softGreenBg,
                        color: T.colors.primaryGreen,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontWeight: 700,
                      }}
                    >
                      🌱 Fertilización: {formatDisplayDateEs(entry.fertilizationDate)}
                    </span>
                  ) : null}
                  {entry.expectedHarvestDate ? (
                    <span
                      style={{
                        backgroundColor: T.colors.softCacaoBg,
                        color: T.colors.earthCacao,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontWeight: 700,
                      }}
                    >
                      🧺 Cosecha: {formatDisplayDateEs(entry.expectedHarvestDate)}
                    </span>
                  ) : null}
                </div>
              </div>

              {entry.inputUsed ? (
                <div style={{ fontSize: '0.84rem', color: T.colors.textSecondary }}>
                  <strong>Insumo / material:</strong> {entry.inputUsed}
                </div>
              ) : null}

              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{entry.notes}</p>

              {entry.photos.length > 0 ? (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {entry.photos.map((photo) => (
                    <figure key={photo.id} style={{ margin: 0 }}>
                      <img
                        src={photo.previewDataUrl}
                        alt={photo.fileName}
                        style={{
                          width: 150,
                          height: 98,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: `1px solid ${T.colors.borderSubtle}`,
                        }}
                      />
                      <figcaption style={{ fontSize: '0.72rem', color: T.colors.textSecondary }}>
                        {photo.fileName}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
