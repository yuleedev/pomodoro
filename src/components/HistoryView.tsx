/*
 * History overlay - the user's past Pomodoro sessions, grouped by day.
 *
 * Aggregate stats up top (emphasis via type size/weight, never color), then
 * hairline-divided rows. Delete a single session with a subtle inline confirm,
 * or clear everything with a clear confirmation. Monochrome throughout, with an
 * elegant empty state.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Trash2, X } from 'lucide-react'
import {
  clearAllSessions,
  deleteSession,
  listSessions,
  type SessionRecord,
} from '../lib/history'
import { seedDemoSessions } from '../lib/seed'
import { bestDayMinutes, currentStreak, focusByDay } from '../lib/analytics'
import { overlaySpring, softSpring, spring } from '../lib/motion'
import { HistoryGraphs } from './HistoryGraphs'
import { useAuth } from '../state/auth'
import { useUI } from '../state/ui'
import { dayKey, dayLabel, formatDuration, startOfWeek, timeLabel } from '../lib/time'

const DAYS_PER_PAGE = 10

export function HistoryView() {
  const close = useUI((s) => s.closeHistory)
  const openAuth = useUI((s) => s.openAuth)
  const authStatus = useAuth((s) => s.status)
  const configured = useAuth((s) => s.configured)

  const [sessions, setSessions] = useState<SessionRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [page, setPage] = useState(1)
  const sessionsRef = useRef<HTMLDivElement>(null)

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
  const totalPages = Math.max(1, Math.ceil(groups.length / DAYS_PER_PAGE))
  // Clamp in case deletes shrank the list while on a later page.
  const safePage = Math.min(page, totalPages)
  const shownGroups = groups.slice((safePage - 1) * DAYS_PER_PAGE, safePage * DAYS_PER_PAGE)

  const goToPage = (n: number) => {
    setPage(Math.max(1, Math.min(n, totalPages)))
    sessionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // DEV-ONLY: fill the graphs with believable history so they can be previewed
  // without running real 25-minute sessions. Remove with src/lib/seed.ts.
  const onSeedDemo = () => {
    setError(null)
    setSessions(seedDemoSessions())
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={overlaySpring}
        className="mx-auto w-full max-w-xl px-5 pb-24"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 -mx-5 flex items-center justify-between bg-bg/80 px-5 py-6 backdrop-blur">
          <h1 className="text-[24px] font-medium tracking-tight text-content">History</h1>
          <div className="flex items-center gap-2">
            {/* DEV-ONLY preview helper - remove with src/lib/seed.ts */}
            {import.meta.env.DEV && (
              <button
                onClick={onSeedDemo}
                className="rounded-full border border-hairline px-3 py-1.5 text-[12px] text-tertiary transition-colors duration-200 hover:bg-fill hover:text-content"
              >
                Load demo data
              </button>
            )}
            <button
              onClick={close}
              aria-label="Close history"
              className="grid h-9 w-9 place-items-center rounded-full text-tertiary transition-colors duration-200 hover:bg-fill hover:text-content"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Loading */}
        {sessions === null ? (
          <div className="grid place-items-center py-32 text-tertiary">
            <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.5} />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-10 grid grid-cols-4 gap-3">
              <Stat value={formatDuration(stats.weekFocusMinutes)} label="This week" index={0} />
              <Stat
                value={stats.streak > 0 ? `${stats.streak}d` : '0'}
                label="Streak"
                index={1}
              />
              <Stat value={formatDuration(stats.bestDayMinutes)} label="Best day" index={2} />
              <Stat value={String(stats.totalSessions)} label="Sessions" index={3} />
            </div>

            {/* Sign-in nudge for local-only history. */}
            {configured && authStatus === 'signed_out' && hasAny && (
              <button
                onClick={openAuth}
                className="mb-8 w-full rounded-[var(--radius-lg)] border border-hairline px-4 py-3 text-left text-[14px] text-secondary transition-colors duration-200 hover:bg-fill hover:text-content"
              >
                These sessions are saved on this device.{' '}
                <span className="text-content underline underline-offset-4">Sign in</span> to sync
                them across devices.
              </button>
            )}

            {error && (
              <p className="mb-6 text-[14px] leading-relaxed text-secondary">{error}</p>
            )}

            {/* List or empty state */}
            {!hasAny ? (
              <EmptyState />
            ) : (
              <>
                <HistoryGraphs sessions={sessions} />

                <CategoryBreakdown sessions={sessions} />

                {/* Collapsible day-by-day log — each day expands to its sessions.
                    Paginated by day (10 per page) with numbered pages below. */}
                <div ref={sessionsRef} className="mb-2 flex items-baseline justify-between scroll-mt-20">
                  <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-tertiary">
                    Sessions
                  </h2>
                  <span className="text-[12px] text-tertiary">
                    {groups.length} {groups.length === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div className="border-t border-hairline">
                  {shownGroups.map((group, i) => (
                    <DayGroup
                      key={group.key}
                      group={group}
                      defaultOpen={i === 0}
                      onDelete={onDelete}
                    />
                  ))}
                </div>

                <Pagination page={safePage} totalPages={totalPages} onChange={goToPage} />

                {/* Clear all */}
                <div className="mt-10 flex justify-center">
                  {confirmClear ? (
                    <div className="flex items-center gap-3 text-[14px]">
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
                      className="text-[14px] text-tertiary underline-offset-4 transition-colors hover:text-content hover:underline"
                    >
                      Clear all history
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}

function Stat({ value, label, index = 0 }: { value: string; label: string; index?: number }) {
  return (
    <motion.div
      className="flex flex-col"
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay: 0.05 + index * 0.06 }}
    >
      <span className="text-[25px] font-light leading-none tracking-tight tabular-nums text-content">
        {value}
      </span>
      <span className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-tertiary">{label}</span>
    </motion.div>
  )
}

/* A collapsible day - header shows the day's totals; expand to see each session.
   Only the open day mounts its session rows, so a long history stays cheap. */
function DayGroup({
  group,
  defaultOpen,
  onDelete,
}: {
  group: DayGroup
  defaultOpen: boolean
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-hairline">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-3 py-3.5 text-left"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-tertiary transition-transform duration-200 ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
          strokeWidth={1.5}
        />
        <span className="flex-1 text-[15px] text-content">{group.label}</span>
        <span className="text-[13px] tabular-nums text-tertiary">
          {group.items.length} {group.items.length === 1 ? 'session' : 'sessions'}
          {group.focusMinutes > 0 && (
            <span className="text-secondary"> · {formatDuration(group.focusMinutes)}</span>
          )}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={softSpring}
            className="overflow-hidden"
          >
            <ul className="pb-2 pl-7">
              {group.items.map((s) => (
                <Row key={s.id} session={s} onDelete={() => onDelete(s.id)} />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* A single session row with an inline (non-jarring) delete confirm. */
function Row({ session, onDelete }: { session: SessionRecord; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <li className="group flex items-center gap-3 border-b border-hairline py-3.5 last:border-b-0">
      <span className="w-16 shrink-0 text-[14px] tabular-nums text-secondary">
        {timeLabel(session.started_at)}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-[15px] text-content">
          {session.session_type === 'break' ? 'Break' : 'Focus'}
          <span className="text-tertiary"> · {formatDuration(session.duration_minutes)}</span>
          {session.category && <span className="text-tertiary"> · {session.category}</span>}
        </span>
        {session.soundscape && (
          <p className="truncate text-[13px] text-tertiary">{session.soundscape}</p>
        )}
      </div>

      {confirm ? (
        <div className="flex items-center gap-2 text-[13px]">
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

/* Numbered pagination for the day log: ‹ 1 … 4 5 6 … 12 › */
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (n: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-1.5"
      aria-label="History pages"
    >
      <PagerButton
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
      </PagerButton>

      {pageList(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-[13px] text-tertiary">
            …
          </span>
        ) : (
          <PagerButton key={p} onClick={() => onChange(p)} active={p === page} label={`Page ${p}`}>
            {p}
          </PagerButton>
        ),
      )}

      <PagerButton
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        label="Next page"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
      </PagerButton>
    </nav>
  )
}

function PagerButton({
  onClick,
  disabled,
  active,
  label,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`grid h-8 min-w-8 place-items-center rounded-full px-2 text-[13px] tabular-nums transition-all duration-200 active:scale-95 disabled:opacity-25 disabled:hover:bg-transparent ${
        active
          ? 'bg-ink text-ink-contrast'
          : 'text-secondary hover:bg-fill hover:text-content'
      }`}
    >
      {children}
    </button>
  )
}

/** First + last + a window around the current page, with … gaps. */
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
}

function EmptyState() {
  return (
    <div className="grid place-items-center py-28 text-center">
      <p className="text-[17px] text-content">No sessions yet</p>
      <p className="mt-2 max-w-[16rem] text-[14px] leading-relaxed text-tertiary">
        Finish a focus session and it’ll appear here, quietly tracked, just for you.
      </p>
    </div>
  )
}

/* All-time focus hours per category, with proportional accent bars. Only shown
   once at least one focus session has been attributed to a category. */
function CategoryBreakdown({ sessions }: { sessions: SessionRecord[] }) {
  const totals = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sessions) {
      if (s.session_type !== 'focus' || !s.category) continue
      map.set(s.category, (map.get(s.category) ?? 0) + (s.duration_minutes || 0))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [sessions])

  if (totals.length === 0) return null
  const max = Math.max(...totals.map(([, m]) => m))

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-tertiary">
        By category
      </h2>
      <ul className="space-y-2.5">
        {totals.map(([name, minutes]) => (
          <li key={name} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-[14px] text-content">{name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-fill">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, (minutes / max) * 100)}%`,
                  backgroundColor: 'color-mix(in srgb, var(--accent) 75%, transparent)',
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[13px] tabular-nums text-secondary">
              {formatDuration(minutes)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── derived data ────────────────────────────────────────────────────────────
interface DayGroup {
  key: string
  label: string
  items: SessionRecord[]
  focusMinutes: number
}

function groupByDay(sessions: SessionRecord[]): DayGroup[] {
  const map = new Map<string, DayGroup>()
  for (const s of sessions) {
    const key = dayKey(s.started_at)
    if (!map.has(key))
      map.set(key, { key, label: dayLabel(s.started_at), items: [], focusMinutes: 0 })
    const g = map.get(key)!
    g.items.push(s)
    if (s.session_type === 'focus') g.focusMinutes += s.duration_minutes || 0
  }
  // sessions arrive newest-first, so insertion order is already correct
  return [...map.values()]
}

function computeStats(sessions: SessionRecord[]) {
  const weekStart = startOfWeek()
  let weekFocusMinutes = 0
  for (const s of sessions) {
    const t = new Date(s.started_at).getTime()
    if (s.session_type === 'focus' && t >= weekStart) weekFocusMinutes += s.duration_minutes || 0
  }
  const byDay = focusByDay(sessions)
  return {
    weekFocusMinutes,
    streak: currentStreak(byDay),
    bestDayMinutes: bestDayMinutes(byDay),
    totalSessions: sessions.length,
  }
}
