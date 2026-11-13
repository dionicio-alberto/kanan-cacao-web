import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
