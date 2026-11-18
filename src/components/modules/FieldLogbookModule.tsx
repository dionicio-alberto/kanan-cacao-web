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

type LogbookViewMode = 'hub' | 'activity-form' | 'history';

const FALLBACK_ACTIVITIES: LogbookActivityCatalogItem[] = [
  {
    activity_key: 'MANEJO_SOMBRA',
    name: 'Manejo de Sombra y Poda Forestal',
    category: 'AGROFORESTERIA',
    icon: '🌳',
    description:
      'Regulación de luz solar mediante poda de árboles de sombra (guamo, cedro, macuilí).',
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
    description: 'Eliminación de chupones, ramas bajeras o enfermas para mejorar aireación.',
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

const QUICK_NOTES_MAP: Record<string, string[]> = {
  MANEJO_SOMBRA: [
    'Poda de ramas altas en árboles de guamo para 35% de luz.',
    'Acolchado de biomasa podada en cajetes para retener humedad.',
    'Despunte de ramas secas con peligro de caída sobre el cacaotal.',
    'Regulación de sombra realizada en luna menguante.',
  ],
  PODA_CACAO: [
    'Deschuponado general en troncos principales.',
    'Poda fitosanitaria de ramas entrelazadas para mejor aireación.',
    'Cortes limpios a 45 grados sellados con pasta cicatrizante.',
    'Desinfección de tijeras con alcohol entre cada hilera de árboles.',
  ],
  DESMOMIFICACION_FITOSANITARIA: [
    'Remoción de mazorcas con mancha de monilia y esporulación.',
    'Enterramiento de frutos enfermos bajo capa de hojarasca y cal.',
    'Baja incidencia de escoba de bruja en ramas secundarias.',
    'Recorrido fitosanitario exhaustivo por todo el lote.',
  ],
  FERTILIZACION_ORGANICA: [
    'Aplicación de composta en corona a 1 metro del tronco.',
    'Incorporación de bocashi enriquecido con harina de rocas.',
    'Riego foliar con lixiviado de lombriz diluido al 10%.',
    'Fertilización aplicada con suelo húmedo tras lluvia ligera.',
  ],
  CONTROL_MALEZAS: [
    'Chapeo manual bajo con machete conservando arvenses nobles.',
    'Deshierbe selectivo en círculo de 1.5 metros alrededor del cacaotal.',
    'Manejo de coberturas leguminosas vivas contra erosión.',
    'Sin uso de herbicidas sintéticos (100% orgánico certificado).',
  ],
  RIEGO_DRENAJE: [
    'Desazolve de zanja colectora principal de escurrimientos.',
    'Apertura de sangrías menores para evitar encharcamientos.',
    'Riego auxiliar por goteo en lote de plantas jóvenes.',
    'Suelo en excelente estado de drenaje y permeabilidad.',
  ],
  APLICACION_BIOINSUMO: [
    'Fumigación de caldo bordelés mineral al 1% en horas frescas.',
    'Aspersión de caldo sulfocálcico para prevención de hongos.',
    'Boquilla calibrada tipo cono hueco para cobertura total.',
    'Uso de equipo de protección personal (mascarilla y overol).',
  ],
  INSPECCION_FLORACION: [
    'Excelente floración en cojines del tallo principal.',
    'Presencia activa de mosquitas polinizadoras (Forcipomyia).',
    'Conteo de 15 a 25 chilillos cuajados por árbol muestreado.',
    'Monitoreo favorable previo al inicio de formación de mazorcas.',
  ],
};

export default function FieldLogbookModule({
  parcels,
  selectedParcel,
  onSelectParcel,
  fieldLogs,
  onAddFieldLog,
  onUpdateFieldLog,
  onDeleteFieldLog,
}: FieldLogbookModuleProps) {
  // Navigation View State
  const [viewMode, setViewMode] = useState<LogbookViewMode>('hub');
  const [activeActivityKey, setActiveActivityKey] = useState<string>('MANEJO_SOMBRA');

  // Config state
  const [activitiesCatalog, setActivitiesCatalog] =
    useState<LogbookActivityCatalogItem[]>(FALLBACK_ACTIVITIES);
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

  // Base Form State
  const [performedDate, setPerformedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [inputUsed, setInputUsed] = useState('');
  const [dose, setDose] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [workersCount, setWorkersCount] = useState('');
  const [costMxn, setCostMxn] = useState('');
  const [weatherCondition, setWeatherCondition] = useState<'Soleado' | 'Nublado' | 'Lluvioso'>(
    'Soleado',
  );
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<FieldEvidencePhoto[]>([]);

  // Activity Specific Sub-Fields State
  // Sombra
  const [shadeTreesTreated, setShadeTreesTreated] = useState('Guamo y Cedro');
  const [targetShadePct, setTargetShadePct] = useState('35%');
  // Poda
  const [pruningType, setPruningType] = useState('Poda Fitosanitaria y Deschuponado');
  const [healingApplied, setHealingApplied] = useState('Pasta Bordelesa Cicatrizante');
  // Control Plagas / Monilia
  const [targetPest, setTargetPest] = useState('Moniliasis (Moniliophthora roreri)');
  const [diseasedPodsRemoved, setDiseasedPodsRemoved] = useState('');
  const [disposalMethod, setDisposalMethod] = useState('Enterramiento bajo hojarasca con cal');
  // Nutrición
  const [nutritionMethod, setNutritionMethod] = useState('En corona bajo el goteo de la copa');
  // Malezas
  const [weedingMethod, setWeedingMethod] = useState('Chapeo manual bajo a ras');
  // Drenaje
  const [drainType, setDrainType] = useState('Zanja principal colectora');
  const [drainMeters, setDrainMeters] = useState('');
  // Bioinsumo
  const [bioPreparation, setBioPreparation] = useState('Caldo Bordelés 1%');
  // Floración
  const [flowerIntensity, setFlowerIntensity] = useState('Media - Alta');
  const [chilillosEstimated, setChilillosEstimated] = useState('');

  // History Filter state
  const [filterParcelId, setFilterParcelId] = useState<string>('ALL');
  const [filterActivityType, setFilterActivityType] = useState<string>('ALL');
  const [filterProducerQuery, setFilterProducerQuery] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Notifications
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
          const valid = bundle.activities.filter((a) => a.is_active && !a.is_archived);
          if (valid.length > 0) {
            setActivitiesCatalog(valid);
            setActiveActivityKey(valid[0].activity_key);
          }
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

  const currentActivityDef = useMemo(() => {
    return (
      activitiesCatalog.find((a) => a.activity_key === activeActivityKey) ??
      activitiesCatalog[0] ??
      FALLBACK_ACTIVITIES[0]
    );
  }, [activitiesCatalog, activeActivityKey]);

  // Agronomic Summary Metrics
  const summaryMetrics = useMemo(() => {
    const parcelLogs = selectedParcel
      ? fieldLogs.filter((l) => l.parcelId === selectedParcel.parcelId)
      : fieldLogs;

    const fitosanitaryLogs = parcelLogs.filter(
      (l) =>
        l.activityType === 'DESMOMIFICACION_FITOSANITARIA' || l.activityType === 'CONTROL_PLAGAS',
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
    const totalCost = parcelLogs.reduce((acc, l) => acc + (l.costMxn || 0), 0);

    return {
      daysSinceFito: calcDaysAgo(latestFito),
      daysSinceNutrition: calcDaysAgo(latestNutri),
      totalLogs: parcelLogs.length,
      totalHours: Math.round(totalHours * 10) / 10,
      totalCostMxn: Math.round(totalCost),
    };
  }, [fieldLogs, selectedParcel]);

  const handleOpenActivityForm = (activityKey: string) => {
    setActiveActivityKey(activityKey);
    setErrorMsg(null);
    setSuccessMsg(null);
    setInputUsed('');
    setDose('');
    setLaborHours('');
    setWorkersCount('');
    setCostMxn('');
    setNotes('');
    setPhotos([]);
    setViewMode('activity-form');
  };

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

  // Compile detailed contextual notes
  const buildComprehensiveNotes = () => {
    const parts: string[] = [];
    if (notes.trim()) {
      parts.push(notes.trim());
    }

    if (activeActivityKey === 'MANEJO_SOMBRA') {
      parts.push(
        `[Sombra] Árboles intervenidos: ${shadeTreesTreated} · Cobertura objetivo: ${targetShadePct}.`,
      );
    } else if (activeActivityKey === 'PODA_CACAO') {
      parts.push(`[Poda] Tipo: ${pruningType} · Cicatrizante: ${healingApplied}.`);
    } else if (activeActivityKey === 'DESMOMIFICACION_FITOSANITARIA') {
      parts.push(
        `[Fitosanidad] Tratamiento de: ${targetPest}${
          diseasedPodsRemoved ? ` · Mazorcas removidas: ${diseasedPodsRemoved}` : ''
        } · Método: ${disposalMethod}.`,
      );
    } else if (activeActivityKey === 'FERTILIZACION_ORGANICA') {
      parts.push(`[Nutrición] Método de incorporación: ${nutritionMethod}.`);
    } else if (activeActivityKey === 'CONTROL_MALEZAS') {
      parts.push(`[Coberturas] Método: ${weedingMethod}.`);
    } else if (activeActivityKey === 'RIEGO_DRENAJE') {
      parts.push(
        `[Drenaje] Intervención: ${drainType}${drainMeters ? ` (${drainMeters} metros lineales)` : ''}.`,
      );
    } else if (activeActivityKey === 'APLICACION_BIOINSUMO') {
      parts.push(`[Bioinsumo] Producto: ${bioPreparation}.`);
    } else if (activeActivityKey === 'INSPECCION_FLORACION') {
      parts.push(
        `[Floración] Intensidad floral: ${flowerIntensity}${
          chilillosEstimated ? ` · Chilillos estimados: ${chilillosEstimated}` : ''
        }.`,
      );
    }

    return parts.join(' ');
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
      const compiledNotes = buildComprehensiveNotes();
      const newEntry: FieldLogEntry = {
        id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        parcelId: parcel.parcelId,
        parcelName: parcel.parcelName || parcel.producerName,
        producerId: parcel.producerId,
        producerName: parcel.producerName,
        activityType: activeActivityKey as FieldActivityType,
        activityLabel: currentActivityDef.name,
        performedDate,
        inputUsed: toggles.enable_inputs_used && inputUsed ? inputUsed.trim() : undefined,
        dose: toggles.enable_doses && dose ? dose.trim() : undefined,
        laborHours:
          toggles.enable_labor_and_costs && laborHours ? parseFloat(laborHours) : undefined,
        workersCount:
          toggles.enable_labor_and_costs && workersCount ? parseInt(workersCount, 10) : undefined,
        costMxn: toggles.enable_labor_and_costs && costMxn ? parseFloat(costMxn) : undefined,
        weatherCondition: toggles.enable_weather_conditions ? weatherCondition : undefined,
        notes: compiledNotes,
        photos,
        createdAtIso: new Date().toISOString(),
      };

      onAddFieldLog(newEntry);
      setSuccessMsg(
        `Labor "${currentActivityDef.name}" guardada exitosamente en la parcela ${parcel.parcelName || parcel.producerName}.`,
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
      setSuccessMsg(`Registro de bitácora actualizado con éxito.`);
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
    if (filterActivityType !== 'ALL' && entry.activityType !== filterActivityType) {
      return false;
    }
    if (filterProducerQuery.trim()) {
      const q = filterProducerQuery.toLowerCase().trim();
      const matchName = entry.producerName?.toLowerCase().includes(q);
      const matchId = entry.producerId?.toLowerCase().includes(q);
      const matchParcel = entry.parcelName?.toLowerCase().includes(q);
      const matchNotes = entry.notes?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchParcel && !matchNotes) {
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

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `bitacora_cacao_${selectedParcel?.parcelName || 'general'}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const quickNotesList = QUICK_NOTES_MAP[activeActivityKey] || QUICK_NOTES_MAP.MANEJO_SOMBRA;

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      {/* ============================================================== */}
      {/* VISTA 1: HUB PRINCIPAL DE BITÁCORA                             */}
      {/* ============================================================== */}
      {viewMode === 'hub' && (
        <>
          {/* 1. RESUMEN AGRONÓMICO Y MÉTRICAS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
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
                <div
                  style={{ fontSize: '0.78rem', color: T.colors.textSecondary, fontWeight: 600 }}
                >
                  Control Fitosanitario
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: T.colors.primaryGreen }}>
                  {summaryMetrics.daysSinceFito !== null
                    ? `Hace ${summaryMetrics.daysSinceFito} días`
                    : 'Sin registro'}
                </div>
                <div style={{ fontSize: '0.72rem', color: T.colors.textSecondary }}>
                  Desmomificación y plagas
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
                <div
                  style={{ fontSize: '0.78rem', color: T.colors.textSecondary, fontWeight: 600 }}
                >
                  Nutrición y Bioinsumo
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: T.colors.primaryGreen }}>
                  {summaryMetrics.daysSinceNutrition !== null
                    ? `Hace ${summaryMetrics.daysSinceNutrition} días`
                    : 'Sin registro'}
                </div>
                <div style={{ fontSize: '0.72rem', color: T.colors.textSecondary }}>
                  Abono orgánico y caldos
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
                  <div
                    style={{ fontSize: '0.78rem', color: T.colors.textSecondary, fontWeight: 600 }}
                  >
                    Mano de Obra y Costos
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: T.colors.earthCacao }}>
                    {summaryMetrics.totalHours} hrs · ${summaryMetrics.totalCostMxn} MXN
                  </div>
                  <div style={{ fontSize: '0.72rem', color: T.colors.textSecondary }}>
                    {summaryMetrics.totalLogs} labores registradas
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 2. BOTONES DE LABORES INTEGRADAS */}
          <section
            aria-labelledby="integrated-activities-title"
            style={{
              backgroundColor: T.colors.surfaceCard,
              border: `1.5px solid ${T.colors.borderSubtle}`,
              borderRadius: 14,
              padding: 22,
              display: 'grid',
              gap: 16,
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: T.colors.primaryGreen,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Catálogo Operativo de Campo
              </span>
              <h2
                id="integrated-activities-title"
                style={{
                  margin: '4px 0 0',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.4rem',
                  color: T.colors.primaryGreen,
                }}
              >
                🌾 Labores Agronómicas Integradas
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: T.colors.textSecondary }}>
                Haz clic sobre cualquiera de las labores para abrir su formulario de registro con
                campos ajustados y asistencia técnica específica:
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 14,
              }}
            >
              {activitiesCatalog.map((act) => (
                <button
                  key={act.activity_key}
                  type="button"
                  onClick={() => handleOpenActivityForm(act.activity_key)}
                  style={{
                    backgroundColor: T.colors.backgroundPrimary,
                    border: `1.5px solid ${T.colors.borderSubtle}`,
                    borderRadius: 12,
                    padding: '16px 18px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'all 0.15s ease-in-out',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = T.colors.primaryGreen;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 14px rgba(20, 69, 38, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = T.colors.borderSubtle;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '2.2rem' }}>{act.icon}</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 12,
                        backgroundColor: '#ECFDF5',
                        color: T.colors.primaryGreen,
                        border: '1px solid #BBF7D0',
                      }}
                    >
                      {act.category}
                    </span>
                  </div>

                  <div
                    style={{ fontWeight: 800, fontSize: '0.98rem', color: T.colors.textPrimary }}
                  >
                    {act.name}
                  </div>

                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: T.colors.textSecondary,
                      lineHeight: 1.35,
                      flex: 1,
                    }}
                  >
                    {act.description}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: T.colors.primaryGreen,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    Registrar esta labor →
                  </div>
                </button>
              ))}
            </div>

            {/* 3. BOTÓN DE HISTORIAL DE ACTIVIDADES (ABAJO DE LOS BOTONES DE LABORES) */}
            <div
              style={{
                marginTop: 8,
                padding: '20px 22px',
                backgroundColor: '#F3F4F6',
                border: `1.5px solid ${T.colors.borderSubtle}`,
                borderRadius: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: '2.5rem' }}>📜</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: T.colors.textPrimary }}>
                    Historial de Actividades en Parcela
                  </h3>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '0.84rem',
                      color: T.colors.textSecondary,
                    }}
                  >
                    Revisa las labores efectuadas, consulta evidencias fotográficas, filtra por
                    fecha y descarga reportes.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setViewMode('history');
                  }}
                  style={{
                    backgroundColor: T.colors.primaryGreen,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 24px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 2px 6px rgba(20, 69, 38, 0.2)',
                  }}
                >
                  📖 Ver Historial de Actividades ({fieldLogs.length})
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: T.colors.earthCacao,
                    border: `1.5px solid ${T.colors.borderControl}`,
                    borderRadius: 10,
                    padding: '12px 18px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📊 Exportar CSV
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: PÁGINA DEDICADA POR ACTIVIDAD CON FORMULARIO AJUSTADO */}
      {/* ============================================================== */}
      {viewMode === 'activity-form' && (
        <section
          aria-labelledby="activity-form-heading"
          style={{
            backgroundColor: T.colors.surfaceCard,
            border: `1.5px solid ${T.colors.borderSubtle}`,
            borderRadius: 14,
            padding: 24,
            display: 'grid',
            gap: 20,
          }}
        >
          {/* Barra superior de navegación */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                setViewMode('hub');
              }}
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                border: `1.5px solid ${T.colors.borderSubtle}`,
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: T.colors.primaryGreen,
                cursor: 'pointer',
              }}
            >
              ← Volver a Bitácora
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                setViewMode('history');
              }}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: T.colors.earthCacao,
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Ver historial de esta labor →
            </button>
          </div>

          {/* Encabezado de la actividad seleccionada */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              backgroundColor: '#ECFDF5',
              border: '1.5px solid #BBF7D0',
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div style={{ fontSize: '3rem' }}>{currentActivityDef.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                    backgroundColor: '#DCFCE7',
                    color: T.colors.primaryGreen,
                  }}
                >
                  {currentActivityDef.category}
                </span>
              </div>
              <h1
                id="activity-form-heading"
                style={{
                  margin: '4px 0 6px',
                  fontSize: '1.45rem',
                  fontFamily: 'var(--font-serif)',
                  color: T.colors.primaryGreen,
                }}
              >
                {currentActivityDef.name}
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.86rem',
                  color: T.colors.textSecondary,
                  lineHeight: 1.4,
                }}
              >
                {currentActivityDef.description}
              </p>
            </div>
          </div>

          {successMsg ? (
            <div
              role="status"
              style={{
                padding: '14px 18px',
                borderRadius: 10,
                backgroundColor: T.colors.statusGreenBg,
                color: T.colors.statusGreen,
                border: '1.5px solid #15803D',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <span>✓ {successMsg}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setViewMode('history')}
                  style={{
                    backgroundColor: '#15803D',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📜 Ver en Historial
                </button>
                <button
                  type="button"
                  onClick={() => setSuccessMsg(null)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#15803D',
                    border: '1px solid #15803D',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ➕ Registrar otra labor
                </button>
              </div>
            </div>
          ) : null}

          {errorMsg ? (
            <div
              role="alert"
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                backgroundColor: T.colors.statusRedBg,
                color: T.colors.statusRed,
                border: '1.5px solid #B91C1C',
                fontWeight: 700,
                fontSize: '0.88rem',
              }}
            >
              ✕ {errorMsg}
            </div>
          ) : null}

          {/* FORMULARIO AJUSTADO ESPECÍFICAMENTE POR ACTIVIDAD */}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
            {/* Parcela, Fecha y Clima */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              <div>
                <label
                  style={{ fontSize: '0.84rem', fontWeight: 700, color: T.colors.textPrimary }}
                >
                  Parcela de aplicación: *
                </label>
                <select
                  value={selectedParcel?.parcelId || ''}
                  onChange={(e) => onSelectParcel(e.target.value)}
                  className="field-input"
                  style={{ width: '100%', padding: '9px 10px', marginTop: 4 }}
                >
                  {parcels.map((p) => (
                    <option key={p.parcelId} value={p.parcelId}>
                      🌱 {p.parcelName || p.producerName} ({p.municipality} · {p.areaHectares} ha)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{ fontSize: '0.84rem', fontWeight: 700, color: T.colors.textPrimary }}
                >
                  Fecha de la labor realizada: *
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
                  <label
                    style={{ fontSize: '0.84rem', fontWeight: 700, color: T.colors.textPrimary }}
                  >
                    Condición del clima en campo:
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
                          backgroundColor:
                            weatherCondition === w
                              ? T.colors.primaryGreen
                              : T.colors.surfaceElevated,
                          color: weatherCondition === w ? '#FFFFFF' : T.colors.textPrimary,
                          border: `1px solid ${
                            weatherCondition === w ? T.colors.primaryGreen : T.colors.borderControl
                          }`,
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

            {/* CAMPOS AJUSTADOS DEPENDIENDO DE LA ACTIVIDAD */}
            {/* 1. MANEJO DE SOMBRA */}
            {activeActivityKey === 'MANEJO_SOMBRA' && (
              <div
                style={{
                  backgroundColor: T.colors.backgroundPrimary,
                  border: `1.5px solid ${T.colors.borderSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: T.colors.primaryGreen }}>
                  🌳 Parámetros Forestales y Cobertura de Dosel
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Especies de sombra intervenidas:
                    </label>
                    <select
                      value={shadeTreesTreated}
                      onChange={(e) => setShadeTreesTreated(e.target.value)}
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    >
                      <option value="Guamo (Inga jinicuil / edulis)">
                        Guamo (Inga jinicuil / edulis)
                      </option>
                      <option value="Cedro Rojo (Cedrela odorata)">
                        Cedro Rojo (Cedrela odorata)
                      </option>
                      <option value="Macuilí y Samán">Macuilí y Samán</option>
                      <option value="Madre Chontal y Plátano">Madre Chontal y Plátano</option>
                      <option value="Frutales nativos mixtos">Frutales nativos mixtos</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Cobertura de sombra objetivo resultante:
                    </label>
                    <select
                      value={targetShadePct}
                      onChange={(e) => setTargetShadePct(e.target.value)}
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    >
                      <option value="30% - 40% (Recomendado EUDR/SAT)">
                        30% - 40% (Recomendado Agroforestería)
                      </option>
                      <option value="20% - 30% (Luz alta)">20% - 30% (Luz alta)</option>
                      <option value="40% - 50% (Sombra densa)">40% - 50% (Sombra densa)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PODA DE CACAO */}
            {activeActivityKey === 'PODA_CACAO' && (
              <div
                style={{
                  backgroundColor: T.colors.backgroundPrimary,
                  border: `1.5px solid ${T.colors.borderSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: T.colors.primaryGreen }}>
                  ✂️ Modalidad de Poda y Manejo Sanitario
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Tipo principal de poda:
                    </label>
                    <select
                      value={pruningType}
                      onChange={(e) => setPruningType(e.target.value)}
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    >
                      <option value="Poda Fitosanitaria y Deschuponado">
                        Poda Fitosanitaria y Deschuponado
                      </option>
                      <option value="Poda de Formación (plantas 1-3 años)">
                        Poda de Formación (plantas 1-3 años)
                      </option>
                      <option value="Poda de Mantenimiento y Aclareo de Horquetas">
                        Poda de Mantenimiento y Aclareo
                      </option>
                      <option value="Poda de Rejuvenecimiento / Altura">
                        Poda de Rejuvenecimiento / Altura
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Cicatrizante aplicado a cortes mayores:
                    </label>
                    <select
                      value={healingApplied}
                      onChange={(e) => setHealingApplied(e.target.value)}
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    >
                      <option value="Pasta Bordelesa Cicatrizante">
                        Pasta Bordelesa Cicatrizante
                      </option>
                      <option value="Ceniza vegetal con cal hidratada">
                        Ceniza vegetal con cal hidratada
                      </option>
                      <option value="Cera vegetal selladora">Cera vegetal selladora</option>
                      <option value="Sin cortes gruesos (solo tijera)">
                        Sin cortes gruesos (solo tijera)
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CONTROL FITOSANITARIO / DESMOMIFICACIÓN */}
            {activeActivityKey === 'DESMOMIFICACION_FITOSANITARIA' && (
              <div
                style={{
                  backgroundColor: T.colors.backgroundPrimary,
                  border: `1.5px solid ${T.colors.borderSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: T.colors.primaryGreen }}>
                  🩺 Diagnóstico Fitosanitario y Disposición
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Hongo o problema fitosanitario:
                    </label>
                    <select
                      value={targetPest}
                      onChange={(e) => setTargetPest(e.target.value)}
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    >
                      <option value="Moniliasis (Moniliophthora roreri)">
                        Moniliasis (Moniliophthora roreri)
                      </option>
                      <option value="Escoba de Bruja (Moniliophthora perniciosa)">
                        Escoba de Bruja
                      </option>
                      <option value="Mancha Negra (Phytophthora spp.)">
                        Mancha Negra (Phytophthora)
                      </option>
                      <option value="Chinche mosquilla y barrenador">
                        Chinche mosquilla y barrenador
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Mazorcas enfermas removidas (estimado):
                    </label>
                    <input
                      type="text"
                      value={diseasedPodsRemoved}
                      onChange={(e) => setDiseasedPodsRemoved(e.target.value)}
                      placeholder="Ej. 120 mazorcas, 2 costales"
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    />
                  </div>

                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Disposición sanitaria del material:
                    </label>
                    <select
                      value={disposalMethod}
                      onChange={(e) => setDisposalMethod(e.target.value)}
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    >
                      <option value="Enterramiento bajo hojarasca con cal">
                        Enterramiento bajo hojarasca con cal
                      </option>
                      <option value="Compostaje caliente apartado">
                        Compostaje caliente apartado
                      </option>
                      <option value="Retiro y eliminación fuera de la finca">
                        Retiro y eliminación fuera de finca
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. NUTRICIÓN Y BIOFERTILIZACIÓN */}
            {activeActivityKey === 'FERTILIZACION_ORGANICA' && (
              <div
                style={{
                  backgroundColor: T.colors.backgroundPrimary,
                  border: `1.5px solid ${T.colors.borderSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: T.colors.primaryGreen }}>
                  🌱 Enriquecimiento y Método de Aplicación
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Método de incorporación al suelo:
                    </label>
                    <select
                      value={nutritionMethod}
                      onChange={(e) => setNutritionMethod(e.target.value)}
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    >
                      <option value="En corona bajo el goteo de la copa">
                        En corona bajo el goteo de copa
                      </option>
                      <option value="En bandas laterales al cacaotal">
                        En bandas laterales al cacaotal
                      </option>
                      <option value="Al voleo superficial sobre hojarasca">
                        Al voleo sobre hojarasca
                      </option>
                      <option value="Aspersión foliar líquida">Aspersión foliar líquida</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 5. CHAPEO Y COBERTURAS */}
            {activeActivityKey === 'CONTROL_MALEZAS' && (
              <div
                style={{
                  backgroundColor: T.colors.backgroundPrimary,
                  border: `1.5px solid ${T.colors.borderSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: T.colors.primaryGreen }}>
                  🌾 Técnica de Chapeo y Manejo de Rastrojo
                </div>
                <div>
                  <label
                    style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                  >
                    Método de chapeo:
                  </label>
                  <select
                    value={weedingMethod}
                    onChange={(e) => setWeedingMethod(e.target.value)}
                    className="field-input"
                    style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                  >
                    <option value="Chapeo manual bajo a ras con machete">
                      Chapeo manual bajo con machete
                    </option>
                    <option value="Chapeo mecánico con motoguadaña / hilo">
                      Chapeo mecánico con motoguadaña
                    </option>
                    <option value="Macheteo selectivo conservando leguminosas">
                      Macheteo selectivo de leguminosas
                    </option>
                  </select>
                </div>
              </div>
            )}

            {/* 6. RIEGO Y DRENAJE */}
            {activeActivityKey === 'RIEGO_DRENAJE' && (
              <div
                style={{
                  backgroundColor: T.colors.backgroundPrimary,
                  border: `1.5px solid ${T.colors.borderSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: T.colors.primaryGreen }}>
                  💧 Obra de Drenaje e Infraestructura Hídrica
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Intervención hídrica:
                    </label>
                    <select
                      value={drainType}
                      onChange={(e) => setDrainType(e.target.value)}
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    >
                      <option value="Zanja principal colectora">Zanja principal colectora</option>
                      <option value="Sangría menor entre hileras">
                        Sangría menor entre hileras
                      </option>
                      <option value="Riego de auxilio por goteo">Riego de auxilio por goteo</option>
                      <option value="Limpieza de alcantarilla parcelaria">
                        Limpieza de alcantarilla parcelaria
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Metros lineales limpiados / zanjados:
                    </label>
                    <input
                      type="text"
                      value={drainMeters}
                      onChange={(e) => setDrainMeters(e.target.value)}
                      placeholder="Ej. 150 metros"
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. APLICACIÓN DE BIOINSUMO */}
            {activeActivityKey === 'APLICACION_BIOINSUMO' && (
              <div
                style={{
                  backgroundColor: T.colors.backgroundPrimary,
                  border: `1.5px solid ${T.colors.borderSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: T.colors.primaryGreen }}>
                  🧪 Formulación Mineral y Biopreparado
                </div>
                <div>
                  <label
                    style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                  >
                    Biopreparado autorizado:
                  </label>
                  <select
                    value={bioPreparation}
                    onChange={(e) => setBioPreparation(e.target.value)}
                    className="field-input"
                    style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                  >
                    <option value="Caldo Bordelés 1% (Sulfato de cobre + Cal)">
                      Caldo Bordelés 1% (Cobre + Cal)
                    </option>
                    <option value="Caldo Sulfocálcico (Azufre + Cal)">
                      Caldo Sulfocálcico (Azufre + Cal)
                    </option>
                    <option value="Extracto vegetal de Neem + Ajo">
                      Extracto vegetal de Neem + Ajo
                    </option>
                    <option value="Biol enriquecido con microorganismos de montaña">
                      Biol enriquecido con MM
                    </option>
                  </select>
                </div>
              </div>
            )}

            {/* 8. INSPECCIÓN DE FLORACIÓN */}
            {activeActivityKey === 'INSPECCION_FLORACION' && (
              <div
                style={{
                  backgroundColor: T.colors.backgroundPrimary,
                  border: `1.5px solid ${T.colors.borderSubtle}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: T.colors.primaryGreen }}>
                  🔍 Evaluación de Cojines Florales y Cuajado
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Intensidad de floración observada:
                    </label>
                    <select
                      value={flowerIntensity}
                      onChange={(e) => setFlowerIntensity(e.target.value)}
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    >
                      <option value="Alta (Cojines abundantes en tronco y ramas)">
                        Alta (Cojines abundantes)
                      </option>
                      <option value="Media - Regular">Media - Regular</option>
                      <option value="Baja / Inicio de brotación">Baja / Inicio de brotación</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                    >
                      Chilillos cuajados promedio por árbol:
                    </label>
                    <input
                      type="text"
                      value={chilillosEstimated}
                      onChange={(e) => setChilillosEstimated(e.target.value)}
                      placeholder="Ej. 15 a 20 chilillos"
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Insumos y Dosis (si aplica a la actividad o por toggle) */}
            {(toggles.enable_inputs_used || currentActivityDef.requires_inputs) && (
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
                  📦 Insumo Utilizado y Dosis
                </div>

                {inputsCatalog.length > 0 ? (
                  <div>
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: T.colors.textSecondary,
                        marginBottom: 6,
                      }}
                    >
                      Insumos sugeridos disponibles:
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

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 10,
                  }}
                >
                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 600, color: T.colors.textPrimary }}
                    >
                      Insumo o material aplicado:
                    </label>
                    <input
                      type="text"
                      value={inputUsed}
                      onChange={(e) => setInputUsed(e.target.value)}
                      placeholder="Ej. Composta de cacao, Harina de rocas, Caldo bordelés"
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    />
                  </div>

                  {(toggles.enable_doses || currentActivityDef.requires_dose) && (
                    <div>
                      <label
                        style={{ fontSize: '0.8rem', fontWeight: 600, color: T.colors.textPrimary }}
                      >
                        Dosis aplicada por árbol o hectárea:
                      </label>
                      <input
                        type="text"
                        value={dose}
                        onChange={(e) => setDose(e.target.value)}
                        placeholder="Ej. 2 kg/árbol, 500 ml/mochila 20L"
                        className="field-input"
                        style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mano de obra y costos */}
            {toggles.enable_labor_and_costs && (
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
                  ⏱️ Jornales y Costos Invertidos (Opcional)
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 10,
                  }}
                >
                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 600, color: T.colors.textPrimary }}
                    >
                      Horas de labor:
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={laborHours}
                      onChange={(e) => setLaborHours(e.target.value)}
                      placeholder="Ej. 6"
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    />
                  </div>
                  <div>
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 600, color: T.colors.textPrimary }}
                    >
                      Número de jornaleros:
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
                    <label
                      style={{ fontSize: '0.8rem', fontWeight: 600, color: T.colors.textPrimary }}
                    >
                      Costo total (MXN):
                    </label>
                    <input
                      type="number"
                      step="50"
                      min="0"
                      value={costMxn}
                      onChange={(e) => setCostMxn(e.target.value)}
                      placeholder="Ej. 800"
                      className="field-input"
                      style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notas y chips contextuales */}
            <div>
              <label style={{ fontSize: '0.84rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Notas y observaciones de campo: *
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 8px' }}>
                {quickNotesList.map((txt) => (
                  <button
                    key={txt}
                    type="button"
                    onClick={() => setNotes((prev) => (prev ? `${prev}. ${txt}` : txt))}
                    style={{
                      fontSize: '0.74rem',
                      padding: '4px 10px',
                      borderRadius: 14,
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      color: '#B45309',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ {txt}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Describe qué parte de la parcela se trabajó, árboles intervenidos o avances en ${currentActivityDef.name}...`}
                className="field-input"
                style={{ width: '100%', padding: '10px 12px' }}
                required
              />
            </div>

            {/* Fotos de Evidencia */}
            {toggles.enable_photos && (
              <div>
                <label
                  style={{ fontSize: '0.84rem', fontWeight: 700, color: T.colors.textPrimary }}
                >
                  Fotografías de respaldo en campo ({photos.length}):
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
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  backgroundColor: T.colors.primaryGreen,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(20, 69, 38, 0.2)',
                }}
              >
                🌱 Guardar Registro de {currentActivityDef.name}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('hub')}
                style={{
                  padding: '14px 20px',
                  backgroundColor: T.colors.backgroundPrimary,
                  border: `1.5px solid ${T.colors.borderControl}`,
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: T.colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ============================================================== */}
      {/* VISTA 3: HISTORIAL DE ACTIVIDADES CON AUDITORÍA Y FILTROS       */}
      {/* ============================================================== */}
      {viewMode === 'history' && (
        <section
          aria-labelledby="logbook-history-heading"
          style={{
            backgroundColor: T.colors.surfaceCard,
            border: `1.5px solid ${T.colors.borderSubtle}`,
            borderRadius: 14,
            padding: 24,
            display: 'grid',
            gap: 18,
          }}
        >
          {/* Barra superior de navegación */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                setViewMode('hub');
              }}
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                border: `1.5px solid ${T.colors.borderSubtle}`,
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: T.colors.primaryGreen,
                cursor: 'pointer',
              }}
            >
              ← Volver a Bitácora
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              style={{
                padding: '8px 16px',
                backgroundColor: T.colors.surfaceElevated,
                border: `1.5px solid ${T.colors.borderControl}`,
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

          <div>
            <h1
              id="logbook-history-heading"
              style={{
                margin: 0,
                fontSize: '1.4rem',
                fontFamily: 'var(--font-serif)',
                color: T.colors.primaryGreen,
              }}
            >
              📖 Historial Completo de Labores ({displayedLogs.length})
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: T.colors.textSecondary }}>
              Auditoría cronológica de labores agronómicas, costos, jornales e insumos por cacaotal.
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
              ✓ {successMsg}
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
              ✕ {errorMsg}
            </div>
          ) : null}

          {/* Filtros de Historial */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 10,
              backgroundColor: T.colors.backgroundPrimary,
              padding: 14,
              borderRadius: 10,
              border: `1px solid ${T.colors.borderSubtle}`,
            }}
          >
            <div>
              <label
                style={{ fontSize: '0.78rem', fontWeight: 600, color: T.colors.textSecondary }}
              >
                Filtrar por parcela:
              </label>
              <select
                value={filterParcelId}
                onChange={(e) => setFilterParcelId(e.target.value)}
                className="field-input"
                style={{ width: '100%', padding: '7px 8px', marginTop: 3, fontSize: '0.82rem' }}
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
                style={{ fontSize: '0.78rem', fontWeight: 600, color: T.colors.textSecondary }}
              >
                Filtrar por actividad:
              </label>
              <select
                value={filterActivityType}
                onChange={(e) => setFilterActivityType(e.target.value)}
                className="field-input"
                style={{ width: '100%', padding: '7px 8px', marginTop: 3, fontSize: '0.82rem' }}
              >
                <option value="ALL">Todas las actividades</option>
                {activitiesCatalog.map((a) => (
                  <option key={a.activity_key} value={a.activity_key}>
                    {a.icon} {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{ fontSize: '0.78rem', fontWeight: 600, color: T.colors.textSecondary }}
              >
                Buscar productor / texto:
              </label>
              <input
                type="text"
                value={filterProducerQuery}
                onChange={(e) => setFilterProducerQuery(e.target.value)}
                placeholder="Nombre o palabra..."
                className="field-input"
                style={{ width: '100%', padding: '7px 8px', marginTop: 3, fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label
                style={{ fontSize: '0.78rem', fontWeight: 600, color: T.colors.textSecondary }}
              >
                Desde:
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="field-input"
                style={{ width: '100%', padding: '6px 8px', marginTop: 3, fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label
                style={{ fontSize: '0.78rem', fontWeight: 600, color: T.colors.textSecondary }}
              >
                Hasta:
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="field-input"
                style={{ width: '100%', padding: '6px 8px', marginTop: 3, fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {(filterParcelId !== 'ALL' ||
            filterActivityType !== 'ALL' ||
            filterProducerQuery ||
            filterStartDate ||
            filterEndDate) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setFilterParcelId('ALL');
                  setFilterActivityType('ALL');
                  setFilterProducerQuery('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                style={{
                  fontSize: '0.8rem',
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  color: '#4B5563',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🔄 Limpiar filtros
              </button>
            </div>
          )}

          {/* Tarjetas de Registros de Historial */}
          {displayedLogs.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: T.colors.backgroundPrimary,
                borderRadius: 10,
                color: T.colors.textSecondary,
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: T.colors.textPrimary }}>
                No hay labores registradas con estos filtros.
              </div>
              <p style={{ margin: '4px 0 16px', fontSize: '0.85rem' }}>
                Prueba ajustando los filtros o registra una nueva labor desde el catálogo.
              </p>
              <button
                type="button"
                onClick={() => setViewMode('hub')}
                style={{
                  backgroundColor: T.colors.primaryGreen,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + Registrar Nueva Labor
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {displayedLogs.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1.5px solid ${T.colors.borderSubtle}`,
                    borderRadius: 12,
                    padding: 18,
                    display: 'grid',
                    gap: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          color: T.colors.primaryGreen,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {entry.activityLabel || entry.activityType}
                      </div>
                      <div
                        style={{ fontSize: '0.84rem', color: T.colors.textSecondary, marginTop: 2 }}
                      >
                        🌱 <strong>{entry.parcelName || 'Parcela'}</strong>
                        {entry.producerName ? ` · Productor: ${entry.producerName}` : ''}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 2 }}>
                        📅 Realizado el {formatDisplayDateEs(entry.performedDate)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setEditingEntry(entry)}
                        style={{
                          backgroundColor: '#F3F4F6',
                          border: '1px solid #D1D5DB',
                          color: '#374151',
                          padding: '5px 10px',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry)}
                        style={{
                          backgroundColor: '#FEE2E2',
                          border: '1px solid #FCA5A5',
                          color: '#B91C1C',
                          padding: '5px 10px',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Badges de Dosis, Jornales, Costos y Clima */}
                  {(entry.dose ||
                    entry.laborHours ||
                    entry.workersCount ||
                    entry.costMxn ||
                    entry.weatherCondition) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '2px 0' }}>
                      {entry.dose ? (
                        <span
                          style={{
                            fontSize: '0.76rem',
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: '#E0F2FE',
                            color: '#0369A1',
                            fontWeight: 600,
                          }}
                        >
                          ⚖️ Dosis: {entry.dose}
                        </span>
                      ) : null}
                      {entry.laborHours || entry.workersCount ? (
                        <span
                          style={{
                            fontSize: '0.76rem',
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: '#F3E8FF',
                            color: '#7E22CE',
                            fontWeight: 600,
                          }}
                        >
                          ⏱️ {entry.laborHours ? `${entry.laborHours}h` : ''}
                          {entry.workersCount ? ` · 👥 ${entry.workersCount} jornaleros` : ''}
                        </span>
                      ) : null}
                      {entry.costMxn ? (
                        <span
                          style={{
                            fontSize: '0.76rem',
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: '#DCFCE7',
                            color: '#15803D',
                            fontWeight: 700,
                          }}
                        >
                          💰 ${entry.costMxn} MXN
                        </span>
                      ) : null}
                      {entry.weatherCondition ? (
                        <span
                          style={{
                            fontSize: '0.76rem',
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: '#FEF3C7',
                            color: '#B45309',
                            fontWeight: 600,
                          }}
                        >
                          ⛅ Clima: {entry.weatherCondition}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {entry.inputUsed ? (
                    <div style={{ fontSize: '0.82rem', color: T.colors.textPrimary }}>
                      📦 Insumo: <strong>{entry.inputUsed}</strong>
                    </div>
                  ) : null}

                  {entry.notes ? (
                    <div
                      style={{
                        fontSize: '0.86rem',
                        color: '#374151',
                        backgroundColor: '#F9FAFB',
                        padding: '8px 12px',
                        borderRadius: 8,
                        lineHeight: 1.45,
                      }}
                    >
                      {entry.notes}
                    </div>
                  ) : null}

                  {entry.photos && entry.photos.length > 0 ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {entry.photos.map((p) => (
                        <img
                          key={p.id}
                          src={p.previewDataUrl}
                          alt={p.fileName}
                          style={{
                            width: 80,
                            height: 60,
                            objectFit: 'cover',
                            borderRadius: 6,
                            border: '1px solid #E5E7EB',
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* MODAL REACTIVO DE EDICIÓN                                      */}
      {/* ============================================================== */}
      {editingEntry && (
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
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 24,
              maxWidth: 520,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              display: 'grid',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: T.colors.primaryGreen }}>
                ✏️ Editar Registro de Bitácora
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditEntrySubmit} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Labor / Actividad:
                </label>
                <input
                  type="text"
                  value={editingEntry.activityLabel || editingEntry.activityType}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, activityLabel: e.target.value })
                  }
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Fecha realizada:
                </label>
                <input
                  type="date"
                  value={editingEntry.performedDate}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, performedDate: e.target.value })
                  }
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label
                    style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                  >
                    Insumo:
                  </label>
                  <input
                    type="text"
                    value={editingEntry.inputUsed || ''}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, inputUsed: e.target.value })
                    }
                    className="field-input"
                    style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label
                    style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}
                  >
                    Dosis:
                  </label>
                  <input
                    type="text"
                    value={editingEntry.dose || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, dose: e.target.value })}
                    className="field-input"
                    style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label
                    style={{ fontSize: '0.76rem', fontWeight: 700, color: T.colors.textPrimary }}
                  >
                    Horas:
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingEntry.laborHours ?? ''}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        laborHours: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="field-input"
                    style={{ width: '100%', padding: '6px 8px', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label
                    style={{ fontSize: '0.76rem', fontWeight: 700, color: T.colors.textPrimary }}
                  >
                    Jornaleros:
                  </label>
                  <input
                    type="number"
                    value={editingEntry.workersCount ?? ''}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        workersCount: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                    className="field-input"
                    style={{ width: '100%', padding: '6px 8px', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label
                    style={{ fontSize: '0.76rem', fontWeight: 700, color: T.colors.textPrimary }}
                  >
                    Costo MXN:
                  </label>
                  <input
                    type="number"
                    value={editingEntry.costMxn ?? ''}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        costMxn: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="field-input"
                    style={{ width: '100%', padding: '6px 8px', marginTop: 4 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Notas y descripción:
                </label>
                <textarea
                  rows={3}
                  value={editingEntry.notes || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, notes: e.target.value })}
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  style={{
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    backgroundColor: T.colors.primaryGreen,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {savingEdit ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
