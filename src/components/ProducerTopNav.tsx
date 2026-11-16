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
  selectedParcelId: string;
  onSelectParcel: (parcelId: string) => void;
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
      <div
        style={{
          backgroundColor: T.colors.primaryGreen,
          color: '#FFFFFF',
          padding: '10px 20px',
          fontSize: '0.82rem',
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
            <span style={{ opacity: 0.85 }}>·</span>
            <span>Tabasco, México</span>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: '0.74rem',
                fontWeight: 700,
              }}
            >
              {storageEngine === 'supabase_postgis'
                ? 'Conectado en vivo'
                : 'Conectado a respaldo local'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.32)',
                padding: '3px 10px',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: '0.78rem',
              }}
            >
              {operatorProfile.fullName} ({operatorProfile.email})
            </span>
            <button
              type="button"
              onClick={() => void onSignOut()}
              style={{
                backgroundColor: '#FFFFFF',
                color: T.colors.earthCacao,
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <nav aria-label="Secciones principales del portal" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectSection(item.id)}
                className="btn-control"
                style={{
                  backgroundColor: isActive ? T.colors.primaryGreen : T.colors.surfaceElevated,
                  color: isActive ? '#FFFFFF' : T.colors.textPrimary,
                  borderColor: isActive ? T.colors.primaryGreen : T.colors.borderControl,
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  padding: '8px 14px',
                }}
              >
                <span aria-hidden="true" style={{ marginRight: 6 }}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label
            htmlFor="global-parcel-select"
            style={{ fontSize: '0.8rem', fontWeight: 700, color: T.colors.textSecondary }}
          >
            Parcela activa:
          </label>
          <select
            id="global-parcel-select"
            value={selectedParcelId}
            onChange={(e) => onSelectParcel(e.target.value)}
            className="field-input"
            style={{
              width: 'auto',
              minWidth: 210,
              marginTop: 0,
              padding: '6px 10px',
              fontSize: '0.84rem',
            }}
          >
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
