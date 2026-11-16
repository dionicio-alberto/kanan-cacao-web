'use client';

import React, { useEffect, useState } from 'react';
import CarbonBonusModule from '@/components/modules/CarbonBonusModule';
import DashboardHomeModule from '@/components/modules/DashboardHomeModule';
import FieldLogbookModule from '@/components/modules/FieldLogbookModule';
import HarvestAndAcopioModule from '@/components/modules/HarvestAndAcopioModule';
import ParcelsAndGeorefModule, {
  CreateGeorefParcelPayload,
} from '@/components/modules/ParcelsAndGeorefModule';
import ProducerTopNav from '@/components/ProducerTopNav';
import PublicLandingAndLogin from '@/components/PublicLandingAndLogin';
import { INITIAL_PARCELS } from '@/services/demoParcels';
import {
  fetchPersistedParcelsWithMeta,
  syncFieldParcelToSqliteLive,
  toggleParcelCustfLive,
} from '@/services/geoEngineLiveClient';
import {
  FieldLogEntry,
  HarvestAcopioEntry,
  INITIAL_FIELD_LOGS,
  INITIAL_HARVEST_ENTRIES,
  ProducerNavSection,
} from '@/services/producerLogbookService';
import {
  AuthenticatedOperatorProfile,
  getActiveSupabaseSession,
  signOutSupabaseSession,
  subscribeToSupabaseAuthChanges,
} from '@/services/supabaseClient';
import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import { WebUserRole } from '@/types/adminDomain';

function createRandomUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
}

