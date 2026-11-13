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
