'use client';

import React, { useState } from 'react';
import {
  AuthenticatedOperatorProfile,
  signInWithSupabasePassword,
} from '@/services/supabaseClient';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

interface SupabaseLoginWallProps {
  onAuthenticated: (profile: AuthenticatedOperatorProfile) => void;
}

const DEMO_ACCOUNTS = [
  {
    label: 'Dirección de Operaciones ASTRA (Admin)',
    email: 'admin@cacao-astra.org',
    roleHint: 'Acceso total: EUDR, Bascula Ciega, Bonos de Carbono y Trazabilidad',
  },
  {
    label: 'Auditora EUDR / Sustentabilidad',
    email: 'auditor.eudr@cacao-astra.org',
    roleHint: 'Supervisión satelital Sentinel-2, alertas NDVI y exportación TRACES NT',
  },
  {
    label: 'Centro de Acopio Chontalpa',
    email: 'acopio.chontalpa@cacao-astra.org',
    roleHint: 'Operación de Báscula Ciega, taras y registro de recepción diaria',
  },
] as const;

export default function SupabaseLoginWall({ onAuthenticated }: SupabaseLoginWallProps) {
  const [email, setEmail] = useState('admin@cacao-astra.org');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const authenticate = async (targetEmail: string, targetPassword: string) => {
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail || !targetPassword) {
      setErrorMsg('Ingresa correo operativo y contraseña para continuar.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const profile = await signInWithSupabasePassword(cleanEmail, targetPassword);
      onAuthenticated(profile);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No fue posible iniciar sesión con Supabase Auth.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await authenticate(email, password);
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Kanan2026!');
    await authenticate(demoEmail, 'Kanan2026!');
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: T.colors.backgroundPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <section
        aria-labelledby="login-wall-title"
        style={{
          width: '100%',
          maxWidth: 540,
          backgroundColor: T.colors.surfaceCard,
          border: `1.5px solid ${T.colors.borderSubtle}`,
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 10px 28px rgba(20, 69, 38, 0.08)',
          display: 'grid',
          gap: 18,
        }}
      >
        <header style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: T.colors.primaryGreen,
                backgroundColor: T.colors.softGreenBg,
                padding: '4px 10px',
                borderRadius: 6,
                border: `1px solid ${T.colors.secondaryGreen}`,
              }}
            >
              ASTRA · KANAN CACAO · TABASCO
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: T.colors.earthCacao,
                backgroundColor: T.colors.softCacaoBg,
                padding: '4px 10px',
                borderRadius: 6,
              }}
            >
              Supabase Auth · PostGIS
            </span>
          </div>

          <h1
            id="login-wall-title"
            style={{
              margin: 0,
              fontSize: '1.55rem',
              lineHeight: 1.25,
              color: T.colors.textPrimary,
            }}
          >
            Consola Administrativa EUDR y Carbono
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.92rem',
              lineHeight: 1.45,
              color: T.colors.textSecondary,
            }}
          >
            Inicia sesión con tu cuenta verificada de Supabase para consultar polígonos PostGIS en
            tiempo real, telemetría satelital Sentinel-2 y registros de báscula ciega.
          </p>
        </header>

        {errorMsg ? (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: T.colors.statusRedBg,
              color: T.colors.statusRed,
              border: `1px solid ${T.colors.statusRed}`,
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <label
              htmlFor="login-email"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: T.colors.textPrimary,
              }}
            >
              Correo electrónico institucional
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cacao-astra.org"
              className="field-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <label
              htmlFor="login-password"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: T.colors.textPrimary,
              }}
            >
              Contraseña de acceso
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="field-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Validando sesión en Supabase Auth...' : 'Entrar a la consola operativa'}
          </button>
        </form>

        <section
          aria-label="Cuentas operativas de demostración"
          style={{
            borderTop: `1px solid ${T.colors.borderSubtle}`,
            paddingTop: 14,
            display: 'grid',
            gap: 8,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              fontWeight: 700,
              color: T.colors.textSecondary,
            }}
          >
            Acceso rápido con operadores sembrados en Supabase Auth (clave demo: Kanan2026!):
          </p>

          <div style={{ display: 'grid', gap: 8 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin(acc.email)}
                className="btn-control"
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  backgroundColor: T.colors.surfaceElevated,
                  display: 'grid',
                  gap: 2,
                }}
              >
                <span style={{ fontWeight: 700, color: T.colors.primaryGreen, fontSize: '0.86rem' }}>
                  {acc.label} — {acc.email}
                </span>
                <span style={{ fontSize: '0.76rem', color: T.colors.textSecondary }}>
                  {acc.roleHint}
                </span>
              </button>
            ))}
          </div>
        </section>

        <footer
          style={{
            fontSize: '0.75rem',
            color: T.colors.textSecondary,
            lineHeight: 1.4,
            backgroundColor: T.colors.backgroundSecondary,
            padding: '8px 12px',
            borderRadius: 8,
          }}
        >
          Sesión protegida mediante JWT de Supabase Auth y políticas Row Level Security (RLS)
          sobre <code>profiles</code>, <code>parcels</code> y <code>harvest_receptions</code>.
        </footer>
      </section>
    </main>
  );
}
