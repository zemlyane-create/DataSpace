import { createClient, SupabaseClient } from '@supabase/supabase-js';
export type { Database } from '../types/database.types';

// Retrieve environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Validates the presence and format of Supabase environment credentials.
 * Throws a descriptive error or logs an informative warning.
 */
function validateSupabaseEnv(url?: string, key?: string): { isValid: boolean; error?: string } {
  if (!url || !key) {
    const missing: string[] = [];
    if (!url) missing.push('VITE_SUPABASE_URL');
    if (!key) missing.push('VITE_SUPABASE_ANON_KEY');
    return {
      isValid: false,
      error: `Supabase environment variable(s) missing: ${missing.join(', ')}. Please check your .env configuration.`,
    };
  }

  try {
    new URL(url);
  } catch {
    return {
      isValid: false,
      error: `Invalid VITE_SUPABASE_URL format: "${url}". It must be a valid HTTPS URL.`,
    };
  }

  return { isValid: true };
}

const envCheck = validateSupabaseEnv(supabaseUrl, supabaseAnonKey);

if (!envCheck.isValid) {
  console.warn(`[SupabaseClient Warning] ${envCheck.error}`);
}

/**
 * Fallback values for development / preview safety to prevent runtime crashes
 * if credentials have not been configured yet.
 */
const activeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const activeAnonKey = supabaseAnonKey || 'placeholder-anon-key';

/**
 * Initialized Supabase client instance.
 */
export const supabaseClient: SupabaseClient = createClient(
  activeUrl,
  activeAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Helper to check if Supabase is properly configured and ready for live network queries.
 */
export const isSupabaseConfigured = (): boolean => envCheck.isValid;

/**
 * Returns the Supabase client or throws if credentials are not configured.
 */
export function getRequiredSupabaseClient(): SupabaseClient {
  if (!envCheck.isValid) {
    throw new Error(envCheck.error || 'Supabase is not configured properly in environment variables.');
  }
  return supabaseClient;
}

export default supabaseClient;
