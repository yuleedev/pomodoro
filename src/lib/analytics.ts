/*
 * Pure aggregation helpers over SessionRecord[] — the math behind the History
 * dashboard (heatmap, range charts, rhythm panels, streaks). Kept UI-free and
 * side-effect-free so they're trivial to reason about and reuse. Only focus
 * sessions count toward focus totals; breaks are ignored here.
 */
import { dayKey } from './time'
import type { SessionRecord } from './history'

const keyOf = (d: Date) => dayKey(d.toISOString())

/** Focus minutes summed per local day (YYYY-MM-DD → minutes). */
export function focusByDay(sessions: SessionRecord[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) {
    if (s.session_type !== 'focus') continue
    const k = dayKey(s.started_at)
    map.set(k, (map.get(k) ?? 0) + (s.duration_minutes || 0))
  }
  return map
}

/** Consecutive days with focus, counting back from today (or yesterday). */
export function currentStreak(byDay: Map<string, number>): number {
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  // Today not done yet shouldn't zero the streak — fall back to yesterday.
  if ((byDay.get(keyOf(cursor)) ?? 0) <= 0) {
    cursor.setDate(cursor.getDate() - 1)
    if ((byDay.get(keyOf(cursor)) ?? 0) <= 0) return 0
  }
  let streak = 0
  while ((byDay.get(keyOf(cursor)) ?? 0) > 0) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Largest single-day focus total, in minutes. */
export function bestDayMinutes(byDay: Map<string, number>): number {
  let max = 0
  for (const v of byDay.values()) if (v > max) max = v
  return max
}

export interface Bar {
  key: string
  label: string
  minutes: number
  current: boolean
}

function addDays(base: Date, n: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n)
}

/** Daily focus bars for the last `days` days (oldest → newest). */
export function dailyBars(byDay: Map<string, number>, days: number): Bar[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const out: Bar[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    const key = keyOf(date)
    out.push({
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      minutes: byDay.get(key) ?? 0,
      current: i === 0,
    })
  }
  return out
}

/** Monthly focus bars for the last `months` months (oldest → newest). */
export function monthlyBars(sessions: SessionRecord[], months = 12): Bar[] {
  const totals = new Map<string, number>()
  for (const s of sessions) {
    if (s.session_type !== 'focus') continue
    const d = new Date(s.started_at)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    totals.set(k, (totals.get(k) ?? 0) + (s.duration_minutes || 0))
  }
  const now = new Date()
  const out: Bar[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    out.push({
      key,
      label: d.toLocaleDateString(undefined, { month: 'narrow' }),
      minutes: totals.get(key) ?? 0,
      current: i === 0,
    })
  }
  return out
}

export interface Slice {
  label: string
  minutes: number
}

/** Focus minutes split into parts of the day. */
export function byTimeOfDay(sessions: SessionRecord[]): Slice[] {
  const parts = [
    { label: 'Morning', minutes: 0 }, // 05–12
    { label: 'Afternoon', minutes: 0 }, // 12–17
    { label: 'Evening', minutes: 0 }, // 17–22
    { label: 'Night', minutes: 0 }, // 22–05
  ]
  for (const s of sessions) {
    if (s.session_type !== 'focus') continue
    const h = new Date(s.started_at).getHours()
    const idx = h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 22 ? 2 : 3
    parts[idx].minutes += s.duration_minutes || 0
  }
  return parts
}

/** Focus minutes per weekday, Monday-first. */
export function byWeekday(sessions: SessionRecord[]): Slice[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const mins = new Array(7).fill(0)
  for (const s of sessions) {
    if (s.session_type !== 'focus') continue
    const day = (new Date(s.started_at).getDay() + 6) % 7 // Mon = 0
    mins[day] += s.duration_minutes || 0
  }
  return labels.map((label, i) => ({ label, minutes: mins[i] }))
}
