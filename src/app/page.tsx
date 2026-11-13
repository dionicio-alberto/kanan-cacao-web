'use client';

import React, { useState } from 'react';
import LiveGeoEnginePanel from '@/components/LiveGeoEnginePanel';
import OperationsDashboard from '@/components/OperationsDashboard';
import { INITIAL_PARCELS } from '@/services/demoParcels';
import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import { WEB_DOMAIN_CONSTANTS, WebUserRole } from '@/types/adminDomain';

const ROLE_LABELS: Record<WebUserRole, string> = {
  admin_astra: 'Admin ASTRA',
  auditor_sustentabilidad: 'Auditor EUDR',
  acopiador: 'Operador Báscula (Ciego)',
};

export default function AdminDashboardPage() {
  const [activeRole, setActiveRole] = useState<WebUserRole>('admin_astra');
  const [parcels, setParcels] = useState<ParcelAdminOverview[]>(INITIAL_PARCELS);
  const [selectedParcelId, setSelectedParcelId] = useState<string>(INITIAL_PARCELS[0].parcelId);

  const selectedParcel = parcels.find((p) => p.parcelId === selectedParcelId) ?? parcels[0];

  const toggleCustf = (parcelId: string) =>
    setParcels((prev) =>
      prev.map((p) =>
        p.parcelId === parcelId ? { ...p, hasVerifiedCustfPermit: !p.hasVerifiedCustfPermit } : p,
      ),
    );

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 20px' }}>
      <header
        style={{
          backgroundColor: T.colors.surfaceCard,
          border: `1px solid ${T.colors.borderSubtle}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: T.colors.primaryGreen, fontSize: 28 }}>
            🛡️ Kanan Cacao — Centro de Control ASTRA
          </h1>
          <p style={{ margin: '6px 0', color: T.colors.earthCacao, fontSize: 16 }}>
            Pasaporte Digital Geoespacial · EUDR 2020 · NDVI Sentinel-2 · Báscula Ciega · EPCIS 2.0
            · TRACES NT
          </p>
          <small style={{ color: T.colors.textSecondary }}>
            {WEB_DOMAIN_CONSTANTS.EUDR_LEGAL_DISCLAIMER}
          </small>
        </div>

        <div
          style={{
            backgroundColor: T.colors.backgroundSecondary,
            padding: 14,
            borderRadius: 12,
            border: `1px solid ${T.colors.borderSubtle}`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            🔐 Vista activa por rol (RBAC):
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.keys(ROLE_LABELS) as WebUserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  backgroundColor:
                    activeRole === role ? T.colors.primaryGreen : T.colors.surfaceCard,
                  color: activeRole === role ? '#FFFFFF' : T.colors.textPrimary,
                }}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <OperationsDashboard
        key={activeRole}
        activeRole={activeRole}
        parcels={parcels}
        selectedParcelId={selectedParcelId}
        onSelectParcel={setSelectedParcelId}
        onToggleCustf={toggleCustf}
      />

      <LiveGeoEnginePanel parcel={selectedParcel} />
    </main>
  );
}
