import React from 'react';
import { NATURISTA_WEB_THEME } from '@/theme/naturistaWebTheme';
import { WEB_DOMAIN_CONSTANTS } from '@/types/adminDomain';

export default function AdminDashboardPage() {
  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: 32 }}>
      <header
        style={{
          backgroundColor: NATURISTA_WEB_THEME.colors.surfaceCard,
          border: `1px solid ${NATURISTA_WEB_THEME.colors.borderSubtle}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0, color: NATURISTA_WEB_THEME.colors.primaryGreen }}>
          Kanan Cacao — Centro de Control ASTRA
        </h1>
        <p style={{ marginTop: 8, color: NATURISTA_WEB_THEME.colors.earthCacao }}>
          Guardián Digital del Cacao Tabasqueño · Cumplimiento EUDR 2020 · EPCIS 2.0 · Bonos de
          Carbono
        </p>
        <small style={{ color: NATURISTA_WEB_THEME.colors.textSecondary }}>
          {WEB_DOMAIN_CONSTANTS.EUDR_LEGAL_DISCLAIMER}
        </small>
      </header>
    </main>
  );
}
