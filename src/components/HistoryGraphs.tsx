/*
 * The focus-analytics dashboard for the History view - strictly monochrome,
 * intensity carried by `color-mix(... var(--ink) …)` so everything tracks the
 * theme without a hint of hue. Four panels:
 *
 *  1. Year heatmap  - one square per day across the last 53 weeks (GitHub-style),
 *                     with month + weekday labels.
 *  2. Focus chart   - bars over a selectable range: Week / Month / Year.
 *  3. Rhythm        - share of focus by part of day (morning…night).
 *  4. Weekday       - which days of the week you focus most.
 *
 * Only focus sessions count toward the totals.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { dayKey, formatDuration } from '../lib/time'
import { softSpring, spring } from '../lib/motion'
import {
  byTimeOfDay,
  byWeekday,
  dailyBars,
  focusByDay,
  monthlyBars,
  type Bar,
} from '../lib/analytics'
import type { SessionRecord } from '../lib/history'

const WEEKS = 53 // a full year

/** Map daily focus minutes to one of five grayscale levels (0 = none). */
function level(minutes: number): number {
  if (minutes <= 0) return 0
  if (minutes <= 25) return 1
  if (minutes <= 50) return 2
  if (minutes <= 90) return 3
  return 4
}

const LEVEL_BG = [
  'var(--fill)',
  'color-mix(in srgb, var(--ink) 24%, transparent)',
  'color-mix(in srgb, var(--ink) 44%, transparent)',
  'color-mix(in srgb, var(--ink) 66%, transparent)',
  'color-mix(in srgb, var(--ink) 90%, transparent)',
]

function addDays(base: Date, n: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n)
}

type Range = 'week' | 'month' | 'year'

export function HistoryGraphs({ sessions }: { sessions: SessionRecord[] }) {
  const byDay = useMemo(() => focusByDay(sessions), [sessions])
  const [range, setRange] = useState<Range>('week')

  return (
    <div className="mb-10 space-y-9">
      <Heatmap byDay={byDay} />

      <FocusChart sessions={sessions} byDay={byDay} range={range} onRange={setRange} />

      <div className="grid grid-cols-2 gap-x-6 gap-y-8">
        <Rhythm sessions={sessions} />
        <Weekday sessions={sessions} />
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[14px] font-medium uppercase tracking-[0.14em] text-tertiary">
      {children}
    </h2>
  )
}

