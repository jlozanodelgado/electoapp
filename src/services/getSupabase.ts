import { supabase } from './supabaseClient';

/**
 * Helper to safely obtain the Supabase client.
 * Throws a clear error if the client is `null`, which happens when the environment
 * variables are missing or the placeholder key is still present.
 */
export const getSupabase = () => {
  if (!supabase) {
    const msg = 'Supabase not configured – ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.';
    console.error(msg);
    throw new Error(msg);
  }
  return supabase;
};

