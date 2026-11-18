'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  deleteFieldLogLive,
  fetchLogbookConfigLive,
  updateFieldLogLive,
} from '@/services/geoEngineLiveClient';
import {
  FieldActivityType,
  FieldEvidencePhoto,
  FieldLogEntry,
  formatDisplayDateEs,
} from '@/services/producerLogbookService';
import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import {
  LogbookActivityCatalogItem,
  LogbookFeatureToggles,
  LogbookInputCatalogItem,
} from '@/types/adminDomain';

interface FieldLogbookModuleProps {
  parcels: ParcelAdminOverview[];
  selectedParcel: ParcelAdminOverview;
  onSelectParcel: (parcelId: string) => void;
  fieldLogs: FieldLogEntry[];
  onAddFieldLog: (entry: FieldLogEntry) => void;
  onUpdateFieldLog?: (entry: FieldLogEntry) => void;
  onDeleteFieldLog?: (id: string) => void;
}

const FALLBACK_ACTIVITIES: LogbookActivityCatalogItem[] = [
  {
    activity_key: 'MANEJO_SOMBRA',
    name: 'Manejo de Sombra y Poda Forestal',
    category: 'AGROFORESTERIA',
    icon: '🌳',
    description: 'Regulación de luz solar mediante poda de árboles de sombra (guamo, cedro, macuilí).',
    default_fields: ['labor_hours', 'workers_count'],
    requires_inputs: false,
    requires_dose: false,
    is_active: true,
    is_archived: false,
    sort_order: 1,
  },
  {
    activity_key: 'PODA_CACAO',
    name: 'Poda de Cacao (Formación / Fitosanitaria)',
    category: 'MANEJO_CULTIVO',
    icon: '✂️',
    description: 'Eliminación de chupones, ramas bajeras o enfermas para aireación.',
    default_fields: ['labor_hours', 'workers_count'],
    requires_inputs: false,
    requires_dose: false,
    is_active: true,
    is_archived: false,
    sort_order: 2,
  },
  {
    activity_key: 'DESMOMIFICACION_FITOSANITARIA',
    name: 'Control Fitosanitario y Desmomificación',
    category: 'FITOSANIDAD',
    icon: '🩺',
    description: 'Remoción de frutos afectados por moniliasis o escoba de bruja.',
    default_fields: ['labor_hours', 'workers_count', 'notes'],
    requires_inputs: false,
    requires_dose: false,
    is_active: true,
    is_archived: false,
    sort_order: 3,
  },
  {
    activity_key: 'FERTILIZACION_ORGANICA',
    name: 'Nutrición y Biofertilización Orgánica',
    category: 'NUTRICION',
    icon: '🌱',
    description: 'Aplicación de composta, bocashi, lixiviados de lombriz o harina de rocas.',
    default_fields: ['input_used', 'dose', 'cost_mxn'],
    requires_inputs: true,
    requires_dose: true,
    is_active: true,
    is_archived: false,
    sort_order: 4,
  },
  {
    activity_key: 'CONTROL_MALEZAS',
    name: 'Chapeo y Manejo de Coberturas',
    category: 'MANEJO_CULTIVO',
    icon: '🌾',
    description: 'Mantenimiento mecánico o manual de arvenses nobles para conservar humedad.',
    default_fields: ['labor_hours', 'workers_count', 'cost_mxn'],
    requires_inputs: false,
    requires_dose: false,
    is_active: true,
    is_archived: false,
    sort_order: 5,
  },
  {
    activity_key: 'RIEGO_DRENAJE',
    name: 'Riego y Mantenimiento de Drenes',
    category: 'INFRAESTRUCTURA',
    icon: '💧',
    description: 'Limpieza de zanjas de drenaje parcelario o activación de riego de auxilio.',
    default_fields: ['labor_hours'],
    requires_inputs: false,
    requires_dose: false,
    is_active: true,
    is_archived: false,
    sort_order: 6,
  },
  {
    activity_key: 'APLICACION_BIOINSUMO',
    name: 'Aplicación de Caldo Bordelés / Sulfocálcico',
    category: 'FITOSANIDAD',
    icon: '🧪',
    description: 'Fumigación preventiva de biofungicidas autorizados para agricultura orgánica.',
    default_fields: ['input_used', 'dose', 'weather_condition'],
    requires_inputs: true,
    requires_dose: true,
    is_active: true,
    is_archived: false,
    sort_order: 7,
  },
  {
    activity_key: 'INSPECCION_FLORACION',
    name: 'Monitoreo de Floración y Cuajado',
    category: 'MONITOREO',
    icon: '🔍',
    description: 'Conteo muestral de cojines florales, chilillos formados y polinizadores.',
    default_fields: ['notes', 'photos'],
    requires_inputs: false,
    requires_dose: false,
    is_active: true,
    is_archived: false,
    sort_order: 8,
  },
];

