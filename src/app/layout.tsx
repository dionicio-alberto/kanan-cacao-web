import React from 'react';
import './globals.css';
import { NATURISTA_WEB_THEME } from '@/theme/naturistaWebTheme';

export const metadata = {
  title: 'Kanan Cacao · Portal del Productor y Acopio en Tabasco',
  description:
    'Mapa satelital de parcelas de cacao, bitácora diaria con fotos, registro de cosecha en mesa de acopio y bonos de carbono comunitarios en Tabasco.',
  icons: {
    icon: '/brand/kanan-cacao-icon.svg?v=2',
    apple: '/brand/kanan-cacao-icon.svg?v=2',
  },
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
