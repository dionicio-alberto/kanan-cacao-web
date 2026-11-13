import React from 'react';
import './globals.css';
import { NATURISTA_WEB_THEME } from '@/theme/naturistaWebTheme';

export const metadata = {
  title: 'Kanan Cacao: Consola Operativa ASTRA',
  description:
    'Pasaporte digital geoespacial, cumplimiento EUDR 2020, salud NDVI Sentinel-2, báscula ciega, GS1 EPCIS 2.0 y bonos de carbono en Tabasco.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          backgroundColor: NATURISTA_WEB_THEME.colors.backgroundPrimary,
          color: NATURISTA_WEB_THEME.colors.textPrimary,
        }}
      >
        {children}
      </body>
    </html>
  );
}
