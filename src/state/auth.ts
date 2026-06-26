/*
 * Auth store (Zustand) — wraps Supabase magic-link (passwordless) auth.
 *
 * The session is persisted by supabase-js (localStorage) and auto-refreshed, so
 * users stay signed in across visits and the same account works on any device.
 * When a user signs in, any sessions saved locally while signed out are synced
 * up to their account.
 */
import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { setCurrentUser } from '../lib/user'
import { syncLocalSessions } from '../lib/history'

export type AuthStatus = 'loading' | 'signed_in' | 'signed_out'

interface AuthUser {
  id: string
  email: string
}

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  /** Whether Supabase env vars are present (sign-in only works if so). */
  configured: boolean
  init: () => void
  signIn: (email: string) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
}

let initialized = false

export const useAuth = create<AuthState>((set) => {
  const applyUser = (u: User | null) => {
    setCurrentUser(u?.id ?? null)
    set(
      u
        ? { status: 'signed_in', user: { id: u.id, email: u.email ?? '' } }
        : { status: 'signed_out', user: null },
    )
  }

  return {
    status: isSupabaseConfigured ? 'loading' : 'signed_out',
    user: null,
    configured: isSupabaseConfigured,

    init: () => {
      if (initialized) return
      initialized = true
      if (!supabase) {
        set({ status: 'signed_out' })
        return
      }

      // Resolve the current session on load (handles "stay signed in").
      void supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user ?? null))

      // React to magic-link completion, sign-out, token refresh, etc.
      supabase.auth.onAuthStateChange((event, session) => {
        const u = session?.user ?? null
        applyUser(u)
        // Only sync on a fresh sign-in (the magic-link return), not on reloads.
        if (event === 'SIGNED_IN' && u) void syncLocalSessions(u.id)
      })
    },

    signIn: async (email) => {
      if (!supabase) return { ok: false, error: 'Sign-in isn’t configured on this build.' }
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Where the email link returns the user. Must be allow-listed in
          // Supabase Auth → URL Configuration (see the README).
          emailRedirectTo: window.location.origin,
        },
      })
      return error ? { ok: false, error: error.message } : { ok: true }
    },

    signOut: async () => {
      if (supabase) await supabase.auth.signOut()
      applyUser(null)
    },
  }
})
