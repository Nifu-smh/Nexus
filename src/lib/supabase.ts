import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'nexus_supabase_url';
const STORAGE_KEY_ANON = 'nexus_supabase_anon_key';

export const DEFAULT_SUPABASE_URL = 'https://cuhtmrcnssdnhehfmajc.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_dklFrcJRA3ggSou3VorU5Q_Uy92ZRr_';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_ANON_KEY;

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) || '' : '';

  const url = (localUrl || envUrl).trim();
  const anonKey = (localKey || envKey).trim();

  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    if (url && anonKey) {
      localStorage.setItem(STORAGE_KEY_URL, url.trim());
      localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_URL);
      localStorage.removeItem(STORAGE_KEY_ANON);
    }
  }
}

export function initSupabaseClient(): { client: SupabaseClient | null; isConfigured: boolean } {
  const { url, anonKey } = getSupabaseCredentials();

  const isConfigured = Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    !url.includes('your-project') &&
    anonKey.length > 20
  );

  if (!isConfigured) {
    return { client: null, isConfigured: false };
  }

  try {
    const client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return { client, isConfigured: true };
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return { client: null, isConfigured: false };
  }
}

const { client: initialClient, isConfigured: initialConfigured } = initSupabaseClient();
export const supabase = initialClient;
export const isSupabaseConfigured = initialConfigured;
