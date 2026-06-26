/*
 * Monochrome focus-activity graphs for the history view — think a GitHub
 * contribution graph, but for focus time, and strictly grayscale.
 *
 *  1. Heatmap — one square per day over the last ~18 weeks; darker = more focus.
 *  2. Bars    — focus minutes per day over the last 14 days.
 *
 * Intensity is rendered with `color-mix(... var(--ink) …)` so it tracks the
 * theme (off-white ink on dark, near-black ink on light) without any color.
 * Pure CSS/SVG-free; only focus sessions count toward the totals.
 */
import { useMemo } from 'react'
import { dayKey, formatDuration } from '../lib/time'
import type { SessionRecord } from '../lib/history'

const WEEKS = 18

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

/** Sum focus minutes per local day. */
function focusByDay(sessions: SessionRecord[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) {
    if (s.session_type !== 'focus') continue
    const k = dayKey(s.started_at)
    map.set(k, (map.get(k) ?? 0) + (s.duration_minutes || 0))
  }
  return map
}

function addDays(base: Date, n: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n)
}

export function HistoryGraphs({ sessions }: { sessions: SessionRecord[] }) {
  const byDay = useMemo(() => focusByDay(sessions), [sessions])

  // ── Heatmap grid: columns = weeks (Mon–Sun), ending with the current week ──
  const { columns, todayKey } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const mondayOffset = (today.getDay() + 6) % 7 // Mon = 0 … Sun = 6
    const thisMonday = addDays(today, -mondayOffset)
    const gridStart = addDays(thisMonday, -(WEEKS - 1) * 7)

    const cols: { key: string; minutes: number; future: boolean }[][] = []
    for (let w = 0; w < WEEKS; w++) {
      const col: { key: string; minutes: number; future: boolean }[] = []
      for (let d = 0; d < 7; d++) {
        const date = addDays(gridStart, w * 7 + d)
        const key = dayKey(date.toISOString())
        col.push({ key, minutes: byDay.get(key) ?? 0, future: date.getTime() > today.getTime() })
      }
      cols.push(col)
    }
    return { columns: cols, todayKey: dayKey(today.toISOString()) }
  }, [byDay])

  // ── Recent 14-day bars ──
  const bars = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const out: { key: string; label: string; minutes: number; isToday: boolean }[] = []
    for (let i = 13; i >= 0; i--) {
      const date = addDays(today, -i)
      const key = dayKey(date.toISOString())
      out.push({
        key,
        label: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
        minutes: byDay.get(key) ?? 0,
        isToday: i === 0,
      })
    }
    return out
  }, [byDay])

  const barMax = Math.max(60, ...bars.map((b) => b.minutes)) // floor so a single 25m bar isn't full-height

  return (
    <div className="mb-10 space-y-8">
      {/* Heatmap */}
      <div>
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-tertiary">
          Activity
        </h2>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-[3px]">
            {columns.map((col, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {col.map((cell) => (
                  <div
                    key={cell.key}
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
        {/* Legend */}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-tertiary">
          <span>Less</span>
          {LEVEL_BG.map((bg, i) => (
            <span key={i} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: bg }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* 14-day bars */}
      <div>
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-tertiary">
          Last 14 days
        </h2>
        <div className="flex h-24 items-end gap-1.5">
          {bars.map((b) => (
            <div key={b.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                title={`${b.key} · ${b.minutes ? formatDuration(b.minutes) : 'no focus'}`}
                className="w-full rounded-[3px] transition-all"
                style={{
                  height: `${b.minutes > 0 ? Math.max(4, (b.minutes / barMax) * 80) : 2}px`,
                  backgroundColor:
                    b.minutes > 0
                      ? `color-mix(in srgb, var(--ink) ${b.isToday ? 92 : 60}%, transparent)`
                      : 'var(--fill)',
                }}
              />
              <span className="text-[10px] text-tertiary">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
