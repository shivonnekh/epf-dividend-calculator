import { createClient } from '@supabase/supabase-js'

/**
 * Singleton Supabase client for the EPF Calculator.
 *
 * Reuses the same Supabase project as the Whaley app. Env vars must be
 * set in `.env.local` (local dev) or in the Vercel project environment
 * (production). Never commit real values.
 *
 * We warn (not throw) if env vars are missing so the app still runs in
 * pure-localStorage / offline mode — cloud sync just won't engage.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

if (!hasSupabaseConfig) {
  // eslint-disable-next-line no-console
  console.warn(
    '[epf] Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'Running in local-only mode — no cross-device sync.',
  )
}

export const supabase = createClient(
  SUPABASE_URL ?? 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Isolate auth storage from the Whaley app so the two apps don't
      // fight over the same Supabase session token in localStorage.
      storageKey: 'epf-supabase-auth',
    },
    realtime: {
      params: {
        eventsPerSecond: 5,
      },
    },
  },
)
