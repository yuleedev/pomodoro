/*
 * Magic-link sign-in overlay. Frictionless and passwordless: enter an email,
 * get a link, click it, you're in. Centered monochrome type, one thin input,
 * one primary button - matching the rest of the app.
 *
 * States: form (signed out) · sending · "check your email" · error.
 * It auto-closes once auth completes (e.g. when the link is opened here).
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Mail, X } from 'lucide-react'
import { useAuth } from '../state/auth'
import { useUI } from '../state/ui'
import { popSpring } from '../lib/motion'

export function AuthPanel() {
  const close = useUI((s) => s.closeAuth)
  const signIn = useAuth((s) => s.signIn)
  const configured = useAuth((s) => s.configured)
  const status = useAuth((s) => s.status)

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If the user becomes signed in while this is open, dismiss it.
  useEffect(() => {
    if (status === 'signed_in') close()
  }, [status, close])

  const valid = /\S+@\S+\.\S+/.test(email.trim())

  const submit = async () => {
    if (!valid || sending) return
    setSending(true)
    setError(null)
    const res = await signIn(email)
    setSending(false)
    if (res.ok) setSent(true)
    else setError(res.error ?? 'Something went wrong. Try again.')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg px-6 animate-fade-in">
      <button
        onClick={close}
        aria-label="Close"
        className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full text-tertiary transition-colors duration-200 hover:bg-fill hover:text-content"
      >
        <X className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={popSpring}
        className="w-full max-w-sm text-center"
      >
        {!configured ? (
          // Graceful state when the build has no Supabase env configured.
          <>
            <h1 className="text-[30px] font-medium tracking-tight text-content">Sign-in unavailable</h1>
            <p className="mx-auto mt-4 max-w-xs text-[16px] leading-relaxed text-secondary">
              This build isn’t connected to Supabase yet. Your history is still
              saved on this device. See the README to enable accounts.
            </p>
          </>
        ) : sent ? (
          // "Check your email" confirmation.
          <>
            <div className="mx-auto mb-7 grid h-14 w-14 place-items-center rounded-full bg-fill text-content">
              <Mail className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h1 className="text-[30px] font-medium tracking-tight text-content">Check your email</h1>
            <p className="mx-auto mt-4 max-w-xs text-[16px] leading-relaxed text-secondary">
              We sent a sign-in link to{' '}
              <span className="text-content">{email.trim()}</span>. Open it on any
              device to finish signing in.
            </p>
            <button
              onClick={() => {
                setSent(false)
                setError(null)
              }}
              className="mt-8 text-[15px] text-tertiary underline-offset-4 transition-colors hover:text-content hover:underline"
            >
              Use a different email
            </button>
          </>
        ) : (
          // The sign-in form.
          <>
            <h1 className="text-[33px] font-medium tracking-tight text-content">Sign in</h1>
            <p className="mx-auto mt-3 max-w-xs text-[16px] leading-relaxed text-secondary">
              We’ll email you a magic link, no password needed.
            </p>

            <div className="mt-9">
              <div className="glass flex items-center gap-3 rounded-[var(--radius-xl)] px-4 py-3.5 shadow-[var(--shadow)] transition-all duration-300 ease-[var(--ease-out)] focus-within:scale-[1.01]">
                <Mail className="h-5 w-5 shrink-0 text-tertiary" strokeWidth={1.5} />
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 bg-transparent text-[17px] text-content placeholder:text-tertiary focus:outline-none"
                  aria-label="Email address"
                />
              </div>

              <button
                onClick={submit}
                disabled={!valid || sending}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-[16px] font-medium text-ink-contrast transition-all duration-200 ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.98] disabled:opacity-30 disabled:hover:opacity-30"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    Sending…
                  </>
                ) : (
                  <>
                    Send magic link
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="animate-fade-in mt-4 text-[15px] leading-relaxed text-secondary">{error}</p>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
