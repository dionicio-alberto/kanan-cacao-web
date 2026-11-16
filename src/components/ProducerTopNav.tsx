'use client';

import React from 'react';
import { ProducerNavSection } from '@/services/producerLogbookService';
import { AuthenticatedOperatorProfile } from '@/services/supabaseClient';
import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

interface ProducerTopNavProps {
  activeSection: ProducerNavSection;
  onSelectSection: (section: ProducerNavSection) => void;
  parcels: ParcelAdminOverview[];
  selectedParcelId: string | null;
  onSelectParcel: (parcelId: string | null) => void;
  operatorProfile: AuthenticatedOperatorProfile;
  storageEngine: string;
  onSignOut: () => Promise<void>;
}

const NAV_ITEMS: Array<{ id: ProducerNavSection; label: string; icon: string }> = [
  { id: 'inicio', label: 'Inicio', icon: '🏡' },
  { id: 'parcelas', label: 'Parcelas y Georreferencia', icon: '🗺️' },
  { id: 'bitacora', label: 'Bitácora de Parcela', icon: '📓' },
  { id: 'cosecha', label: 'Cosecha y Mesa de Acopio', icon: '⚖️' },
  { id: 'carbono', label: 'Bonos de Carbono', icon: '🌳' },
];

export default function ProducerTopNav({
  activeSection,
  onSelectSection,
  parcels,
  selectedParcelId,
  onSelectParcel,
  operatorProfile,
  storageEngine,
  onSignOut,
}: ProducerTopNavProps) {
  return (
    <header
      style={{
        backgroundColor: T.colors.surfaceCard,
        borderBottom: `2px solid ${T.colors.borderSubtle}`,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Franja institucional mínima de cuenta */}
      <div
        style={{
          backgroundColor: T.colors.primaryGreen,
          color: '#FFFFFF',
          padding: '7px 20px',
          fontSize: '0.8rem',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>🌿 Kanan Cacao</span>
            <span style={{ opacity: 0.8 }}>·</span>
            <span>Tabasco, México</span>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {storageEngine === 'supabase_postgis'
                ? 'En línea con servidor'
                : 'Respaldo local activo'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '2px 10px',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: '0.76rem',
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
                borderRadius: 6,
                padding: '5px 11px',
                fontWeight: 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Única barra de navegación con pestañas a la izquierda y filtro opcional de parcela diferenciado a la derecha */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <nav
          aria-label="Secciones principales del portal"
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectSection(item.id)}
                style={{
                  border: `1.5px solid ${isActive ? T.colors.primaryGreen : 'transparent'}`,
                  borderRadius: 8,
                  backgroundColor: isActive ? T.colors.primaryGreen : T.colors.surfaceElevated,
                  color: isActive ? '#FFFFFF' : T.colors.textPrimary,
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.84rem',
                  padding: '8px 13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Cápsula visualmente diferenciada para el filtro opcional de parcela */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: T.colors.softCacaoBg,
            border: `2px solid ${T.colors.earthCacao}`,
            borderRadius: 10,
            padding: '5px 10px',
          }}
        >
          <label
            htmlFor="global-parcel-select"
            style={{
              fontSize: '0.76rem',
              fontWeight: 800,
              color: T.colors.earthCacao,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            📍 Filtro parcela:
          </label>
          <select
            id="global-parcel-select"
            value={selectedParcelId ?? ''}
            onChange={(e) => onSelectParcel(e.target.value ? e.target.value : null)}
            className="field-input"
            style={{
              width: 'auto',
              minWidth: 210,
              marginTop: 0,
              padding: '4px 10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: '#FFFFFF',
              borderColor: T.colors.earthCacao,
            }}
          >
            <option value="">Todas las parcelas (Ver menú)</option>
            {parcels.map((p) => (
              <option key={p.parcelId} value={p.parcelId}>
                {p.parcelName || p.producerName} ({p.municipality})
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
