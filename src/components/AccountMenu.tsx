/*
 * Header account control + history entry point. Minimal and discreet:
 *   • a History button (always available — local or synced),
 *   • an account affordance that adapts to auth state:
 *       loading  → a quiet spinner
 *       signed out (configured) → "Sign in"
 *       signed in → an initial avatar that opens a small menu (email + sign out)
 * If Supabase isn't configured, no account control is shown (history stays local).
 */
import { useState } from 'react'
import { Clock, Loader2, LogOut, User } from 'lucide-react'
import { useAuth } from '../state/auth'
import { useUI } from '../state/ui'

export function AccountMenu() {
  const status = useAuth((s) => s.status)
  const user = useAuth((s) => s.user)
  const configured = useAuth((s) => s.configured)
  const signOut = useAuth((s) => s.signOut)
  const openAuth = useUI((s) => s.openAuth)
  const openHistory = useUI((s) => s.openHistory)

  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={openHistory}
        aria-label="History"
        className="grid h-9 w-9 place-items-center rounded-full text-secondary transition-colors duration-200 hover:bg-fill hover:text-content"
      >
        <Clock className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>

      {/* Account affordance (only when sign-in is possible). */}
      {configured && status === 'loading' && (
        <div className="grid h-9 w-9 place-items-center text-tertiary" aria-label="Loading account">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        </div>
      )}

      {configured && status === 'signed_out' && (
        <button
          onClick={openAuth}
          className="rounded-full border border-hairline px-3.5 py-1.5 text-[13px] text-secondary transition-colors duration-200 hover:bg-fill hover:text-content"
        >
          Sign in
        </button>
      )}

      {configured && status === 'signed_in' && user && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account"
            aria-expanded={menuOpen}
            className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[13px] font-medium uppercase text-ink-contrast transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {initial(user.email)}
          </button>

          {menuOpen && (
            <>
              {/* Click-away catcher. */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="glass animate-fade-in absolute right-0 top-11 z-50 w-60 rounded-[var(--radius-lg)] p-2 shadow-[var(--shadow)]">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fill text-content">
                    <User className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-tertiary">Signed in</p>
                    <p className="truncate text-[13px] text-content">{user.email}</p>
                  </div>
                </div>
                <div className="my-1 h-px bg-hairline" />
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    void signOut()
                  }}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 text-left text-[13px] text-secondary transition-colors duration-200 hover:bg-fill hover:text-content"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function initial(email: string): string {
  return email.trim().charAt(0) || '?'
}
