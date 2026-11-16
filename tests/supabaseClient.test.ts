import { isSupabaseConfigured, getSupabaseClient } from '../src/services/supabaseClient';

describe('Supabase Client Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('detects unconfigured supabase state when placeholders are present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://tu-proyecto.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'tu_public_anon_key_aqui';

    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabaseClient()).toBeNull();
  });

  it('initializes supabase client when valid credentials are provided', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyzcompany.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-abc-123';

    expect(isSupabaseConfigured()).toBe(true);
    const client = getSupabaseClient();
    expect(client).not.toBeNull();
  });
});


describe('resolveRoleFromEmailOrProfile y helpers de Supabase Auth', () => {
  it('prioriza el rol explícito desde public.profiles sobre el correo', async () => {
    const { resolveRoleFromEmailOrProfile } = await import('@/services/supabaseClient');
    expect(resolveRoleFromEmailOrProfile('alguien@cacao-astra.org', 'admin_astra')).toBe(
      'admin_astra'
    );
    expect(
      resolveRoleFromEmailOrProfile('alguien@cacao-astra.org', 'auditor_sustentabilidad')
    ).toBe('auditor_sustentabilidad');
    expect(resolveRoleFromEmailOrProfile('admin@cacao-astra.org', 'acopiador')).toBe('acopiador');
  });

  it('mapea los correos semilla cuando profileRole no es rol web directo', async () => {
    const { resolveRoleFromEmailOrProfile } = await import('@/services/supabaseClient');
    expect(resolveRoleFromEmailOrProfile('admin@cacao-astra.org', null)).toBe('admin_astra');
    expect(resolveRoleFromEmailOrProfile('auditor.eudr@cacao-astra.org', undefined)).toBe(
      'auditor_sustentabilidad'
    );
    expect(resolveRoleFromEmailOrProfile('acopio.chontalpa@cacao-astra.org', 'tecnico_campo')).toBe(
      'acopiador'
    );
  });

  it('retorna null en getActiveSupabaseSession si Supabase no está configurado', async () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    jest.resetModules();

    const { getActiveSupabaseSession } = await import('@/services/supabaseClient');
    const session = await getActiveSupabaseSession();
    expect(session).toBeNull();

    if (prevUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    if (prevKey !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
  });
});


  it('retorna función unsubscribe segura en subscribeToSupabaseAuthChanges sin entorno configurado', async () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    jest.resetModules();

    const { subscribeToSupabaseAuthChanges } = await import('@/services/supabaseClient');
    const unsubscribe = subscribeToSupabaseAuthChanges(() => {});
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();

    if (prevUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    if (prevKey !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
  });
