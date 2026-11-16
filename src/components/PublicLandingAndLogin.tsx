'use client';

import React, { useState } from 'react';
import {
  AuthenticatedOperatorProfile,
  signInWithSupabasePassword,
} from '@/services/supabaseClient';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';

interface PublicLandingAndLoginProps {
  onAuthenticated: (profile: AuthenticatedOperatorProfile) => void;
}

const VALUE_PILLARS = [
  {
    icon: '🛰️',
    title: 'Georreferencia y mapa satelital de tu parcela',
    body: 'Dibuja y verifica los linderos de tus terrenos sobre fotografía satelital real para tener tus superficies claras.',
  },
  {
    icon: '📓',
    title: 'Bitácora de campo con fotos y fechas',
    body: 'Anota cuándo fertilizas, podas o limpias tu cacaotal, anota la fecha esperada de cosecha y adjunta fotos de evidencia.',
  },
  {
    icon: '⚖️',
    title: 'Cosecha y mesa de acopio justa',
    body: 'Registra mazorcas, fermentación y secado hasta llegar a la báscula, obteniendo tu comprobante digital de entrega.',
  },
  {
    icon: '🌳',
    title: 'Árboles de sombra y bonos de carbono',
    body: 'Lleva el conteo de tus árboles maderables y frutales para sumar con tus vecinos y acceder a apoyos ambientales.',
  },
] as const;

