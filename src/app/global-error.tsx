'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log uncaught global root exception
    console.error('Kanan Cacao Global Root Exception caught:', error);
  }, [error]);

  const handleReload = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        window.location.reload();
      }
    } catch {
      reset();
    }
  };

  const handleGoHome = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        window.location.href = '/?demo=admin';
      }
    } catch {
      reset();
    }
  };

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: '#F8F9F5',
          color: '#1E2D24',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: '90%',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 16,
            padding: '32px 28px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              fontSize: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            🌱
          </div>

          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#1E2D24',
              margin: '0 0 8px',
            }}
          >
            Kanan Cacao · Tabasco
          </h1>

          <p
            style={{
              fontSize: 14,
              color: '#4B5563',
              lineHeight: 1.5,
              margin: '0 0 20px',
            }}
          >
            Se ha actualizado la plataforma en segundo plano o se presentó una interrupción temporal
            de sincronización. Tus datos locales se mantienen a salvo.
          </p>

          {error?.digest && (
            <div
              style={{
                fontSize: 11,
                fontFamily: 'monospace',
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                padding: '6px 12px',
                borderRadius: 6,
                marginBottom: 20,
                wordBreak: 'break-all',
              }}
            >
              Código de rastreo: {error.digest}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={handleReload}
              style={{
                backgroundColor: '#2D5A27',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 Recargar Aplicación
            </button>
            <button
              onClick={handleGoHome}
              style={{
                backgroundColor: '#F3F4F6',
                color: '#1E2D24',
                border: '1px solid #D1D5DB',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🏠 Ir al Inicio
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
