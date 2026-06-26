/*
 * Supabase client. Reads the URL + anon key from VITE_-prefixed env vars so
 * they're configured per-deployment and never hardcoded. The anon key is safe
 * in the browser because Row-Level Security (see supabase/schema.sql) restricts
 * every row to its owner.
 *
 * If the env vars are absent the client is `null` and the app runs in
 * local-only mode (history in localStorage, no sign-in) — so it still works
 * out of the box before Supabase is set up.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // Keep the user signed in across visits and devices, and complete the
        // magic-link sign-in automatically when they return via the email link.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