export default function PublicLandingAndLogin({ onAuthenticated }: PublicLandingAndLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Escribe tu correo electrónico y tu contraseña para entrar.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const profile = await signInWithSupabasePassword(cleanEmail, password);
      onAuthenticated(profile);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No pudimos verificar tus datos. Revisa tu correo y contraseña.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: T.colors.backgroundPrimary,
        color: T.colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          backgroundColor: T.colors.primaryGreen,
          color: '#FFFFFF',
          padding: '14px 24px',
          borderBottom: `3px solid ${T.colors.earthCacao}`,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span aria-hidden="true" style={{ fontSize: '1.35rem' }}>
              🌿
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.02em' }}>
                Kanan Cacao
              </div>
              <div style={{ fontSize: '0.76rem', opacity: 0.9 }}>
                Guardián del Cacao y de la Sombra · Tabasco, México
              </div>
            </div>
          </div>

          <span
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.38)',
              padding: '5px 12px',
              borderRadius: 999,
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            Acceso protegido · Solo cuentas autorizadas
          </span>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          padding: '32px 20px 44px',
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 28,
          alignItems: 'start',
        }}
      >
        <section aria-labelledby="landing-hero-title" style={{ display: 'grid', gap: 20 }}>
          <div
            style={{
              backgroundColor: T.colors.surfaceCard,
              border: `1.5px solid ${T.colors.borderSubtle}`,
              borderRadius: 16,
              padding: '28px 24px',
              boxShadow: '0 8px 24px rgba(20, 69, 38, 0.06)',
              display: 'grid',
              gap: 14,
            }}
          >
            <span
              style={{
                justifySelf: 'start',
                fontSize: '0.76rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: T.colors.primaryGreen,
                backgroundColor: T.colors.softGreenBg,
                padding: '4px 12px',
                borderRadius: 999,
                border: `1px solid ${T.colors.secondaryGreen}`,
              }}
            >
              DEL CACAOTAL AL CENTRO DE ACOPIO
            </span>

            <h1
              id="landing-hero-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.65rem, 2.8vw, 2.3rem)',
                lineHeight: 1.2,
                color: T.colors.primaryGreen,
              }}
            >
              Cuida tu parcela de cacao, guarda tus labores y respalda tu cosecha en un solo lugar.
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: '1rem',
                lineHeight: 1.6,
                color: T.colors.textSecondary,
              }}
            >
              <strong>Kanan Cacao</strong> es una herramienta sencilla hecha para productoras,
              productores, técnicos y centros de acopio en la Chontalpa. Te ayuda a ubicar tus
              parcelas en el mapa satelital, anotar fertilizaciones y cortes con fotos, registrar tus
              entregas en báscula y sumar tus árboles de sombra para bonos de carbono.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
                marginTop: 6,
              }}
            >
              {VALUE_PILLARS.map((item) => (
                <article
                  key={item.title}
                  style={{
                    backgroundColor: T.colors.surfaceElevated,
                    border: `1px solid ${T.colors.borderSubtle}`,
                    borderRadius: 12,
                    padding: 14,
                    display: 'grid',
                    gap: 6,
                    alignContent: 'start',
                  }}
                >
                  <div style={{ fontSize: '1.35rem' }} aria-hidden="true">
                    {item.icon}
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: T.colors.primaryGreen,
                    }}
                  >
                    {item.title}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.84rem',
                      lineHeight: 1.45,
                      color: T.colors.textSecondary,
                    }}
                  >
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div
            style={{
              backgroundColor: T.colors.softCacaoBg,
              border: `1px solid ${T.colors.earthCacao}`,
              borderRadius: 14,
              padding: '18px 20px',
              display: 'grid',
              gap: 8,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '0.98rem',
                color: T.colors.earthCacao,
              }}
            >
              ¿Cómo funciona tu cuenta en 3 pasos?
            </h2>
            <ol
              style={{
                margin: 0,
                paddingLeft: 20,
                fontSize: '0.88rem',
                lineHeight: 1.55,
                color: T.colors.textPrimary,
                display: 'grid',
                gap: 4,
              }}
            >
              <li>
                <strong>1. Ubica tu parcela:</strong> Consulta tus terrenos o registra una nueva
                georreferencia con vista satelital real.
              </li>
              <li>
                <strong>2. Lleva tu bitácora:</strong> Anota fechas de fertilización, podas,
                cosechas y sube tus fotos del terreno.
              </li>
              <li>
                <strong>3. Entrega y suma sombra:</strong> Registra tu cacao en la mesa de acopio y
                reúne tus árboles de sombra con la comunidad.
              </li>
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="login-card-title"
          style={{
            backgroundColor: T.colors.surfaceCard,
            border: `2px solid ${T.colors.primaryGreen}`,
            borderRadius: 16,
            padding: '28px 24px',
            boxShadow: '0 12px 32px rgba(20, 69, 38, 0.12)',
            display: 'grid',
            gap: 16,
          }}
        >
          <div style={{ display: 'grid', gap: 6 }}>
            <span
              style={{
                justifySelf: 'start',
                fontSize: '0.74rem',
                fontWeight: 800,
                color: T.colors.earthCacao,
                backgroundColor: T.colors.softCacaoBg,
                padding: '3px 10px',
                borderRadius: 6,
              }}
            >
              INICIO DE SESIÓN SEGURO
            </span>
            <h2
              id="login-card-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.5rem',
                color: T.colors.primaryGreen,
              }}
            >
              Entrar a Kanan Cacao
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.88rem',
                lineHeight: 1.45,
                color: T.colors.textSecondary,
              }}
            >
              Para cuidar tus datos, parcelas y entregas, necesitas iniciar sesión con el correo y
              la contraseña de tu cuenta.
            </p>
          </div>

          {errorMsg ? (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: T.colors.statusRedBg,
                color: T.colors.statusRed,
                border: `1.5px solid ${T.colors.statusRed}`,
                fontSize: '0.86rem',
                fontWeight: 700,
              }}
            >
              {errorMsg}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label
                htmlFor="landing-login-email"
                style={{
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: T.colors.textPrimary,
                }}
              >
                Correo electrónico
              </label>
              <input
                id="landing-login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.org"
                className="field-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label
                htmlFor="landing-login-password"
                style={{
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: T.colors.textPrimary,
                }}
              >
                Contraseña
              </label>
              <input
                id="landing-login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Escribe tu contraseña"
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
                marginTop: 6,
                padding: '12px 16px',
                fontSize: '0.96rem',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Verificando cuenta...' : 'Iniciar sesión'}
            </button>
          </form>

          <div
            style={{
              backgroundColor: T.colors.backgroundPrimary,
              border: `1px solid ${T.colors.borderSubtle}`,
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: '0.8rem',
              lineHeight: 1.45,
              color: T.colors.textSecondary,
            }}
          >
            <strong>¿Aún no tienes usuario o olvidaste tu clave?</strong> Solicita tu alta o
            restablecimiento directamente con el equipo técnico de tu cooperativa en Tabasco. Nadie
            sin sesión verificada puede entrar al panel.
          </div>
        </section>
      </main>

      <footer
        style={{
          backgroundColor: T.colors.backgroundSecondary,
          borderTop: `1px solid ${T.colors.borderSubtle}`,
          padding: '14px 20px',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: T.colors.textSecondary,
        }}
      >
        Kanan Cacao · ASTRA S.A.S. · Región Grijalva–Chontalpa, Tabasco, México
      </footer>
    </div>
  );
}
