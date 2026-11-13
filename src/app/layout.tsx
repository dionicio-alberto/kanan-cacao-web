import React from 'react';
import './globals.css';
import { NATURISTA_WEB_THEME } from '@/theme/naturistaWebTheme';

export const metadata = {
  title: 'Kanan Cacao — Centro de Control Agrotecnológico ASTRA',
  description:
    'Pasaporte Digital Geoespacial, Cumplimiento EUDR 2020, Salud NDVI Sentinel-2, Báscula Ciega, GS1 EPCIS 2.0 y Bonos de Carbono en Tabasco',
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
