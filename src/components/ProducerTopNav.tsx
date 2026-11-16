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
  const activeParcel = parcels.find((item) => item.parcelId === selectedParcelId) ?? parcels[0];

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
      {/* Nivel 0: Franja superior de cuenta y salida */}
      <div
        style={{
          backgroundColor: T.colors.primaryGreen,
          color: '#FFFFFF',
          padding: '8px 20px',
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
            <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>🌿 Kanan Cacao</span>
            <span style={{ opacity: 0.8 }}>·</span>
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
                ? 'Guardado en servidor en vivo'
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

      {/* Nivel 1: Navegación de Secciones del Portal */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: `1px solid ${T.colors.borderSubtle}`,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '10px 20px 0',
            display: 'grid',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: T.colors.textSecondary,
              textTransform: 'uppercase',
            }}
          >
            Secciones del portal
          </span>
          <nav
            aria-label="Secciones principales del portal"
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
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
                    border: 'none',
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    borderBottom: isActive
                      ? `4px solid ${T.colors.primaryGreen}`
                      : '4px solid transparent',
                    backgroundColor: isActive ? T.colors.softGreenBg : 'transparent',
                    color: isActive ? T.colors.primaryGreen : T.colors.textSecondary,
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '0.88rem',
                    padding: '9px 14px',
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
        </div>
      </div>

      {/* Nivel 2: Cinta independiente para elegir la Parcela Activa */}
      <div
        style={{
          backgroundColor: T.colors.softCacaoBg,
          borderTop: `1px solid ${T.colors.earthCacao}`,
        }}
      >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label
              htmlFor="global-parcel-select"
              style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                color: T.colors.earthCacao,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span aria-hidden="true">📍</span>
              <span>PARCELA ACTIVA EN TRABAJO:</span>
            </label>
            <select
              id="global-parcel-select"
              value={selectedParcelId}
              onChange={(e) => onSelectParcel(e.target.value)}
              className="field-input"
              style={{
                width: 'auto',
                minWidth: 260,
                marginTop: 0,
                padding: '6px 12px',
                fontSize: '0.86rem',
                fontWeight: 700,
                border: `2px solid ${T.colors.earthCacao}`,
                backgroundColor: '#FFFFFF',
              }}
            >
              {parcels.map((p) => (
                <option key={p.parcelId} value={p.parcelId}>
                  {p.parcelName || p.producerName} — {p.municipality}
                </option>
              ))}
            </select>
          </div>

          {activeParcel ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.78rem' }}>
              <span
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${T.colors.borderSubtle}`,
                  padding: '3px 9px',
                  borderRadius: 6,
                  fontWeight: 700,
                }}
              >
                🌾 {activeParcel.areaHectares} hectáreas
              </span>
              <span
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${T.colors.borderSubtle}`,
                  padding: '3px 9px',
                  borderRadius: 6,
                  fontWeight: 700,
                }}
              >
                🌳 {activeParcel.shadeTreeCount} árboles de sombra
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
