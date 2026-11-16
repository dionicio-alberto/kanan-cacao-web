'use client';

import React from 'react';
import {
  FieldLogEntry,
  getProducerFriendlyParcelStatus,
  HarvestAcopioEntry,
  ProducerNavSection,
} from '@/services/producerLogbookService';
import {
  consolidateCarbonClusterWeb,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

interface DashboardHomeModuleProps {
  operatorName: string;
  parcels: ParcelAdminOverview[];
  selectedParcel: ParcelAdminOverview;
  fieldLogs: FieldLogEntry[];
  harvestEntries: HarvestAcopioEntry[];
  onNavigate: (section: ProducerNavSection) => void;
}

export default function DashboardHomeModule({
  operatorName,
  parcels,
  selectedParcel,
  fieldLogs,
  harvestEntries,
  onNavigate,
}: DashboardHomeModuleProps) {
  const totalHectares = Number(
    parcels.reduce((acc, item) => acc + item.areaHectares, 0).toFixed(2)
  );
  const totalShadeTrees = parcels.reduce((acc, item) => acc + item.shadeTreeCount, 0);
  const totalPhotos = fieldLogs.reduce((acc, log) => acc + log.photos.length, 0);
  const totalHarvestWetKg = Number(
    harvestEntries.reduce((acc, item) => acc + item.wetWeightKg, 0).toFixed(1)
  );
  const cluster = consolidateCarbonClusterWeb({
    clusterId: 'LOTE-TABASCO-01',
    clusterName: 'Grupo Comunitario Chontalpa',
    parcels,
    minimumRequiredHectares: 6.0,
  });

  const selectedFriendly = getProducerFriendlyParcelStatus(selectedParcel);

  const quickModules: Array<{
    section: ProducerNavSection;
    icon: string;
    title: string;
    summary: string;
    actionLabel: string;
  }> = [
    {
      section: 'parcelas',
      icon: '🗺️',
      title: 'Parcelas y Nueva Georreferencia',
      summary:
        'Consulta la ubicación satelital real de tus terrenos, revisa sus linderos o da de alta una nueva parcela en el mapa.',
      actionLabel: 'Ir a Parcelas y Georreferencia',
    },
    {
      section: 'bitacora',
      icon: '📓',
      title: 'Bitácora de Parcela y Fotos',
      summary:
        'Registra fecha de fertilización, fecha estimada de cosecha, podas, limpias y adjunta fotografías de evidencia de campo.',
      actionLabel: 'Abrir Bitácora de Parcela',
    },
    {
      section: 'cosecha',
      icon: '⚖️',
      title: 'Cosecha y Mesa de Acopio',
      summary:
        'Anota tus mazorcas cortadas, días de fermentación y secado, y pesa tu cacao seco en báscula con comprobante digital.',
      actionLabel: 'Entrar a Cosecha y Acopio',
    },
    {
      section: 'carbono',
      icon: '🌳',
      title: 'Árboles de Sombra y Bonos de Carbono',
      summary:
        'Suma tus hectáreas con árboles maderables y frutales junto a otros productores para alcanzar apoyos comunitarios.',
      actionLabel: 'Ver Bonos de Carbono',
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section
        aria-labelledby="dashboard-welcome-title"
        style={{
          backgroundColor: T.colors.surfaceCard,
          border: `1.5px solid ${T.colors.borderSubtle}`,
          borderRadius: 14,
          padding: '24px 22px',
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
            gap: 12,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: '0.8rem',
                fontWeight: 800,
                color: T.colors.earthCacao,
              }}
            >
              PANEL PRINCIPAL DEL PRODUCTOR
            </p>
            <h1
              id="dashboard-welcome-title"
              style={{
                margin: '4px 0 0',
                fontFamily: 'var(--font-serif)',
                fontSize: '1.65rem',
                color: T.colors.primaryGreen,
              }}
            >
              Bienvenido, {operatorName}
            </h1>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => onNavigate('parcelas')}
          >
            ➕ Registrar nueva georreferencia
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.94rem', color: T.colors.textSecondary }}>
          Desde aquí puedes navegar con la barra superior a cada área de tu cacaotal: revisar tus
          parcelas en satélite, anotar tus labores diarias con foto, registrar tus entregas en
          acopio y consultar tu avance en bonos de carbono.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 12,
          }}
        >
          <div
            style={{
              backgroundColor: T.colors.softGreenBg,
              border: `1px solid ${T.colors.secondaryGreen}`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
              Parcelas registradas
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: T.colors.primaryGreen }}>
              {parcels.length} ({totalHectares} ha)
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.surfaceElevated,
              border: `1px solid ${T.colors.borderSubtle}`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
              Registros en bitácora
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: T.colors.textPrimary }}>
              {fieldLogs.length} labores ({totalPhotos} fotos)
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.softCacaoBg,
              border: `1px solid ${T.colors.earthCacao}`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
              Cosecha registrada en finca
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: T.colors.earthCacao }}>
              {harvestEntries.length} cortes ({totalHarvestWetKg} kg baba)
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.surfaceElevated,
              border: `1px solid ${T.colors.borderSubtle}`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
              Árboles de sombra y bloque
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: T.colors.primaryGreen }}>
              {totalShadeTrees} árboles · {cluster.totalHectares} ha
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Resumen de tu parcela activa"
        style={{
          backgroundColor: T.colors.surfaceElevated,
          border: `1px solid ${T.colors.borderSubtle}`,
          borderRadius: 12,
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: T.colors.textSecondary }}>
            PARCELA SELECCIONADA ACTUALMENTE
          </span>
          <strong style={{ fontSize: '1.08rem', color: T.colors.textPrimary }}>
            {selectedParcel.parcelName || selectedParcel.producerName} — {selectedParcel.municipality}{' '}
            ({selectedParcel.areaHectares} ha)
          </strong>
          <span style={{ fontSize: '0.86rem', color: T.colors.textSecondary }}>
            Salud del cacaotal: <strong>{selectedFriendly.canopyHealthLabel}</strong> ·{' '}
            {selectedFriendly.forestStatusLabel} · {selectedFriendly.papersStatusLabel}
          </span>
        </div>

        <button
          type="button"
          className="btn-control"
          onClick={() => onNavigate('bitacora')}
        >
          Anotar actividad de hoy en esta parcela
        </button>
      </section>

      <section aria-label="Accesos a secciones del portal">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {quickModules.map((mod) => (
            <article
              key={mod.section}
              style={{
                backgroundColor: T.colors.surfaceCard,
                border: `1.5px solid ${T.colors.borderSubtle}`,
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: '1.5rem' }} aria-hidden="true">
                  {mod.icon}
                </div>
                <h2 style={{ margin: 0, fontSize: '1.08rem', color: T.colors.primaryGreen }}>
                  {mod.title}
                </h2>
                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, color: T.colors.textSecondary }}>
                  {mod.summary}
                </p>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => onNavigate(mod.section)}
              >
                {mod.actionLabel}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
