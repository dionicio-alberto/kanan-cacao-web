'use client';

import React, { useEffect, useState } from 'react';
import AdminLogbookConfigPanel from '@/components/modules/AdminLogbookConfigPanel';
import {
  assignProfileRoleAdminLive,
  fetchAdminRolesPanelLive,
  saveRoleDefinitionAdminLive,
} from '@/services/geoEngineLiveClient';
import { formatDisplayDateEs } from '@/services/producerLogbookService';
import { AuthenticatedOperatorProfile } from '@/services/supabaseClient';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import {
  AdminManagedProfile,
  EditableRoleDefinition,
  RolePermissionSet,
} from '@/types/adminDomain';

interface AdminRoleControlModuleProps {
  operatorProfile: AuthenticatedOperatorProfile;
}

const EMPTY_PERMISSIONS: RolePermissionSet = {
  can_view_parcels: true,
  can_create_parcels: false,
  can_edit_logbook: false,
  can_register_harvest: false,
  can_view_carbon: false,
  can_edit_regdate: false,
  can_manage_roles: false,
  can_configure_logbook: false,
};

const PERMISSION_LABELS: Array<{ key: keyof RolePermissionSet; label: string }> = [
  { key: 'can_view_parcels', label: 'Consultar parcelas y visor satelital' },
  { key: 'can_create_parcels', label: 'Georreferenciar y registrar nuevas parcelas' },
  { key: 'can_edit_logbook', label: 'Registrar actividades en bitácora' },
  { key: 'can_register_harvest', label: 'Operar mesa de acopio y báscula' },
  { key: 'can_view_carbon', label: 'Consultar inventario de sombra y carbono' },
  { key: 'can_edit_regdate', label: 'Modificar fecha de registro (con confirmación)' },
  { key: 'can_manage_roles', label: 'Administrar perfiles y roles del sistema' },
  { key: 'can_configure_logbook', label: 'Configurar catálogo y opciones de la bitácora' },
];

