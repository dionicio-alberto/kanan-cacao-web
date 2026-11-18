'use client';

import React from 'react';
import { ProducerNavSection } from '@/services/producerLogbookService';
import { AuthenticatedOperatorProfile } from '@/services/supabaseClient';
import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

interface ProducerTopNavProps {
  activeSection: ProducerNavSection;
  onSelectSection: (section: ProducerNavSection) => void;
  parcels?: ParcelAdminOverview[];
  selectedParcelId?: string | null;
  onSelectParcel?: (parcelId: string | null) => void;
  operatorProfile: AuthenticatedOperatorProfile;
  storageEngine: string;
  onSignOut: () => Promise<void>;
}

const BASE_NAV_ITEMS: Array<{ id: ProducerNavSection; label: string; icon: string }> = [
  { id: 'inicio', label: 'Inicio', icon: '🏡' },
  { id: 'parcelas', label: 'Parcelas y Georreferencia', icon: '🗺️' },
  { id: 'bitacora', label: 'Bitácora', icon: '📓' },
  { id: 'cosecha', label: 'Cosecha y Acopio', icon: '⚖️' },
  { id: 'carbono', label: 'Carbono', icon: '🌳' },
];

export default function ProducerTopNav({
  activeSection,
  onSelectSection,
  parcels: _parcels,
  selectedParcelId: _selectedParcelId,
  onSelectParcel: _onSelectParcel,
  operatorProfile,
  storageEngine,
  onSignOut,
}: ProducerTopNavProps) {
  const navItems =
    operatorProfile.role === 'admin_astra' || operatorProfile.role === 'ADMIN'
      ? [...BASE_NAV_ITEMS, { id: 'admin_panel' as const, label: 'Control Admin', icon: '🛡️' }]
      : BASE_NAV_ITEMS;

  return (
    <header
      style={{
        backgroundColor: T.colors.surfaceCard,
        borderBottom: `1.5px solid ${T.colors.borderSubtle}`,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Franja superior compacta de marca y sesión */}
      <div
        style={{
          backgroundColor: T.colors.primaryGreen,
          color: '#FFFFFF',
          padding: '4px 16px',
          fontSize: '0.74rem',
        }}
      >
        <div
          style={{
            maxWidth: 1360,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'nowrap',
            overflowX: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <span
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 6,
                width: 28,
                height: 28,
                padding: 2,
                boxSizing: 'border-box',
                aspectRatio: '1 / 1',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src="/brand/kanan-cacao-icon.svg?v=2"
                alt="Icono Kanan Cacao"
                width={24}
                height={24}
                style={{
                  width: '100%',
                  height: '100%',
                  aspectRatio: '1 / 1',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            </span>
            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Kanan Cacao</span>
            <span style={{ opacity: 0.75 }}>·</span>
            <span>Tabasco, México</span>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                padding: '1px 7px',
                borderRadius: 5,
                fontSize: '0.68rem',
                fontWeight: 700,
              }}
            >
              {storageEngine === 'supabase_postgis' ? 'En línea' : 'Respaldo local'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                padding: '1px 8px',
                borderRadius: 5,
                fontWeight: 600,
                fontSize: '0.72rem',
              }}
            >
              {operatorProfile.fullName}
            </span>
            <button
              type="button"
              onClick={() => void onSignOut()}
              style={{
                backgroundColor: '#FFFFFF',
                color: T.colors.earthCacao,
                border: 'none',
                borderRadius: 5,
                padding: '3px 9px',
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Única barra horizontal en una sola línea: secciones + filtro de parcela */}
      <div
        style={{
          maxWidth: 1360,
          margin: '0 auto',
          padding: '6px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: 10,
          overflowX: 'auto',
        }}
      >
        <nav
          aria-label="Secciones principales del portal"
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'nowrap',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectSection(item.id)}
                style={{
                  border: `1.5px solid ${isActive ? T.colors.primaryGreen : 'transparent'}`,
                  borderRadius: 7,
                  backgroundColor: isActive ? T.colors.primaryGreen : T.colors.surfaceElevated,
                  color: isActive ? '#FFFFFF' : T.colors.textPrimary,
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.78rem',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
