/*
 * History overlay — the user's past Pomodoro sessions, grouped by day.
 *
 * Aggregate stats up top (emphasis via type size/weight, never color), then
 * hairline-divided rows. Delete a single session with a subtle inline confirm,
 * or clear everything with a clear confirmation. Monochrome throughout, with an
 * elegant empty state.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Trash2, X } from 'lucide-react'
import {
  clearAllSessions,
  deleteSession,
  listSessions,
  type SessionRecord,
} from '../lib/history'
import { useAuth } from '../state/auth'
import { useUI } from '../state/ui'
import {
  dayKey,
  dayLabel,
  formatDuration,
  isToday,
  startOfWeek,
  timeLabel,
} from '../lib/time'

export function HistoryView() {
  const close = useUI((s) => s.closeHistory)
  const openAuth = useUI((s) => s.openAuth)
  const authStatus = useAuth((s) => s.status)
  const configured = useAuth((s) => s.configured)

  const [sessions, setSessions] = useState<SessionRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setSessions(await listSessions())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load history.')
      setSessions([])
    }
  }, [])

  // Reload whenever auth changes (signed in → remote, out → local).
  useEffect(() => {
    void load()
  }, [load, authStatus])

  const onDelete = async (id: string) => {
    setSessions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev))
    try {
      await deleteSession(id)
    } catch {
      void load() // restore truth on failure
    }
  }

  const onClearAll = async () => {
    setConfirmClear(false)
    setSessions([])
    try {
      await clearAllSessions()
    } catch {
      void load()
    }
  }

  const stats = useMemo(() => computeStats(sessions ?? []), [sessions])
  const groups = useMemo(() => groupByDay(sessions ?? []), [sessions])
  const hasAny = (sessions?.length ?? 0) > 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg animate-fade-in">
      <div className="mx-auto w-full max-w-xl px-5 pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 -mx-5 flex items-center justify-between bg-bg/80 px-5 py-6 backdrop-blur">
          <h1 className="text-[22px] font-medium tracking-tight text-content">History</h1>
          <button
            onClick={close}
            aria-label="Close history"
            className="grid h-9 w-9 place-items-center rounded-full text-tertiary transition-colors duration-200 hover:bg-fill hover:text-content"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </header>

        {/* Loading */}
        {sessions === null ? (
          <div className="grid place-items-center py-32 text-tertiary">
            <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.5} />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-10 grid grid-cols-3 gap-4">
              <Stat value={formatDuration(stats.weekFocusMinutes)} label="This week" />
              <Stat value={String(stats.todaySessions)} label="Today" />
              <Stat value={String(stats.totalSessions)} label="All time" />
            </div>

            {/* Sign-in nudge for local-only history. */}
            {configured && authStatus === 'signed_out' && hasAny && (
              <button
                onClick={openAuth}
                className="mb-8 w-full rounded-[var(--radius-lg)] border border-hairline px-4 py-3 text-left text-[13px] text-secondary transition-colors duration-200 hover:bg-fill hover:text-content"
              >
                These sessions are saved on this device.{' '}
                <span className="text-content underline underline-offset-4">Sign in</span> to sync
                them across devices.
              </button>
            )}

            {error && (
              <p className="mb-6 text-[13px] leading-relaxed text-secondary">{error}</p>
            )}

            {/* List or empty state */}
            {!hasAny ? (
              <EmptyState />
            ) : (
              <>
                {groups.map((group) => (
                  <section key={group.key} className="mb-8">
                    <h2 className="mb-1 text-[12px] font-medium uppercase tracking-[0.14em] text-tertiary">
                      {group.label}
                    </h2>
                    <ul>
                      {group.items.map((s) => (
                        <Row key={s.id} session={s} onDelete={() => onDelete(s.id)} />
                      ))}
                    </ul>
                  </section>
                ))}

                {/* Clear all */}
                <div className="mt-10 flex justify-center">
                  {confirmClear ? (
                    <div className="flex items-center gap-3 text-[13px]">
                      <span className="text-secondary">Delete all history?</span>
                      <button
                        onClick={onClearAll}
                        className="rounded-full bg-ink px-4 py-1.5 font-medium text-ink-contrast transition-opacity hover:opacity-90"
                      >
                        Clear all
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="rounded-full border border-hairline px-4 py-1.5 text-secondary transition-colors hover:bg-fill hover:text-content"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="text-[13px] text-tertiary underline-offset-4 transition-colors hover:text-content hover:underline"
                    >
                      Clear all history
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[28px] font-light leading-none tracking-tight tabular-nums text-content">
        {value}
      </span>
      <span className="mt-2 text-[11px] uppercase tracking-[0.1em] text-tertiary">{label}</span>
    </div>
  )
}

/* A single session row with an inline (non-jarring) delete confirm. */
function Row({ session, onDelete }: { session: SessionRecord; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <li className="group flex items-center gap-3 border-b border-hairline py-3.5 last:border-b-0">
      <span className="w-16 shrink-0 text-[13px] tabular-nums text-secondary">
        {timeLabel(session.started_at)}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[14px] text-content">
          {session.session_type === 'break' ? 'Break' : 'Focus'}
          <span className="text-tertiary"> · {formatDuration(session.duration_minutes)}</span>
        </span>
        {session.soundscape && (
          <p className="truncate text-[12px] text-tertiary">{session.soundscape}</p>
        )}
      </div>

      {confirm ? (
        <div className="flex items-center gap-2 text-[12px]">
          <button
            onClick={onDelete}
            className="rounded-full bg-ink px-3 py-1 font-medium text-ink-contrast transition-opacity hover:opacity-90"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirm(false)}
            aria-label="Cancel delete"
            className="grid h-6 w-6 place-items-center rounded-full text-tertiary transition-colors hover:bg-fill hover:text-content"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          aria-label="Delete session"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-tertiary opacity-0 transition-all duration-200 hover:bg-fill hover:text-content focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}
    </li>
  )
}

function EmptyState() {
  return (
    <div className="grid place-items-center py-28 text-center">
      <p className="text-[16px] text-content">No sessions yet</p>
      <p className="mt-2 max-w-[16rem] text-[13px] leading-relaxed text-tertiary">
        Finish a focus session and it’ll appear here — quietly tracked, just for you.
      </p>
    </div>
  )
}

// ── derived data ────────────────────────────────────────────────────────────
interface DayGroup {
  key: string
  label: string
  items: SessionRecord[]
}

function groupByDay(sessions: SessionRecord[]): DayGroup[] {
  const map = new Map<string, DayGroup>()
  for (const s of sessions) {
    const key = dayKey(s.started_at)
    if (!map.has(key)) map.set(key, { key, label: dayLabel(s.started_at), items: [] })
    map.get(key)!.items.push(s)
  }
  // sessions arrive newest-first, so insertion order is already correct
  return [...map.values()]
}

function computeStats(sessions: SessionRecord[]) {
  const weekStart = startOfWeek()
  let weekFocusMinutes = 0
  let todaySessions = 0
  for (const s of sessions) {
    const t = new Date(s.started_at).getTime()
    if (s.session_type === 'focus' && t >= weekStart) weekFocusMinutes += s.duration_minutes || 0
    if (isToday(s.started_at)) todaySessions += 1
  }
  return { weekFocusMinutes, todaySessions, totalSessions: sessions.length }
}
