'use client';

import React, { useEffect } from 'react';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for diagnostics
    console.error('Kanan Cacao Client Exception caught by Error Boundary:', error);
  }, [error]);

  const handleResetAndReload = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
      }
    } catch {
      // Ignore storage clear errors
    }
    reset();
  };

  const handleFullRestart = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        window.location.href = '/?demo=admin';
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.colors.backgroundPrimary,
        padding: 24,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          backgroundColor: T.colors.surfaceCard,
          border: `1.5px solid ${T.colors.borderSubtle}`,
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌱</div>
        <h1
          style={{
            margin: '0 0 10px',
            fontSize: '1.4rem',
            color: T.colors.primaryGreen,
            fontFamily: 'var(--font-serif)',
          }}
        >
          Kanan Cacao · Portal del Productor
        </h1>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: '0.92rem',
            color: T.colors.textSecondary,
            lineHeight: 1.5,
          }}
        >
          Ocurrió una interrupción temporal al cargar los datos en tu navegador. Tus parcelas y
          registros de bitácora continúan protegidos y sincronizados en el servidor.
        </p>

        {error?.message ? (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: T.colors.statusRedBg,
              border: '1px solid #FECACA',
              borderRadius: 8,
              fontSize: '0.8rem',
              color: T.colors.statusRed,
              marginBottom: 20,
              wordBreak: 'break-word',
              textAlign: 'left',
            }}
          >
            <strong>Detalle técnico:</strong> {error.message}
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 10 }}>
          <button
            type="button"
            onClick={handleResetAndReload}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '12px 18px',
              backgroundColor: T.colors.primaryGreen,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🔄 Reintentar operación
          </button>

          <button
            type="button"
            onClick={handleFullRestart}
            className="btn-secondary"
            style={{
              width: '100%',
              padding: '10px 18px',
              backgroundColor: T.colors.surfaceElevated,
              color: T.colors.earthCacao,
              border: `1px solid ${T.colors.borderControl}`,
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🌱 Entrar en modo administrador seguro
          </button>
        </div>
      </div>
    </div>
  );
}