export default function KananCacaoPortalPage() {
  const [operatorProfile, setOperatorProfile] = useState<AuthenticatedOperatorProfile | null>(
    null
  );
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<ProducerNavSection>('inicio');

  const [parcels, setParcels] = useState<ParcelAdminOverview[]>(INITIAL_PARCELS);
  const [selectedParcelId, setSelectedParcelId] = useState<string>(INITIAL_PARCELS[0].parcelId);
  const [storageEngine, setStorageEngine] = useState<string>('demo');

  const [fieldLogs, setFieldLogs] = useState<FieldLogEntry[]>(INITIAL_FIELD_LOGS);
  const [harvestEntries, setHarvestEntries] =
    useState<HarvestAcopioEntry[]>(INITIAL_HARVEST_ENTRIES);

  const [savingGeoref, setSavingGeoref] = useState(false);
  const [georefStatusMsg, setGeorefStatusMsg] = useState<string | null>(null);
  const [georefErrorMsg, setGeorefErrorMsg] = useState<string | null>(null);

  // Verificación estricta de sesión antes de habilitar cualquier módulo operativo.
  useEffect(() => {
    let active = true;

    getActiveSupabaseSession()
      .then((session) => {
        if (active) {
          setOperatorProfile(session);
        }
      })
      .catch(() => {
        if (active) {
          setOperatorProfile(null);
        }
      })
      .finally(() => {
        if (active) {
          setAuthChecked(true);
        }
      });

    const unsubscribe = subscribeToSupabaseAuthChanges(() => {
      if (active) {
        setOperatorProfile(null);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Solo consulta datos de parcelas cuando existe una sesión autenticada válida.
  useEffect(() => {
    if (!operatorProfile?.accessToken) {
      return;
    }

    let active = true;
    fetchPersistedParcelsWithMeta()
      .then(({ storageEngine: engine, parcels: persisted }) => {
        if (active && persisted.length > 0) {
          setParcels(persisted);
          setSelectedParcelId(persisted[0].parcelId);
          setStorageEngine(engine);
        }
      })
      .catch(() => {
        if (active) {
          setStorageEngine('local_fallback');
        }
      });

    return () => {
      active = false;
    };
  }, [operatorProfile?.accessToken]);

  if (!authChecked) {
    return (
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: T.colors.backgroundPrimary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          color: T.colors.primaryGreen,
          fontWeight: 700,
        }}
      >
        Verificando sesión segura en Kanan Cacao...
      </main>
    );
  }

  // Zero-Bypass Guard: sin sesión autenticada real solo se muestra la Landing Page + Login.
  if (!operatorProfile) {
    return (
      <PublicLandingAndLogin
        onAuthenticated={(profile) => {
          setOperatorProfile(profile);
          setActiveSection('inicio');
        }}
      />
    );
  }

  const activeRole: WebUserRole = operatorProfile.role;
  const selectedParcel = parcels.find((p) => p.parcelId === selectedParcelId) ?? parcels[0];

  const handleSignOut = async () => {
    await signOutSupabaseSession();
    setOperatorProfile(null);
    setParcels(INITIAL_PARCELS);
    setSelectedParcelId(INITIAL_PARCELS[0].parcelId);
    setGeorefStatusMsg(null);
    setGeorefErrorMsg(null);
  };

  const handleToggleCustf = async (parcelId: string) => {
    setParcels((prev) =>
      prev.map((p) =>
        p.parcelId === parcelId ? { ...p, hasVerifiedCustfPermit: !p.hasVerifiedCustfPermit } : p
      )
    );
    try {
      const updated = await toggleParcelCustfLive(parcelId);
      setParcels((prev) => prev.map((p) => (p.parcelId === parcelId ? updated : p)));
    } catch {
      // Mantiene cambio optimista en pantalla cuando no responde el backend remoto.
    }
  };

  const handleCreateGeorefParcel = async (payload: CreateGeorefParcelPayload) => {
    setSavingGeoref(true);
    setGeorefStatusMsg(null);
    setGeorefErrorMsg(null);

    const newParcelId = createRandomUuidV4();
    const localNewParcel: ParcelAdminOverview = {
      parcelId: newParcelId,
      parcelName: payload.parcelName,
      producerId: '11111111-1111-4111-8111-111111111111',
      producerName: payload.producerName,
      municipality: payload.municipality,
      areaHectares: payload.areaHectares,
      eudrStatus: 'VERDE',
      ndviAlertLevel: 'VIGOR_AGROFORESTAL_OPTIMO',
      meanNdvi: 0.78,
      shadeTreeCount: payload.shadeTreeCount,
      acahualRemovalPost2020: false,
      hasVerifiedCustfPermit: true,
      coordinates: payload.coordinates,
    };

    try {
      const updatedList = await syncFieldParcelToSqliteLive({
        parcelId: newParcelId,
        parcelName: payload.parcelName,
        producerId: '11111111-1111-4111-8111-111111111111',
        producerName: payload.producerName,
        municipality: payload.municipality,
        areaHectares: payload.areaHectares,
        shadeTreeCount: payload.shadeTreeCount,
        coordinates: payload.coordinates,
      });

      const foundInRemote = updatedList.some((p) => p.parcelId === newParcelId);
      const mergedList = foundInRemote ? updatedList : [localNewParcel, ...updatedList];
      setParcels(mergedList);
      setSelectedParcelId(newParcelId);
      setGeorefStatusMsg(
        `Nueva georreferencia guardada: ${payload.parcelName} (${payload.areaHectares} ha en ${payload.municipality}). Ya puedes verla en el mapa satelital.`
      );
    } catch (err) {
      setGeorefErrorMsg(
        err instanceof Error
          ? `No se pudo sincronizar con el servidor en este momento (${err.message}). Se guardó temporalmente en tu vista local.`
          : 'No se pudo guardar en línea; se mantuvo en tu pantalla.'
      );
      setParcels((prev) => [localNewParcel, ...prev]);
      setSelectedParcelId(newParcelId);
    } finally {
      setSavingGeoref(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <a href="#main-workbench" className="skip-link">
        Saltar al contenido principal
      </a>

      <ProducerTopNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        parcels={parcels}
        selectedParcelId={selectedParcel.parcelId}
        onSelectParcel={setSelectedParcelId}
        operatorProfile={operatorProfile}
        storageEngine={storageEngine}
        onSignOut={handleSignOut}
      />

      <main
        id="main-workbench"
        className="page-shell"
        style={{ flex: 1, paddingTop: 22, paddingBottom: 32 }}
      >
        {activeSection === 'inicio' ? (
          <DashboardHomeModule
            operatorName={operatorProfile.fullName}
            parcels={parcels}
            selectedParcel={selectedParcel}
            fieldLogs={fieldLogs}
            harvestEntries={harvestEntries}
            onNavigate={setActiveSection}
          />
        ) : null}

        {activeSection === 'parcelas' ? (
          <ParcelsAndGeorefModule
            parcels={parcels}
            selectedParcel={selectedParcel}
            onSelectParcel={setSelectedParcelId}
            onToggleCustf={handleToggleCustf}
            onCreateGeorefParcel={handleCreateGeorefParcel}
            savingGeoref={savingGeoref}
            georefStatusMsg={georefStatusMsg}
            georefErrorMsg={georefErrorMsg}
          />
        ) : null}

        {activeSection === 'bitacora' ? (
          <FieldLogbookModule
            parcels={parcels}
            selectedParcel={selectedParcel}
            onSelectParcel={setSelectedParcelId}
            fieldLogs={fieldLogs}
            onAddFieldLog={(entry) => setFieldLogs((prev) => [entry, ...prev])}
          />
        ) : null}

        {activeSection === 'cosecha' ? (
          <HarvestAndAcopioModule
            activeRole={activeRole}
            parcels={parcels}
            selectedParcel={selectedParcel}
            onSelectParcel={setSelectedParcelId}
            harvestEntries={harvestEntries}
            onAddHarvestEntry={(entry) => setHarvestEntries((prev) => [entry, ...prev])}
          />
        ) : null}

        {activeSection === 'carbono' ? <CarbonBonusModule parcels={parcels} /> : null}
      </main>

      <footer
        style={{
          backgroundColor: T.colors.backgroundSecondary,
          borderTop: `1px solid ${T.colors.borderSubtle}`,
          padding: '16px 20px',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: T.colors.textSecondary,
        }}
      >
        Kanan Cacao · Portal de Productores y Acopio en Tabasco · ASTRA S.A.S.
      </footer>
    </div>
  );
}