const QUICK_NOTES_TABASCO = [
  'Poda ligera de mantenimiento y deschuponado',
  'Desmomificación sanitaria y enterramiento en hojarasca',
  'Aplicación al suelo en corona bajo goteo de copa',
  'Limpieza de zanja principal y drenes de escurrimiento',
  'Buen cuajado de floración y presencia de polinizadores',
  'Labor realizada en luna menguante',
];

export default function FieldLogbookModule({
  parcels,
  selectedParcel,
  onSelectParcel,
  fieldLogs,
  onAddFieldLog,
  onUpdateFieldLog,
  onDeleteFieldLog,
}: FieldLogbookModuleProps) {
  // Config state
  const [activitiesCatalog, setActivitiesCatalog] = useState<LogbookActivityCatalogItem[]>(
    FALLBACK_ACTIVITIES,
  );
  const [inputsCatalog, setInputsCatalog] = useState<LogbookInputCatalogItem[]>([]);
  const [toggles, setToggles] = useState<LogbookFeatureToggles>({
    version: 1,
    enable_photos: true,
    enable_inputs_used: true,
    enable_doses: true,
    enable_labor_and_costs: true,
    enable_weather_conditions: true,
    enable_satellite_comparison: true,
    enable_eudr_flags: true,
    enable_custom_fields: true,
    allow_producer_custom_tags: true,
    min_required_photos: 0,
  });

  // Entry Form state
  const [activityType, setActivityType] = useState<FieldActivityType>('MANEJO_SOMBRA');
  const [performedDate, setPerformedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [inputUsed, setInputUsed] = useState('');
  const [dose, setDose] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [workersCount, setWorkersCount] = useState('');
  const [costMxn, setCostMxn] = useState('');
  const [weatherCondition, setWeatherCondition] = useState<'Soleado' | 'Nublado' | 'Lluvioso'>('Soleado');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<FieldEvidencePhoto[]>([]);

  // Filter state
  const [filterParcelId, setFilterParcelId] = useState<string>('ALL');
  const [filterProducerQuery, setFilterProducerQuery] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Modal State
  const [editingEntry, setEditingEntry] = useState<FieldLogEntry | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    let active = true;
    fetchLogbookConfigLive()
      .then((bundle) => {
        if (!active) return;
        if (bundle.activities && bundle.activities.length > 0) {
          setActivitiesCatalog(bundle.activities);
          setActivityType(bundle.activities[0].activity_key as FieldActivityType);
        }
        if (bundle.inputs) {
          setInputsCatalog(bundle.inputs);
        }
        if (bundle.config) {
          setToggles(bundle.config);
        }
      })
      .catch(() => {
        // Fallback initialized
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedActivityDef = useMemo(() => {
    return (
      activitiesCatalog.find((a) => a.activity_key === activityType) ?? activitiesCatalog[0] ?? FALLBACK_ACTIVITIES[0]
    );
  }, [activitiesCatalog, activityType]);

  // Agronomic Summary Metrics
  const summaryMetrics = useMemo(() => {
    const parcelLogs = selectedParcel
      ? fieldLogs.filter((l) => l.parcelId === selectedParcel.parcelId)
      : fieldLogs;

    const fitosanitaryLogs = parcelLogs.filter(
      (l) => l.activityType === 'DESMOMIFICACION_FITOSANITARIA' || l.activityType === 'CONTROL_PLAGAS',
    );
    const nutritionLogs = parcelLogs.filter(
      (l) => l.activityType === 'FERTILIZACION_ORGANICA' || l.activityType === 'FERTILIZACION',
    );

    const nowMs = Date.now();
    const calcDaysAgo = (dateStr?: string) => {
      if (!dateStr) return null;
      const t = new Date(dateStr).getTime();
      if (isNaN(t)) return null;
      return Math.max(0, Math.floor((nowMs - t) / (1000 * 60 * 60 * 24)));
    };

    const latestFito = fitosanitaryLogs[0]?.performedDate;
    const latestNutri = nutritionLogs[0]?.performedDate;

    const totalHours = parcelLogs.reduce((acc, l) => acc + (l.laborHours || 0), 0);

    return {
      daysSinceFito: calcDaysAgo(latestFito),
      daysSinceNutrition: calcDaysAgo(latestNutri),
      totalLogs: parcelLogs.length,
      totalHours: Math.round(totalHours * 10) / 10,
    };
  }, [fieldLogs, selectedParcel]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

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

    const parcel = selectedParcel || parcels[0];
    if (!parcel) {
      setErrorMsg('Selecciona una parcela antes de registrar la labor.');
      return;
    }

    try {
      const newEntry: FieldLogEntry = {
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        parcelId: parcel.parcelId,
        parcelName: parcel.parcelName || parcel.producerName,
        producerId: parcel.producerId,
        producerName: parcel.producerName,
        activityType,
        activityLabel: selectedActivityDef.name,
        performedDate,
        inputUsed: toggles.enable_inputs_used && inputUsed ? inputUsed.trim() : undefined,
        dose: toggles.enable_doses && dose ? dose.trim() : undefined,
        laborHours: toggles.enable_labor_and_costs && laborHours ? parseFloat(laborHours) : undefined,
        workersCount: toggles.enable_labor_and_costs && workersCount ? parseInt(workersCount, 10) : undefined,
        costMxn: toggles.enable_labor_and_costs && costMxn ? parseFloat(costMxn) : undefined,
        weatherCondition: toggles.enable_weather_conditions ? weatherCondition : undefined,
        notes: notes.trim(),
        photos,
        createdAtIso: new Date().toISOString(),
      };

      onAddFieldLog(newEntry);
      setInputUsed('');
      setDose('');
      setLaborHours('');
      setWorkersCount('');
      setCostMxn('');
      setNotes('');
      setPhotos([]);
      setSuccessMsg(
        `Labor "${selectedActivityDef.name}" registrada exitosamente en la bitácora de ${parcel.parcelName || parcel.producerName}.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleEditEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    setSavingEdit(true);
    setErrorMsg(null);
    try {
      const updated = await updateFieldLogLive(editingEntry.id, editingEntry);
      if (onUpdateFieldLog) {
        onUpdateFieldLog(updated);
      }
      setEditingEntry(null);
      setSuccessMsg(`Registro de bitácora actualizado.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar el registro.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEntry = async (entry: FieldLogEntry) => {
    if (!window.confirm(`¿Confirmas eliminar este registro de labor (${entry.activityLabel})?`)) {
      return;
    }
    setErrorMsg(null);
    try {
      await deleteFieldLogLive(entry.id);
      if (onDeleteFieldLog) {
        onDeleteFieldLog(entry.id);
      }
      setSuccessMsg(`Registro eliminado de la bitácora.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al eliminar el registro.');
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

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Parcela',
      'Productor',
      'Actividad',
      'Fecha Realizada',
      'Insumo',
      'Dosis',
      'Horas Mano de Obra',
      'Jornaleros',
      'Costo MXN',
      'Clima',
      'Notas',
      'Fotos Adjuntas',
    ];

    const rows = displayedLogs.map((l) => [
      l.id,
      `"${(l.parcelName || '').replace(/"/g, '""')}"`,
      `"${(l.producerName || '').replace(/"/g, '""')}"`,
      `"${(l.activityLabel || l.activityType).replace(/"/g, '""')}"`,
      l.performedDate,
      `"${(l.inputUsed || '').replace(/"/g, '""')}"`,
      `"${(l.dose || '').replace(/"/g, '""')}"`,
      l.laborHours ?? '',
      l.workersCount ?? '',
      l.costMxn ?? '',
      l.weatherCondition ?? '',
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      l.photos.length,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bitacora_cacao_${selectedParcel?.parcelName || 'general'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      {/* 1. RESUMEN AGRONÓMICO Y ALERTAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div
          style={{
            backgroundColor: T.colors.surfaceCard,
            border: `1.5px solid ${T.colors.borderSubtle}`,
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ fontSize: '2.2rem' }}>🩺</div>
          <div>
            <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary, fontWeight: 600 }}>
              Control Fitosanitario
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: T.colors.primaryGreen }}>
              {summaryMetrics.daysSinceFito !== null ? `Hace ${summaryMetrics.daysSinceFito} días` : 'Sin registro'}
            </div>
            <div style={{ fontSize: '0.72rem', color: T.colors.textSecondary }}>
              Desmomificación de monilia
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: T.colors.surfaceCard,
            border: `1.5px solid ${T.colors.borderSubtle}`,
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ fontSize: '2.2rem' }}>🌱</div>
          <div>
            <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary, fontWeight: 600 }}>
              Nutrición y Bioinsumo
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: T.colors.primaryGreen }}>
              {summaryMetrics.daysSinceNutrition !== null ? `Hace ${summaryMetrics.daysSinceNutrition} días` : 'Sin registro'}
            </div>
            <div style={{ fontSize: '0.72rem', color: T.colors.textSecondary }}>
              Abono y biofertilizante foliar
            </div>
          </div>
        </div>

        {toggles.enable_labor_and_costs ? (
          <div
            style={{
              backgroundColor: T.colors.surfaceCard,
              border: `1.5px solid ${T.colors.borderSubtle}`,
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{ fontSize: '2.2rem' }}>⏱️</div>
            <div>
              <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary, fontWeight: 600 }}>
                Mano de Obra Invertida
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: T.colors.earthCacao }}>
                {summaryMetrics.totalHours} hrs
              </div>
              <div style={{ fontSize: '0.72rem', color: T.colors.textSecondary }}>
                {summaryMetrics.totalLogs} labores registradas
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. FORMULARIO DE REGISTRO EN 3 TOQUES */}
      <section
        aria-labelledby="logbook-form-title"
        style={{
          backgroundColor: T.colors.surfaceCard,
          border: `1.5px solid ${T.colors.borderSubtle}`,
          borderRadius: 14,
          padding: 22,
          display: 'grid',
          gap: 18,
        }}
      >
        <div>
          <h1
            id="logbook-form-title"
            style={{
              margin: 0,
              fontFamily: 'var(--font-serif)',
              fontSize: '1.45rem',
              color: T.colors.primaryGreen,
            }}
          >
            Bitácora Agronómica de Campo · Kanan Cacao
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: T.colors.textSecondary }}>
            Registra labores de manejo, podas, control de plagas y evidencias fotográficas.
          </p>
        </div>

        {successMsg ? (
          <div
            role="status"
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: T.colors.statusGreenBg,
              color: T.colors.statusGreen,
              border: '1.5px solid #15803D',
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
              border: '1.5px solid #B91C1C',
              fontWeight: 700,
              fontSize: '0.86rem',
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
          {/* PASO 1: SELECCIONA LA ACTIVIDAD (CUÍCULA VISUAL) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.92rem', fontWeight: 800, color: T.colors.primaryGreen, marginBottom: 8 }}>
              1. Selecciona la labor realizada:
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 10,
              }}
            >
              {activitiesCatalog.map((act) => {
                const isSelected = act.activity_key === activityType;
                return (
                  <button
                    key={act.activity_key}
                    type="button"
                    onClick={() => setActivityType(act.activity_key as FieldActivityType)}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: isSelected ? '#ECFDF5' : T.colors.backgroundPrimary,
                      border: `2px solid ${isSelected ? T.colors.primaryGreen : T.colors.borderSubtle}`,
                      borderRadius: 10,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <span style={{ fontSize: '1.8rem' }}>{act.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? T.colors.primaryGreen : T.colors.textPrimary }}>
                      {act.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: T.colors.textSecondary, lineHeight: 1.3 }}>
                      {act.category}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedActivityDef.description ? (
              <div style={{ marginTop: 8, fontSize: '0.8rem', color: T.colors.earthCacao, fontStyle: 'italic' }}>
                💡 <strong>Guía técnica:</strong> {selectedActivityDef.description}
              </div>
            ) : null}
          </div>

          {/* PASO 2: PARCELA Y FECHA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Parcela de aplicación:
              </label>
              <select
                value={selectedParcel?.parcelId || ''}
                onChange={(e) => onSelectParcel(e.target.value)}
                className="field-input"
                style={{ width: '100%', padding: '9px 10px', marginTop: 4 }}
              >
                {parcels.map((p) => (
                  <option key={p.parcelId} value={p.parcelId}>
                    {p.parcelName || p.producerName} ({p.municipality})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Fecha realizada:
              </label>
              <input
                type="date"
                value={performedDate}
                onChange={(e) => setPerformedDate(e.target.value)}
                className="field-input"
                style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                required
              />
            </div>

            {toggles.enable_weather_conditions ? (
              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Condición climática:
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {(['Soleado', 'Nublado', 'Lluvioso'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeatherCondition(w)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        fontSize: '0.8rem',
                        fontWeight: weatherCondition === w ? 700 : 500,
                        backgroundColor: weatherCondition === w ? T.colors.primaryGreen : T.colors.surfaceElevated,
                        color: weatherCondition === w ? '#FFFFFF' : T.colors.textPrimary,
                        border: `1px solid ${weatherCondition === w ? T.colors.primaryGreen : T.colors.borderControl}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      {w === 'Soleado' ? '☀️' : w === 'Nublado' ? '⛅' : '🌧️'} {w}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* PASO 3: INSUMOS Y DOSIS (PROGRESSIVE DISCLOSURE) */}
          {toggles.enable_inputs_used || selectedActivityDef.requires_inputs ? (
            <div
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                border: `1px solid ${T.colors.borderSubtle}`,
                borderRadius: 10,
                padding: 14,
                display: 'grid',
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: T.colors.primaryGreen }}>
                🌱 Insumos Orgánicos y Dosis
              </div>

              {inputsCatalog.length > 0 ? (
                <div>
                  <div style={{ fontSize: '0.76rem', color: T.colors.textSecondary, marginBottom: 6 }}>
                    Sugerencias rápidas:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {inputsCatalog.map((inp) => (
                      <button
                        key={inp.input_key}
                        type="button"
                        onClick={() => {
                          setInputUsed(inp.name);
                          if (!dose && inp.default_unit) {
                            setDose(`1 ${inp.default_unit}`);
                          }
                        }}
                        style={{
                          fontSize: '0.76rem',
                          padding: '4px 8px',
                          borderRadius: 6,
                          backgroundColor: T.colors.surfaceElevated,
                          border: `1px solid ${T.colors.borderControl}`,
                          color: T.colors.earthCacao,
                          cursor: 'pointer',
                        }}
                      >
                        + {inp.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: T.colors.textPrimary }}>
                    Insumo o material aplicado:
                  </label>
                  <input
                    type="text"
                    value={inputUsed}
                    onChange={(e) => setInputUsed(e.target.value)}
                    placeholder="Ej. Composta de cacao, Caldo bordelés"
                    className="field-input"
                    style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                  />
                </div>

                {toggles.enable_doses || selectedActivityDef.requires_dose ? (
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: T.colors.textPrimary }}>
                      Dosis aplicada:
                    </label>
                    <input
                      type="text"
                      value={dose}
                      onChange={(e) => setDose(e.target.value)}
                      placeholder="Ej. 2 kg/árbol, 1 mochila de 20L"
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* PASO 4: MANO DE OBRA Y COSTOS (TOGGLEABLE) */}
          {toggles.enable_labor_and_costs ? (
            <div
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                border: `1px solid ${T.colors.borderSubtle}`,
                borderRadius: 10,
                padding: 14,
                display: 'grid',
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: T.colors.primaryGreen }}>
                ⏱️ Mano de Obra y Costos Invertidos
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: T.colors.textPrimary }}>
                    Horas invertidas:
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    placeholder="Ej. 4"
                    className="field-input"
                    style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: T.colors.textPrimary }}>
                    Jornaleros:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={workersCount}
                    onChange={(e) => setWorkersCount(e.target.value)}
                    placeholder="Ej. 2"
                    className="field-input"
                    style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: T.colors.textPrimary }}>
                    Costo total (MXN):
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={costMxn}
                    onChange={(e) => setCostMxn(e.target.value)}
                    placeholder="Ej. 600"
                    className="field-input"
                    style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* PASO 5: NOTAS Y CHIPS RÁPIDOS */}
          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 700, color: T.colors.textPrimary }}>
              Notas y observaciones de campo:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 8px' }}>
              {QUICK_NOTES_TABASCO.map((txt) => (
                <button
                  key={txt}
                  type="button"
                  onClick={() => setNotes((prev) => (prev ? `${prev}. ${txt}` : txt))}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 8px',
                    borderRadius: 12,
                    backgroundColor: T.colors.surfaceElevated,
                    border: `1px solid ${T.colors.borderControl}`,
                    color: T.colors.textSecondary,
                    cursor: 'pointer',
                  }}
                >
                  + {txt}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe detalles de la labor realizada en los árboles de cacao..."
              className="field-input"
              style={{ width: '100%', padding: '8px 10px' }}
            />
          </div>

          {/* PASO 6: FOTOS DE EVIDENCIA */}
          {toggles.enable_photos ? (
            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Fotografías de evidencia en campo:
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ marginTop: 6, display: 'block' }}
              />
              {photos.length > 0 ? (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                  {photos.map((p) => (
                    <div key={p.id} style={{ position: 'relative' }}>
                      <img
                        src={p.previewDataUrl}
                        alt={p.fileName}
                        style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 6 }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(p.id)}
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            className="btn-primary"
            style={{
              padding: '12px 24px',
              backgroundColor: T.colors.primaryGreen,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              marginTop: 6,
            }}
          >
            🌱 Registrar labor en bitácora
          </button>
        </form>
      </section>

      {/* 3. HISTORIAL DE BITÁCORA Y FILTROS */}
      <section
        style={{
          backgroundColor: T.colors.surfaceCard,
          border: `1.5px solid ${T.colors.borderSubtle}`,
          borderRadius: 14,
          padding: 22,
          display: 'grid',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: T.colors.primaryGreen }}>
              📖 Historial de Actividades Registradas ({displayedLogs.length})
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: T.colors.textSecondary }}>
              Auditoría agronómica completa de labores realizadas por parcela.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              backgroundColor: T.colors.surfaceElevated,
              borderColor: T.colors.borderControl,
              color: T.colors.earthCacao,
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            📊 Exportar a CSV
          </button>
        </div>

        {/* Filtros */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
            backgroundColor: T.colors.backgroundPrimary,
            padding: 12,
            borderRadius: 10,
          }}
        >
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: T.colors.textSecondary }}>
              Filtrar por parcela:
            </label>
            <select
              value={filterParcelId}
              onChange={(e) => setFilterParcelId(e.target.value)}
              className="field-input"
              style={{ width: '100%', padding: '6px 8px', marginTop: 2, fontSize: '0.82rem' }}
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
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: T.colors.textSecondary }}>
              Buscar productor / texto:
            </label>
            <input
              type="text"
              value={filterProducerQuery}
              onChange={(e) => setFilterProducerQuery(e.target.value)}
              placeholder="Nombre o palabra..."
              className="field-input"
              style={{ width: '100%', padding: '6px 8px', marginTop: 2, fontSize: '0.82rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: T.colors.textSecondary }}>
              Desde:
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="field-input"
              style={{ width: '100%', padding: '5px 8px', marginTop: 2, fontSize: '0.82rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: T.colors.textSecondary }}>
              Hasta:
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="field-input"
              style={{ width: '100%', padding: '5px 8px', marginTop: 2, fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {/* Lista de Registros */}
        <div style={{ display: 'grid', gap: 12 }}>
          {displayedLogs.map((entry) => (
            <article
              key={entry.id}
              style={{
                backgroundColor: T.colors.surfaceCard,
                border: `1.5px solid ${T.colors.borderSubtle}`,
                borderRadius: 12,
                padding: '16px 18px',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: T.colors.primaryGreen }}>
                      {entry.activityLabel}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
                      · {formatDisplayDateEs(entry.performedDate)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: T.colors.textSecondary, marginTop: 2 }}>
                    Parcela: <strong>{entry.parcelName}</strong> · Productor: <strong>{entry.producerName}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setEditingEntry(entry)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      backgroundColor: T.colors.surfaceElevated,
                      border: `1px solid ${T.colors.borderControl}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(entry)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      backgroundColor: T.colors.statusRedBg,
                      border: '1px solid #FCA5A5',
                      color: T.colors.statusRed,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>

              {/* Badges de labor */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: '0.78rem' }}>
                {entry.inputUsed ? (
                  <span style={{ padding: '3px 8px', borderRadius: 6, backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 600 }}>
                    🌱 {entry.inputUsed} {entry.dose ? `(${entry.dose})` : ''}
                  </span>
                ) : null}
                {entry.laborHours ? (
                  <span style={{ padding: '3px 8px', borderRadius: 6, backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 600 }}>
                    ⏱️ {entry.laborHours} hrs {entry.workersCount ? `· ${entry.workersCount} jornaleros` : ''}
                  </span>
                ) : null}
                {entry.costMxn ? (
                  <span style={{ padding: '3px 8px', borderRadius: 6, backgroundColor: '#E0E7FF', color: '#4338CA', fontWeight: 600 }}>
                    💰 ${entry.costMxn} MXN
                  </span>
                ) : null}
                {entry.weatherCondition ? (
                  <span style={{ padding: '3px 8px', borderRadius: 6, backgroundColor: '#F3F4F6', color: '#374151' }}>
                    🌦️ {entry.weatherCondition}
                  </span>
                ) : null}
              </div>

              {entry.notes ? (
                <p style={{ margin: 0, fontSize: '0.88rem', color: T.colors.textPrimary, lineHeight: 1.45 }}>
                  {entry.notes}
                </p>
              ) : null}

              {entry.photos && entry.photos.length > 0 ? (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  {entry.photos.map((p) => (
                    <img
                      key={p.id}
                      src={p.previewDataUrl}
                      alt={p.fileName}
                      style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6, border: `1px solid ${T.colors.borderSubtle}` }}
                    />
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {/* 4. MODAL EDITAR ENTRADA */}
      {editingEntry ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <form
            onSubmit={handleEditEntrySubmit}
            style={{
              maxWidth: 520,
              width: '100%',
              backgroundColor: T.colors.surfaceCard,
              borderRadius: 14,
              padding: 24,
              display: 'grid',
              gap: 14,
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ margin: 0, color: T.colors.primaryGreen, fontSize: '1.2rem' }}>
              ✏️ Editar Registro de Bitácora
            </h3>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Labor realizada:
              </label>
              <input
                type="text"
                value={editingEntry.activityLabel || ''}
                onChange={(e) =>
                  setEditingEntry((prev) => (prev ? { ...prev, activityLabel: e.target.value } : null))
                }
                className="field-input"
                style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Fecha:
                </label>
                <input
                  type="date"
                  value={editingEntry.performedDate || ''}
                  onChange={(e) =>
                    setEditingEntry((prev) => (prev ? { ...prev, performedDate: e.target.value } : null))
                  }
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Insumo aplicado:
                </label>
                <input
                  type="text"
                  value={editingEntry.inputUsed || ''}
                  onChange={(e) =>
                    setEditingEntry((prev) => (prev ? { ...prev, inputUsed: e.target.value } : null))
                  }
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Horas:
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editingEntry.laborHours ?? ''}
                  onChange={(e) =>
                    setEditingEntry((prev) => (prev ? { ...prev, laborHours: parseFloat(e.target.value) || 0 } : null))
                  }
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Jornales:
                </label>
                <input
                  type="number"
                  value={editingEntry.workersCount ?? ''}
                  onChange={(e) =>
                    setEditingEntry((prev) => (prev ? { ...prev, workersCount: parseInt(e.target.value, 10) || 0 } : null))
                  }
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Costo MXN:
                </label>
                <input
                  type="number"
                  value={editingEntry.costMxn ?? ''}
                  onChange={(e) =>
                    setEditingEntry((prev) => (prev ? { ...prev, costMxn: parseFloat(e.target.value) || 0 } : null))
                  }
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Notas y observaciones:
              </label>
              <textarea
                rows={3}
                value={editingEntry.notes || ''}
                onChange={(e) =>
                  setEditingEntry((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                }
                className="field-input"
                style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="btn-secondary"
                style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="btn-primary"
                style={{
                  padding: '8px 18px',
                  backgroundColor: T.colors.primaryGreen,
                  color: '#FFFFFF',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