// ── 1. Year heatmap ──────────────────────────────────────────────────────────
function Heatmap({ byDay }: { byDay: Map<string, number> }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { columns, todayKey } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const mondayOffset = (today.getDay() + 6) % 7
    const thisMonday = addDays(today, -mondayOffset)
    const gridStart = addDays(thisMonday, -(WEEKS - 1) * 7)

    let prevMonth = -1
    const cols = []
    for (let w = 0; w < WEEKS; w++) {
      const monday = addDays(gridStart, w * 7)
      const monthLabel =
        monday.getMonth() !== prevMonth
          ? monday.toLocaleDateString(undefined, { month: 'short' })
          : ''
      prevMonth = monday.getMonth()

      const cells = []
      for (let d = 0; d < 7; d++) {
        const date = addDays(gridStart, w * 7 + d)
        const key = dayKey(date.toISOString())
        cells.push({ key, minutes: byDay.get(key) ?? 0, future: date.getTime() > today.getTime() })
      }
      cols.push({ monthLabel, cells })
    }
    return { columns: cols, todayKey: dayKey(today.toISOString()) }
  }, [byDay])

  // Land on the most recent weeks (today) rather than a year ago.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [columns])

  return (
    <div>
      <SectionTitle>Activity · past year</SectionTitle>
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1.5">
          {/* Month labels */}
          <div className="flex gap-[3px] pl-[26px]">
            {columns.map((col, w) => (
              <div
                key={w}
                className="w-3 whitespace-nowrap text-[11px] leading-none text-tertiary"
              >
                {col.monthLabel}
              </div>
            ))}
          </div>
          {/* Weekday labels + grid */}
          <div className="flex gap-[3px]">
            <div className="flex w-[22px] shrink-0 flex-col gap-[3px] text-[10px] leading-3 text-tertiary">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((l, i) => (
                <span key={i} className="h-3">
                  {l}
                </span>
              ))}
            </div>
            {columns.map((col, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {col.cells.map((cell, d) => (
                  <motion.div
                    key={cell.key}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...spring, delay: Math.min(0.5, (w * 7 + d) * 0.0015) }}
                    title={
                      cell.future
                        ? undefined
                        : `${cell.key} · ${cell.minutes ? formatDuration(cell.minutes) : 'no focus'}`
                    }
                    className="h-3 w-3 rounded-[3px]"
                    style={{
                      backgroundColor: cell.future ? 'transparent' : LEVEL_BG[level(cell.minutes)],
                      outline:
                        cell.key === todayKey
                          ? '1px solid color-mix(in srgb, var(--ink) 55%, transparent)'
                          : undefined,
                      outlineOffset: cell.key === todayKey ? '1px' : undefined,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-[12px] text-tertiary">
        <span>Less</span>
        {LEVEL_BG.map((bg, i) => (
          <span key={i} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: bg }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

// ── 2. Range chart (Week / Month / Year) ─────────────────────────────────────
const RANGES: { id: Range; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
]

function FocusChart({
  sessions,
  byDay,
  range,
  onRange,
}: {
  sessions: SessionRecord[]
  byDay: Map<string, number>
  range: Range
  onRange: (r: Range) => void
}) {
  const bars = useMemo<Bar[]>(() => {
    if (range === 'week') return dailyBars(byDay, 7)
    if (range === 'month') return dailyBars(byDay, 30)
    return monthlyBars(sessions, 12)
  }, [range, byDay, sessions])

  // Axis labels: every day for a week, sparse for a month, every month for a year.
  const ticks = useMemo(() => {
    return bars.map((b, i) => {
      if (range === 'week' || range === 'year') return b.label
      // month: a day-of-month tick every 5 columns
      if (i % 5 === 0 || i === bars.length - 1) return String(new Date(b.key + 'T00:00').getDate())
      return ''
    })
  }, [bars, range])

  const max = Math.max(60, ...bars.map((b) => b.minutes))
  const total = bars.reduce((sum, b) => sum + b.minutes, 0)
  const tight = bars.length > 14 // narrower gaps for the 30-day view

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Focus time</SectionTitle>
        <Segmented value={range} onChange={onRange} />
      </div>

      <div className={`flex h-28 items-end ${tight ? 'gap-[3px]' : 'gap-1.5'}`}>
        {bars.map((b, i) => (
          <div key={b.key} className="flex flex-1 flex-col items-center gap-1.5">
            <motion.div
              key={`${range}-${b.key}`}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ ...softSpring, delay: i * (tight ? 0.012 : 0.03) }}
              title={`${b.key} · ${b.minutes ? formatDuration(b.minutes) : 'no focus'}`}
              className="w-full origin-bottom rounded-[3px]"
              style={{
                height: `${b.minutes > 0 ? Math.max(4, (b.minutes / max) * 88) : 2}px`,
                backgroundColor:
                  b.minutes > 0
                    ? `color-mix(in srgb, var(--ink) ${b.current ? 92 : 58}%, transparent)`
                    : 'var(--fill)',
              }}
            />
            <span className="h-3 text-[11px] leading-3 text-tertiary">{ticks[i]}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-tertiary">
        {formatDuration(total)} focused ·{' '}
        {range === 'week' ? 'last 7 days' : range === 'month' ? 'last 30 days' : 'last 12 months'}
      </p>
    </div>
  )
}

function Segmented({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="relative flex rounded-full bg-fill p-0.5 text-[13px]">
      {RANGES.map((r) => {
        const active = r.id === value
        return (
          <button
            key={r.id}
            onClick={() => onChange(r.id)}
            className={`relative rounded-full px-3 py-1 transition-colors duration-200 ${
              active ? 'text-content' : 'text-tertiary hover:text-secondary'
            }`}
          >
            {active && (
              <motion.span
                layoutId="range-pill"
                transition={spring}
                className="absolute inset-0 rounded-full bg-bg shadow-[var(--shadow)]"
              />
            )}
            <span className="relative z-10">{r.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── 3. Rhythm - share of focus by part of day ────────────────────────────────
function Rhythm({ sessions }: { sessions: SessionRecord[] }) {
  const slices = useMemo(() => byTimeOfDay(sessions), [sessions])
  const max = Math.max(1, ...slices.map((s) => s.minutes))

  return (
    <div>
      <SectionTitle>Rhythm</SectionTitle>
      <div className="space-y-2.5">
        {slices.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-[13px] text-secondary">{s.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-fill">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: s.minutes / max }}
                transition={{ ...softSpring, delay: 0.1 + i * 0.06 }}
                className="h-full origin-left rounded-full"
                style={{ backgroundColor: 'color-mix(in srgb, var(--ink) 70%, transparent)' }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-[12px] tabular-nums text-tertiary">
              {s.minutes ? formatDuration(s.minutes) : '·'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 4. Weekday distribution ──────────────────────────────────────────────────
function Weekday({ sessions }: { sessions: SessionRecord[] }) {
  const days = useMemo(() => byWeekday(sessions), [sessions])
  const max = Math.max(1, ...days.map((d) => d.minutes))

  return (
    <div>
      <SectionTitle>By weekday</SectionTitle>
      <div className="flex h-28 items-end gap-1.5">
        {days.map((d, i) => {
          const strongest = d.minutes === max && d.minutes > 0
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ ...softSpring, delay: 0.1 + i * 0.04 }}
                title={`${d.label} · ${d.minutes ? formatDuration(d.minutes) : 'no focus'}`}
                className="w-full origin-bottom rounded-[3px]"
                style={{
                  height: `${d.minutes > 0 ? Math.max(4, (d.minutes / max) * 88) : 2}px`,
                  backgroundColor: d.minutes
                    ? `color-mix(in srgb, var(--ink) ${strongest ? 90 : 52}%, transparent)`
                    : 'var(--fill)',
                }}
              />
              <span className="text-[11px] leading-3 text-tertiary">{d.label[0]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
