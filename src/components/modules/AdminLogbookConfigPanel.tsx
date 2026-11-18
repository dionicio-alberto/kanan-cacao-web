'use client';

import React, { useEffect, useState } from 'react';
import {
  deleteLogbookActivityAdminLive,
  deleteLogbookCustomFieldAdminLive,
  deleteLogbookInputAdminLive,
  fetchAdminLogbookConfigLive,
  updateLogbookTogglesAdminLive,
  upsertLogbookActivityAdminLive,
  upsertLogbookCustomFieldAdminLive,
  upsertLogbookInputAdminLive,
} from '@/services/geoEngineLiveClient';
import { AuthenticatedOperatorProfile } from '@/services/supabaseClient';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import {
  LogbookActivityCatalogItem,
  LogbookCustomFieldItem,
  LogbookFeatureToggles,
  LogbookFullConfigBundle,
  LogbookInputCatalogItem,
} from '@/types/adminDomain';

interface AdminLogbookConfigPanelProps {
  operatorProfile: AuthenticatedOperatorProfile;
}

const DEFAULT_TOGGLES: LogbookFeatureToggles = {
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
};

export default function AdminLogbookConfigPanel({
  operatorProfile,
}: AdminLogbookConfigPanelProps) {
  const [configBundle, setConfigBundle] = useState<LogbookFullConfigBundle | null>(null);
  const [toggles, setToggles] = useState<LogbookFeatureToggles>(DEFAULT_TOGGLES);
  const [loading, setLoading] = useState(true);
  const [savingToggles, setSavingToggles] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal / Form state for Activity
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Partial<LogbookActivityCatalogItem> | null>(
    null,
  );
  const [savingActivity, setSavingActivity] = useState(false);

  // Modal / Form state for Input
  const [showInputModal, setShowInputModal] = useState(false);
  const [editingInput, setEditingInput] = useState<Partial<LogbookInputCatalogItem> | null>(null);
  const [savingInput, setSavingInput] = useState(false);

  // Modal / Form state for Custom Field
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<Partial<LogbookCustomFieldItem> | null>(null);
  const [savingField, setSavingField] = useState(false);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminLogbookConfigLive({
        requesterRole: operatorProfile.role,
        accessToken: operatorProfile.accessToken,
      });
      setConfigBundle(data);
      if (data.config) {
        setToggles(data.config);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la configuración de bitácora del servidor.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [operatorProfile.role, operatorProfile.accessToken]);

  const handleSaveToggles = async () => {
    setSavingToggles(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const updated = await updateLogbookTogglesAdminLive(toggles, {
        requesterRole: operatorProfile.role,
        accessToken: operatorProfile.accessToken,
        changedBy: operatorProfile.fullName,
      });
      setConfigBundle(updated);
      setToggles(updated.config);
      setStatusMsg(
        `Preferencias de bitácora guardadas correctamente (Versión ${updated.config.version}).`,
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Error al actualizar las opciones de la bitácora.',
      );
    } finally {
      setSavingToggles(false);
    }
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity?.name || !editingActivity?.activity_key) {
      setErrorMsg('El identificador y el nombre de la actividad son obligatorios.');
      return;
    }
    setSavingActivity(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const updated = await upsertLogbookActivityAdminLive(editingActivity, {
        requesterRole: operatorProfile.role,
        accessToken: operatorProfile.accessToken,
        changedBy: operatorProfile.fullName,
      });
      setConfigBundle(updated);
      setShowActivityModal(false);
      setEditingActivity(null);
      setStatusMsg(`Actividad "${editingActivity.name}" guardada en el catálogo.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al guardar la actividad.',
      );
    } finally {
      setSavingActivity(false);
    }
  };

  const handleDeleteActivity = async (act: LogbookActivityCatalogItem) => {
    const confirmMsg = `¿Deseas archivar o eliminar la actividad "${act.name}"? Si tiene registros en el historial histórico de bitácoras, se archivará de forma inteligente para preservar la auditoría.`;
    if (!window.confirm(confirmMsg)) return;

    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const res = await deleteLogbookActivityAdminLive(act.activity_key, {
        requesterRole: operatorProfile.role,
        accessToken: operatorProfile.accessToken,
      });
      setConfigBundle(res.full_config);
      if (res.action === 'ARCHIVED') {
        setStatusMsg(
          `Actividad "${act.name}" archivada de forma inteligente (${res.referenced_logs_count} registros históricos preservados).`,
        );
      } else {
        setStatusMsg(`Actividad "${act.name}" eliminada permanentemente del catálogo.`);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al eliminar la actividad.',
      );
    }
  };

  const handleSaveInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInput?.name || !editingInput?.input_key) {
      setErrorMsg('El identificador y el nombre del insumo son obligatorios.');
      return;
    }
    setSavingInput(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const updated = await upsertLogbookInputAdminLive(editingInput, {
        requesterRole: operatorProfile.role,
        accessToken: operatorProfile.accessToken,
        changedBy: operatorProfile.fullName,
      });
      setConfigBundle(updated);
      setShowInputModal(false);
      setEditingInput(null);
      setStatusMsg(`Insumo "${editingInput.name}" guardado.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al guardar el insumo.',
      );
    } finally {
      setSavingInput(false);
    }
  };

  const handleDeleteInput = async (inp: LogbookInputCatalogItem) => {
    if (!window.confirm(`¿Deseas eliminar el insumo sugerido "${inp.name}"?`)) return;
    try {
      const res = await deleteLogbookInputAdminLive(inp.input_key, {
        requesterRole: operatorProfile.role,
        accessToken: operatorProfile.accessToken,
      });
      setConfigBundle(res.full_config);
      setStatusMsg(
        res.action === 'ARCHIVED'
          ? `Insumo "${inp.name}" archivado de forma inteligente.`
          : `Insumo "${inp.name}" eliminado del catálogo.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al eliminar el insumo.');
    }
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField?.label || !editingField?.field_key) {
      setErrorMsg('La clave y etiqueta del campo son obligatorias.');
      return;
    }
    setSavingField(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const updated = await upsertLogbookCustomFieldAdminLive(editingField, {
        requesterRole: operatorProfile.role,
        accessToken: operatorProfile.accessToken,
        changedBy: operatorProfile.fullName,
      });
      setConfigBundle(updated);
      setShowFieldModal(false);
      setEditingField(null);
      setStatusMsg(`Campo personalizado "${editingField.label}" guardado.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al guardar el campo personalizado.',
      );
    } finally {
      setSavingField(false);
    }
  };

  const handleDeleteField = async (fld: LogbookCustomFieldItem) => {
    if (!window.confirm(`¿Deseas eliminar el campo personalizado "${fld.label}"?`)) return;
    try {
      const res = await deleteLogbookCustomFieldAdminLive(fld.field_key, {
        requesterRole: operatorProfile.role,
        accessToken: operatorProfile.accessToken,
      });
      setConfigBundle(res.full_config);
      setStatusMsg(
        res.action === 'ARCHIVED'
          ? `Campo "${fld.label}" archivado de forma inteligente.`
          : `Campo "${fld.label}" eliminado del catálogo.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al eliminar el campo.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: T.colors.textSecondary }}>
        Cargando motor de configuración de bitácora...
      </div>
    );
  }

  const activities = configBundle?.activities || [];
  const inputs = configBundle?.inputs || [];
  const customFields = configBundle?.custom_fields || [];

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {statusMsg ? (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            backgroundColor: T.colors.statusGreenBg,
            border: '1.5px solid #15803D',
            color: T.colors.statusGreen,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          {statusMsg}
        </div>
      ) : null}

      {errorMsg ? (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: T.colors.statusRedBg,
            border: '1.5px solid #B91C1C',
            color: T.colors.statusRed,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      {/* 1. SECCIÓN: INTERRUPTORES GENERALES */}
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
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: T.colors.primaryGreen }}>
              ⚙️ Funciones e Interruptores Activos en Bitácora
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: T.colors.textSecondary }}>
              Controla qué funciones y campos están visibles para los productores tanto en la versión Web como en la App Móvil.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveToggles}
            disabled={savingToggles}
            className="btn-primary"
            style={{
              padding: '8px 18px',
              backgroundColor: T.colors.primaryGreen,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            {savingToggles ? 'Guardando...' : '💾 Guardar preferencias'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          {/* Toggle Mano de obra y costos */}
          <div
            style={{
              padding: 14,
              backgroundColor: toggles.enable_labor_and_costs ? '#F0FDF4' : T.colors.backgroundPrimary,
              border: `1.5px solid ${toggles.enable_labor_and_costs ? '#86EFAC' : T.colors.borderSubtle}`,
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: T.colors.textPrimary, fontSize: '0.92rem' }}>
                💰 Mano de Obra y Costos
              </div>
              <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary, marginTop: 2 }}>
                Registro de horas invertidas, número de jornaleros y costo en MXN.
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Activar registro de mano de obra y costos"
              checked={toggles.enable_labor_and_costs}
              onChange={(e) => setToggles((prev) => ({ ...prev, enable_labor_and_costs: e.target.checked }))}
              style={{ width: 22, height: 22, accentColor: T.colors.primaryGreen, cursor: 'pointer' }}
            />
          </div>

          {/* Toggle Insumos utilizados */}
          <div
            style={{
              padding: 14,
              backgroundColor: toggles.enable_inputs_used ? '#F0FDF4' : T.colors.backgroundPrimary,
              border: `1.5px solid ${toggles.enable_inputs_used ? '#86EFAC' : T.colors.borderSubtle}`,
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: T.colors.textPrimary, fontSize: '0.92rem' }}>
                🌱 Insumos y Biofertilizantes
              </div>
              <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary, marginTop: 2 }}>
                Permite seleccionar o registrar insumos orgánicos aplicados.
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Activar registro de insumos"
              checked={toggles.enable_inputs_used}
              onChange={(e) => setToggles((prev) => ({ ...prev, enable_inputs_used: e.target.checked }))}
              style={{ width: 22, height: 22, accentColor: T.colors.primaryGreen, cursor: 'pointer' }}
            />
          </div>

          {/* Toggle Dosis */}
          <div
            style={{
              padding: 14,
              backgroundColor: toggles.enable_doses ? '#F0FDF4' : T.colors.backgroundPrimary,
              border: `1.5px solid ${toggles.enable_doses ? '#86EFAC' : T.colors.borderSubtle}`,
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: T.colors.textPrimary, fontSize: '0.92rem' }}>
                ⚖️ Dosis de Aplicación
              </div>
              <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary, marginTop: 2 }}>
                Especifica cantidad aplicada (ej. kg/árbol, L/mochila).
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Activar dosis de aplicación"
              checked={toggles.enable_doses}
              onChange={(e) => setToggles((prev) => ({ ...prev, enable_doses: e.target.checked }))}
              style={{ width: 22, height: 22, accentColor: T.colors.primaryGreen, cursor: 'pointer' }}
            />
          </div>

          {/* Toggle Fotos */}
          <div
            style={{
              padding: 14,
              backgroundColor: toggles.enable_photos ? '#F0FDF4' : T.colors.backgroundPrimary,
              border: `1.5px solid ${toggles.enable_photos ? '#86EFAC' : T.colors.borderSubtle}`,
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: T.colors.textPrimary, fontSize: '0.92rem' }}>
                📸 Fotografías de Evidencia
              </div>
              <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary, marginTop: 2 }}>
                Permite adjuntar fotos capturadas en campo.
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Activar fotos de evidencia"
              checked={toggles.enable_photos}
              onChange={(e) => setToggles((prev) => ({ ...prev, enable_photos: e.target.checked }))}
              style={{ width: 22, height: 22, accentColor: T.colors.primaryGreen, cursor: 'pointer' }}
            />
          </div>

          {/* Toggle Clima */}
          <div
            style={{
              padding: 14,
              backgroundColor: toggles.enable_weather_conditions ? '#F0FDF4' : T.colors.backgroundPrimary,
              border: `1.5px solid ${toggles.enable_weather_conditions ? '#86EFAC' : T.colors.borderSubtle}`,
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: T.colors.textPrimary, fontSize: '0.92rem' }}>
                🌦️ Condición Climática
              </div>
              <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary, marginTop: 2 }}>
                Registro de clima al realizar la labor (Lluvioso, Nublado, Soleado).
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Activar condición climática"
              checked={toggles.enable_weather_conditions}
              onChange={(e) => setToggles((prev) => ({ ...prev, enable_weather_conditions: e.target.checked }))}
              style={{ width: 22, height: 22, accentColor: T.colors.primaryGreen, cursor: 'pointer' }}
            />
          </div>

          {/* Toggle Campos personalizados */}
          <div
            style={{
              padding: 14,
              backgroundColor: toggles.enable_custom_fields ? '#F0FDF4' : T.colors.backgroundPrimary,
              border: `1.5px solid ${toggles.enable_custom_fields ? '#86EFAC' : T.colors.borderSubtle}`,
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: T.colors.textPrimary, fontSize: '0.92rem' }}>
                🏷️ Campos Personalizados Dinámicos
              </div>
              <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary, marginTop: 2 }}>
                Habilita preguntas específicas añadidas por la administración.
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Activar campos personalizados"
              checked={toggles.enable_custom_fields}
              onChange={(e) => setToggles((prev) => ({ ...prev, enable_custom_fields: e.target.checked }))}
              style={{ width: 22, height: 22, accentColor: T.colors.primaryGreen, cursor: 'pointer' }}
            />
          </div>
        </div>
      </section>

      {/* 2. SECCIÓN: CATÁLOGO DE ACTIVIDADES AGRONÓMICAS */}
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
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: T.colors.primaryGreen }}>
              📋 Catálogo de Actividades Agronómicas ({activities.length})
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: T.colors.textSecondary }}>
              Activa, desactiva, edita o agrega opciones de trabajo parcelario. La cosecha y el acopio se gestionan de forma independiente en la mesa de recepción.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingActivity({
                activity_key: '',
                name: '',
                category: 'MANEJO_CULTIVO',
                icon: '📋',
                description: '',
                requires_inputs: false,
                requires_dose: false,
                is_active: true,
                sort_order: activities.length + 1,
              });
              setShowActivityModal(true);
            }}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              backgroundColor: T.colors.surfaceElevated,
              borderColor: T.colors.borderControl,
              color: T.colors.earthCacao,
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            ➕ Nueva Actividad
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {activities.map((act) => (
            <div
              key={act.activity_key}
              style={{
                backgroundColor: act.is_archived
                  ? '#F9FAFB'
                  : act.is_active
                  ? T.colors.backgroundPrimary
                  : '#FFFBEB',
                border: `1px solid ${act.is_archived ? '#E5E7EB' : T.colors.borderSubtle}`,
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                opacity: act.is_archived ? 0.65 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.8rem' }}>{act.icon}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: T.colors.textPrimary }}>
                      {act.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: 12,
                        backgroundColor: act.is_archived
                          ? '#9CA3AF'
                          : act.is_active
                          ? '#DCFCE7'
                          : '#FEF3C7',
                        color: act.is_archived ? '#FFFFFF' : act.is_active ? '#15803D' : '#B45309',
                        fontWeight: 700,
                      }}
                    >
                      {act.is_archived ? 'Archivada' : act.is_active ? 'Activa' : 'Pausada'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: T.colors.textSecondary }}>
                      [{act.category}]
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: T.colors.textSecondary, maxWidth: 580 }}>
                    {act.description}
                  </p>
                  <div style={{ fontSize: '0.74rem', color: T.colors.earthCacao, marginTop: 4, display: 'flex', gap: 10 }}>
                    {act.requires_inputs ? <span>🌱 Insumos obligatorios</span> : null}
                    {act.requires_dose ? <span>⚖️ Dosis obligatoria</span> : null}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingActivity(act);
                    setShowActivityModal(true);
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
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
                  onClick={() => handleDeleteActivity(act)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    backgroundColor: T.colors.statusRedBg,
                    border: '1px solid #FCA5A5',
                    color: T.colors.statusRed,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Archivar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SECCIÓN: INSUMOS SUGERIDOS */}
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
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: T.colors.primaryGreen }}>
              🧪 Catálogo de Insumos Sugeridos ({inputs.length})
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: T.colors.textSecondary }}>
              Lista de biofertilizantes, enmiendas orgánicas y caldos minerales autorizados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingInput({
                input_key: '',
                name: '',
                type: 'BIOFERTILIZANTE_LIQUIDO',
                default_unit: 'L/ha',
                is_organic_certified: true,
                is_active: true,
                sort_order: inputs.length + 1,
              });
              setShowInputModal(true);
            }}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              backgroundColor: T.colors.surfaceElevated,
              borderColor: T.colors.borderControl,
              color: T.colors.earthCacao,
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            ➕ Nuevo Insumo
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {inputs.map((inp) => (
            <div
              key={inp.input_key}
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                border: `1px solid ${T.colors.borderSubtle}`,
                borderRadius: 8,
                padding: 12,
                display: 'grid',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 700, color: T.colors.textPrimary, fontSize: '0.88rem' }}>
                  {inp.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteInput(inp)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: T.colors.statusRed }}
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
                Unidad típica: <strong>{inp.default_unit}</strong> · {inp.is_organic_certified ? '🌿 Certificado Orgánico' : 'Insumo Convencional'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. CAMPOS PERSONALIZADOS */}
      <section
        style={{
          backgroundColor: T.colors.surfaceCard,
          border: `1px solid ${T.colors.borderSubtle}`,
          borderRadius: 12,
          padding: 20,
          display: 'grid',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: T.colors.textPrimary, fontSize: '1.05rem', fontWeight: 800 }}>
              🏷️ Campos Dinámicos Personalizados ({customFields.length})
            </h3>
            <p style={{ margin: '4px 0 0', color: T.colors.textSecondary, fontSize: '0.82rem' }}>
              Extiende el formulario de bitácora con preguntas personalizadas para actividades específicas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingField({
                field_key: '',
                label: '',
                field_type: 'TEXT',
                options: [],
                required: false,
                is_active: true,
                is_archived: false,
                sort_order: customFields.length + 1,
              });
              setShowFieldModal(true);
            }}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              backgroundColor: T.colors.surfaceElevated,
              borderColor: T.colors.borderControl,
              color: T.colors.earthCacao,
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            ➕ Nuevo Campo
          </button>
        </div>

        {customFields.length === 0 ? (
          <div style={{ padding: 12, color: T.colors.textSecondary, fontSize: '0.85rem' }}>
            No hay campos adicionales configurados. Los formularios usan la estructura estándar.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {customFields.map((fld) => (
              <div
                key={fld.field_key}
                style={{
                  backgroundColor: T.colors.backgroundPrimary,
                  border: `1px solid ${T.colors.borderSubtle}`,
                  borderRadius: 8,
                  padding: 12,
                  display: 'grid',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 700, color: T.colors.textPrimary, fontSize: '0.88rem' }}>
                    {fld.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteField(fld)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: T.colors.statusRed }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
                  Tipo: <strong>{fld.field_type}</strong> · {fld.required ? 'Obligatorio' : 'Opcional'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. MODAL ACTIVIDAD */}
      {showActivityModal && editingActivity ? (
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
            onSubmit={handleSaveActivity}
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
              {editingActivity.activity_key ? 'Editar Actividad' : 'Nueva Actividad Agronómica'}
            </h3>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Clave de actividad (ej. PODA_CACAO):
              </label>
              <input
                type="text"
                value={editingActivity.activity_key || ''}
                onChange={(e) =>
                  setEditingActivity((prev) => ({ ...prev, activity_key: e.target.value }))
                }
                className="field-input"
                style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Nombre visible:
              </label>
              <input
                type="text"
                value={editingActivity.name || ''}
                onChange={(e) =>
                  setEditingActivity((prev) => ({ ...prev, name: e.target.value }))
                }
                className="field-input"
                style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Ícono:
                </label>
                <input
                  type="text"
                  value={editingActivity.icon || '📋'}
                  onChange={(e) =>
                    setEditingActivity((prev) => ({ ...prev, icon: e.target.value }))
                  }
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Categoría:
                </label>
                <select
                  value={editingActivity.category || 'MANEJO_CULTIVO'}
                  onChange={(e) =>
                    setEditingActivity((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                >
                  <option value="MANEJO_CULTIVO">Manejo de Cultivo</option>
                  <option value="AGROFORESTERIA">Agroforestería</option>
                  <option value="FITOSANIDAD">Fitosanidad</option>
                  <option value="NUTRICION">Nutrición y Abono</option>
                  <option value="INFRAESTRUCTURA">Infraestructura</option>
                  <option value="MONITOREO">Monitoreo</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Descripción y Guía Técnica:
              </label>
              <textarea
                value={editingActivity.description || ''}
                onChange={(e) =>
                  setEditingActivity((prev) => ({ ...prev, description: e.target.value }))
                }
                className="field-input"
                rows={3}
                style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(editingActivity.requires_inputs)}
                  onChange={(e) =>
                    setEditingActivity((prev) => ({ ...prev, requires_inputs: e.target.checked }))
                  }
                />
                Requiere insumos
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(editingActivity.requires_dose)}
                  onChange={(e) =>
                    setEditingActivity((prev) => ({ ...prev, requires_dose: e.target.checked }))
                  }
                />
                Requiere dosis
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(editingActivity.is_active)}
                  onChange={(e) =>
                    setEditingActivity((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                />
                Activa
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setShowActivityModal(false);
                  setEditingActivity(null);
                }}
                className="btn-secondary"
                style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingActivity}
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
                {savingActivity ? 'Guardando...' : 'Guardar actividad'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* 5. MODAL INSUMO */}
      {showInputModal && editingInput ? (
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
            onSubmit={handleSaveInput}
            style={{
              maxWidth: 480,
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
              {editingInput.input_key ? 'Editar Insumo' : 'Nuevo Insumo Sugerido'}
            </h3>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Clave de insumo (ej. COMPOSTA_BOCASHI):
              </label>
              <input
                type="text"
                value={editingInput.input_key || ''}
                onChange={(e) =>
                  setEditingInput((prev) => ({ ...prev, input_key: e.target.value }))
                }
                className="field-input"
                style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Nombre del insumo:
              </label>
              <input
                type="text"
                value={editingInput.name || ''}
                onChange={(e) =>
                  setEditingInput((prev) => ({ ...prev, name: e.target.value }))
                }
                className="field-input"
                style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Unidad típica:
                </label>
                <input
                  type="text"
                  value={editingInput.default_unit || 'kg'}
                  onChange={(e) =>
                    setEditingInput((prev) => ({ ...prev, default_unit: e.target.value }))
                  }
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                  Tipo:
                </label>
                <select
                  value={editingInput.type || 'BIOFERTILIZANTE_LIQUIDO'}
                  onChange={(e) =>
                    setEditingInput((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="field-input"
                  style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                >
                  <option value="FERTILIZANTE_SOLIDO">Fertilizante Sólido</option>
                  <option value="BIOFERTILIZANTE_LIQUIDO">Biofertilizante Líquido</option>
                  <option value="BIOFUNGICIDA">Biofungicida</option>
                  <option value="ENMIENDA_MINERAL">Enmienda Mineral</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(editingInput.is_organic_certified)}
                  onChange={(e) =>
                    setEditingInput((prev) => ({ ...prev, is_organic_certified: e.target.checked }))
                  }
                />
                Certificado orgánico
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(editingInput.is_active)}
                  onChange={(e) =>
                    setEditingInput((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                />
                Activo
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setShowInputModal(false);
                  setEditingInput(null);
                }}
                className="btn-secondary"
                style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingInput}
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
                {savingInput ? 'Guardando...' : 'Guardar insumo'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* 6. MODAL CAMPO PERSONALIZADO */}
      {showFieldModal && editingField ? (
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
            onSubmit={handleSaveField}
            style={{
              maxWidth: 480,
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
              Nuevo Campo Personalizado
            </h3>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Clave técnica (ej. ph_suelo):
              </label>
              <input
                type="text"
                value={editingField.field_key || ''}
                onChange={(e) =>
                  setEditingField((prev) => ({ ...prev, field_key: e.target.value }))
                }
                className="field-input"
                style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Etiqueta / Pregunta para el productor:
              </label>
              <input
                type="text"
                value={editingField.label || ''}
                onChange={(e) =>
                  setEditingField((prev) => ({ ...prev, label: e.target.value }))
                }
                className="field-input"
                style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: T.colors.textPrimary }}>
                Tipo de dato:
              </label>
              <select
                value={editingField.field_type || 'TEXT'}
                onChange={(e) =>
                  setEditingField((prev) => ({
                    ...prev,
                    field_type: e.target.value as 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN',
                  }))
                }
                className="field-input"
                style={{ width: '100%', padding: '8px 10px', marginTop: 4 }}
              >
                <option value="TEXT">Texto libre</option>
                <option value="NUMBER">Número</option>
                <option value="BOOLEAN">Sí / No</option>
                <option value="SELECT">Selección múltiple</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(editingField.required)}
                  onChange={(e) =>
                    setEditingField((prev) => ({ ...prev, required: e.target.checked }))
                  }
                />
                Obligatorio
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(editingField.is_active)}
                  onChange={(e) =>
                    setEditingField((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                />
                Activo
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setShowFieldModal(false);
                  setEditingField(null);
                }}
                className="btn-secondary"
                style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingField}
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
                {savingField ? 'Guardando...' : 'Guardar campo'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
