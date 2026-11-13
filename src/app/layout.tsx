import React from 'react';
import { NATURISTA_WEB_THEME } from '@/theme/naturistaWebTheme';

export const metadata = {
  title: 'Kanan Cacao — Panel Administrativo ASTRA',
  description:
    'Trazabilidad EUDR, Báscula Ciega, Auditoría CUSTF y Consolidación de Bonos de Carbono',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          backgroundColor: NATURISTA_WEB_THEME.colors.backgroundPrimary,
          color: NATURISTA_WEB_THEME.colors.textPrimary,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
