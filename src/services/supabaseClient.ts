import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WebUserRole } from '@/types/adminDomain';

export interface AuthenticatedOperatorProfile {
  userId: string;
  email: string;
  fullName: string;
  role: WebUserRole;
  accessToken: string;
}

function getCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return { url, key };
}

let clientInstance: SupabaseClient | null = null;
let lastUrl: string | null = null;
let lastKey: string | null = null;

export function isSupabaseConfigured(): boolean {
  const { url, key } = getCredentials();
  return Boolean(url) && Boolean(key) && !url.includes('tu-proyecto') && url.startsWith('http');
}

export function resolveRoleFromEmailOrProfile(
  email?: string | null,
  profileRole?: string | null,
): WebUserRole {
  const normalizedRole = (profileRole || '').trim().toLowerCase();
  if (normalizedRole) {
    return normalizedRole as WebUserRole;
  }

  const normalizedEmail = (email || '').trim().toLowerCase();
  if (normalizedEmail === 'admin@cacao-astra.org' || normalizedEmail.startsWith('admin@')) {
    return 'admin_astra';
  }
  if (normalizedEmail === 'auditor.eudr@cacao-astra.org' || normalizedEmail.includes('auditor')) {
    return 'auditor_sustentabilidad';
  }
  if (normalizedEmail.includes('tecnico')) {
    return 'tecnico_campo';
  }
  if (normalizedEmail.includes('acopio')) {
    return 'acopiador';
  }
  return 'productor';
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { url, key } = getCredentials();

  if (!clientInstance || lastUrl !== url || lastKey !== key) {
    clientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastUrl = url;
    lastKey = key;
  }

  return clientInstance;
}

async function hydrateOperatorProfile(
  client: SupabaseClient,
  userId: string,
  email: string,
  accessToken: string,
): Promise<AuthenticatedOperatorProfile> {
  const { data } = await client
    .from('profiles')
    .select('full_name, role')
    .eq('id', userId)
    .maybeSingle();

  const fullNameRaw = typeof data?.full_name === 'string' ? data.full_name.trim() : '';
  const roleRaw = typeof data?.role === 'string' ? data.role : null;
  let effectiveRole = resolveRoleFromEmailOrProfile(email, roleRaw);

  const geoBase = (
    process.env.NEXT_PUBLIC_GEO_ENGINE_API_URL ||
    process.env.NEXT_PUBLIC_GEO_ENGINE_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '');
  if (geoBase && geoBase.startsWith('http')) {
    try {
      const roleRes = await fetch(
        `${geoBase}/api/v1/admin/profile-role/${encodeURIComponent(userId)}?base_role=${encodeURIComponent(String(effectiveRole))}`,
        { method: 'GET', headers: { Accept: 'application/json' } },
      );
      if (roleRes.ok) {
        const body = (await roleRes.json()) as { role_key?: string };
        if (body.role_key) {
          effectiveRole = body.role_key as WebUserRole;
        }
      }
    } catch {
      // Mantiene el rol base desde Supabase si el microservicio remoto no está disponible.
    }
  }

  return {
    userId,
    email,
    fullName: fullNameRaw || email.split('@')[0] || 'Operador ASTRA',
    role: effectiveRole,
    accessToken,
  };
}

export async function signInWithSupabasePassword(
  email: string,
  password: string,
): Promise<AuthenticatedOperatorProfile> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase Auth no está configurado en las variables de entorno.');
  }

  const cleanEmail = email.trim();
  const { data, error } = await client.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error || !data.session || !data.user) {
    const rawMsg = error?.message || 'No se pudo autenticar en Supabase Auth.';
    if (rawMsg.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Credenciales inválidas. Verifica tu correo y contraseña.');
    }
    throw new Error(rawMsg);
  }

  return hydrateOperatorProfile(
    client,
    data.user.id,
    data.user.email || cleanEmail,
    data.session.access_token,
  );
}

export async function getActiveSupabaseSession(): Promise<AuthenticatedOperatorProfile | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getSession();
  if (error || !data.session || !data.session.user || !data.session.access_token) {
    return null;
  }

  // Verifica contra el servidor de Auth que el token no haya sido revocado ni expirado.
  if (typeof client.auth.getUser === 'function') {
    const { data: userCheck, error: userError } = await client.auth.getUser(
      data.session.access_token,
    );
    if (userError || !userCheck?.user) {
      return null;
    }
  }

  return hydrateOperatorProfile(
    client,
    data.session.user.id,
    data.session.user.email || '',
    data.session.access_token,
  );
}

export function subscribeToSupabaseAuthChanges(onSignedOut: () => void): () => void {
  const client = getSupabaseClient();
  if (!client || typeof client.auth.onAuthStateChange !== 'function') {
    return () => {};
  }

  const { data } = client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      onSignedOut();
    }
  });

  return () => {
    data?.subscription?.unsubscribe();
  };
}

export async function signOutSupabaseSession(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  await client.auth.signOut();
}