export default function AdminRoleControlModule({ operatorProfile }: AdminRoleControlModuleProps) {
  const [activeTab, setActiveTab] = useState<'roles' | 'bitacora'>('roles');
  const [profiles, setProfiles] = useState<AdminManagedProfile[]>([]);
  const [roles, setRoles] = useState<EditableRoleDefinition[]>([]);
  const [draftRoleByUser, setDraftRoleByUser] = useState<Record<string, string>>({});
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('productor');
  const [isCreatingRole, setIsCreatingRole] = useState<boolean>(false);

  const [roleKeyInput, setRoleKeyInput] = useState<string>('');
  const [roleNameInput, setRoleNameInput] = useState<string>('');
  const [roleDescInput, setRoleDescInput] = useState<string>('');
  const [rolePermsInput, setRolePermsInput] = useState<RolePermissionSet>(EMPTY_PERMISSIONS);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = operatorProfile.role === 'admin_astra' || operatorProfile.role === 'ADMIN';

  const syncPanelState = (payload: {
    profiles: AdminManagedProfile[];
    roles: EditableRoleDefinition[];
  }) => {
    setProfiles(payload.profiles);
    setRoles(payload.roles);
    const nextMap: Record<string, string> = {};
    for (const p of payload.profiles) {
      nextMap[p.user_id] = p.role;
    }
    setDraftRoleByUser(nextMap);
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchAdminRolesPanelLive({
      requesterRole: 'admin_astra',
      accessToken: operatorProfile.accessToken,
    })
      .then((res) => {
        if (!active) return;
        syncPanelState(res);
        const firstRole = res.roles.find((r) => r.role_key === 'productor') ?? res.roles[0];
        if (firstRole) {
          setSelectedRoleKey(firstRole.role_key);
          setRoleKeyInput(firstRole.role_key);
          setRoleNameInput(firstRole.display_name);
          setRoleDescInput(firstRole.description);
          setRolePermsInput(firstRole.permissions);
        }
      })
      .catch((err) => {
        if (active) {
          setErrorMsg(
            err instanceof Error ? err.message : 'No se pudo cargar el control de roles.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAdmin, operatorProfile.accessToken]);

  if (!isAdmin) {
    return (
      <section
        role="alert"
        style={{
          backgroundColor: T.colors.statusRedBg,
          border: '1.5px solid #B91C1C',
          borderRadius: 12,
          padding: 20,
          color: T.colors.statusRed,
          fontWeight: 700,
        }}
      >
        Acceso restringido: esta sección está reservada exclusivamente para Administración ASTRA.
      </section>
    );
  }

  const handleLoadRoleIntoEditor = (roleDef: EditableRoleDefinition) => {
    setIsCreatingRole(false);
    setSelectedRoleKey(roleDef.role_key);
    setRoleKeyInput(roleDef.role_key);
    setRoleNameInput(roleDef.display_name);
    setRoleDescInput(roleDef.description);
    setRolePermsInput({ ...roleDef.permissions });
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const handleStartNewRole = () => {
    setIsCreatingRole(true);
    setSelectedRoleKey('nuevo_rol');
    setRoleKeyInput('');
    setRoleNameInput('');
    setRoleDescInput('');
    setRolePermsInput({ ...EMPTY_PERMISSIONS });
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const handleAssignUserRole = async (profile: AdminManagedProfile) => {
    const nextRole = draftRoleByUser[profile.user_id] || profile.role;
    setSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const updated = await assignProfileRoleAdminLive({
        userId: profile.user_id,
        roleKey: nextRole,
        changedBy: operatorProfile.fullName,
        requesterRole: operatorProfile.role,
        accessToken: operatorProfile.accessToken,
      });
      syncPanelState(updated);
      setStatusMsg(`Rol de ${profile.full_name} actualizado a "${nextRole}".`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo asignar el rol al perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoleDefinition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const targetKey = isCreatingRole ? roleKeyInput : selectedRoleKey;
      const updated = await saveRoleDefinitionAdminLive({
        roleKey: targetKey,
        displayName: roleNameInput,
        description: roleDescInput,
        permissions: rolePermsInput,
        changedBy: operatorProfile.fullName,
        requesterRole: operatorProfile.role,
        accessToken: operatorProfile.accessToken,
      });
      syncPanelState(updated);
      setIsCreatingRole(false);
      setSelectedRoleKey(targetKey.trim().toLowerCase());
      setStatusMsg(`Definición y permisos del rol "${roleNameInput}" guardados.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo guardar el rol.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Subnavegación del panel de administración */}
      <div
        role="tablist"
        aria-label="Secciones del panel de administración"
        style={{
          display: 'flex',
          gap: 10,
          borderBottom: `2px solid ${T.colors.borderSubtle}`,
          paddingBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'roles'}
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '8px 18px',
            backgroundColor:
              activeTab === 'roles' ? T.colors.primaryGreen : T.colors.surfaceElevated,
            color: activeTab === 'roles' ? '#FFFFFF' : T.colors.textPrimary,
            border: `1px solid ${
              activeTab === 'roles' ? T.colors.primaryGreen : T.colors.borderControl
            }`,
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          🛡️ Perfiles y Roles
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bitacora'}
          onClick={() => setActiveTab('bitacora')}
          style={{
            padding: '8px 18px',
            backgroundColor:
              activeTab === 'bitacora' ? T.colors.primaryGreen : T.colors.surfaceElevated,
            color: activeTab === 'bitacora' ? '#FFFFFF' : T.colors.textPrimary,
            border: `1px solid ${
              activeTab === 'bitacora' ? T.colors.primaryGreen : T.colors.borderControl
            }`,
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          🌾 Configuración de Bitácora
        </button>
      </div>

      {activeTab === 'bitacora' ? (
        <AdminLogbookConfigPanel operatorProfile={operatorProfile} />
      ) : (
        <>
          <section
            aria-labelledby="admin-panel-title"
            style={{
              backgroundColor: T.colors.surfaceCard,
              border: `1.5px solid ${T.colors.borderSubtle}`,
              borderRadius: 14,
              padding: 20,
              display: 'grid',
              gap: 14,
            }}
          >
            <div>
              <h1
                id="admin-panel-title"
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.5rem',
                  color: T.colors.primaryGreen,
                }}
              >
                Panel de Control Admin · Perfiles y Roles Editables
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: T.colors.textSecondary }}>
                Asigna o cambia el rol de cada persona autorizada y edita los permisos o nombres de
                cada rol del portal Kanan Cacao.
              </p>
            </div>

            {statusMsg ? (
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
                {statusMsg}
              </div>
            ) : null}

            {errorMsg ? (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: T.colors.statusRedBg,
                  border: '1.5px solid #B91C1C',
                  color: T.colors.statusRed,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {errorMsg}
              </div>
            ) : null}

            <h2 style={{ margin: '6px 0 0', fontSize: '1.05rem', color: T.colors.primaryGreen }}>
              1. Asignación de roles por persona ({profiles.length})
            </h2>

            {loading ? (
              <div style={{ fontSize: '0.86rem', color: T.colors.textSecondary }}>
                Cargando perfiles y roles desde el servidor...
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {profiles.map((prof) => {
                  const draftRole = draftRoleByUser[prof.user_id] ?? prof.role;
                  const isChanged = draftRole !== prof.role;
                  return (
                    <div
                      key={prof.user_id}
                      style={{
                        backgroundColor: T.colors.backgroundPrimary,
                        border: `1px solid ${T.colors.borderSubtle}`,
                        borderRadius: 10,
                        padding: '12px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: T.colors.textPrimary }}>
                          {prof.full_name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: T.colors.textSecondary }}>
                          {prof.email} · {prof.cooperative_name}
                          {prof.updated_at_iso
                            ? ` · Actualizado: ${formatDisplayDateEs(prof.updated_at_iso)}`
                            : ''}
                        </div>
                      </div>

                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                      >
                        <select
                          aria-label={`Rol asignado a ${prof.full_name}`}
                          value={draftRole}
                          disabled={saving}
                          onChange={(e) =>
                            setDraftRoleByUser((prev) => ({
                              ...prev,
                              [prof.user_id]: e.target.value,
                            }))
                          }
                          className="field-input"
                          style={{
                            width: 'auto',
                            minWidth: 210,
                            marginTop: 0,
                            padding: '6px 10px',
                          }}
                        >
                          {roles.map((r) => (
                            <option key={r.role_key} value={r.role_key}>
                              {r.display_name} ({r.role_key})
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={saving || !isChanged}
                          onClick={() => void handleAssignUserRole(prof)}
                          className="btn-primary"
                          style={{
                            padding: '7px 14px',
                            fontSize: '0.82rem',
                            opacity: isChanged ? 1 : 0.6,
                          }}
                        >
                          Guardar rol
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            aria-labelledby="admin-roles-editor-title"
            style={{
              backgroundColor: T.colors.surfaceCard,
              border: `1.5px solid ${T.colors.borderSubtle}`,
              borderRadius: 14,
              padding: 20,
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
                  id="admin-roles-editor-title"
                  style={{ margin: 0, fontSize: '1.1rem', color: T.colors.primaryGreen }}
                >
                  2. Editor de roles y permisos
                </h2>
                <p
                  style={{ margin: '2px 0 0', fontSize: '0.84rem', color: T.colors.textSecondary }}
                >
                  Selecciona cualquier rol para modificar su nombre, descripción y permisos, o crea
                  un nuevo rol personalizado.
                </p>
              </div>
              <button type="button" onClick={handleStartNewRole} className="btn-cacao">
                + Crear nuevo rol
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {roles.map((r) => {
                const active = !isCreatingRole && selectedRoleKey === r.role_key;
                return (
                  <button
                    key={r.role_key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleLoadRoleIntoEditor(r)}
                    className="btn-control"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      backgroundColor: active ? T.colors.primaryGreen : T.colors.surfaceElevated,
                      color: active ? '#FFFFFF' : T.colors.textPrimary,
                      borderColor: active ? T.colors.primaryGreen : T.colors.borderControl,
                    }}
                  >
                    {r.display_name}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={(e) => void handleSaveRoleDefinition(e)}
              style={{
                backgroundColor: T.colors.backgroundPrimary,
                border: `1px solid ${T.colors.borderSubtle}`,
                borderRadius: 12,
                padding: 16,
                display: 'grid',
                gap: 12,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                <div>
                  <label
                    htmlFor="role-editor-key"
                    style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    Identificador del rol (ej. inspector_campo)
                  </label>
                  <input
                    id="role-editor-key"
                    type="text"
                    value={isCreatingRole ? roleKeyInput : selectedRoleKey}
                    disabled={!isCreatingRole || saving}
                    onChange={(e) => setRoleKeyInput(e.target.value)}
                    className="field-input"
                    placeholder="inspector_campo"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="role-editor-name"
                    style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    Nombre visible del rol
                  </label>
                  <input
                    id="role-editor-name"
                    type="text"
                    value={roleNameInput}
                    disabled={saving}
                    onChange={(e) => setRoleNameInput(e.target.value)}
                    className="field-input"
                    placeholder="Ej. Inspector de Cacao"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="role-editor-desc"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  Descripción operativa
                </label>
                <input
                  id="role-editor-desc"
                  type="text"
                  value={roleDescInput}
                  disabled={saving}
                  onChange={(e) => setRoleDescInput(e.target.value)}
                  className="field-input"
                  placeholder="Qué tareas puede realizar este perfil en campo o acopio"
                />
              </div>

              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                  Permisos habilitados para este rol:
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 8,
                  }}
                >
                  {PERMISSION_LABELS.map((perm) => (
                    <label
                      key={perm.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.82rem',
                        padding: '6px 10px',
                        backgroundColor: T.colors.surfaceCard,
                        border: `1px solid ${T.colors.borderSubtle}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(rolePermsInput[perm.key])}
                        disabled={saving}
                        onChange={(e) =>
                          setRolePermsInput((prev) => ({
                            ...prev,
                            [perm.key]: e.target.checked,
                          }))
                        }
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving
                    ? 'Guardando cambios...'
                    : isCreatingRole
                      ? 'Crear rol nuevo'
                      : 'Guardar edición de rol'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
