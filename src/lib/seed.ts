/*
 * Demo-data generator — DEV ONLY.
 *
 * Fills localStorage with ~18 weeks of realistic Pomodoro history so the
 * History graphs (heatmap + 14-day bars) can be previewed without grinding
 * through real 25-minute sessions. Wired to a dev-only "Load demo data" button
 * in the History view; also exposed as `window.cadenceSeed()` in dev.
 *
 * Safe to delete this file (and its two call sites) once you're done previewing.
 */
import type { SessionRecord } from './history'

const LOCAL_KEY = 'cadence:sessions'
const WEEKS = 53 // a full year, so the year heatmap + year chart fill in

const SOUNDS: (string | null)[] = [
  'Rain',
  'Brown noise',
  'Pink noise',
  'White noise',
  'Wind',
  'Rain · Wind',
  null,
]

const FOCUS_DURATIONS = [25, 25, 25, 30, 45, 50] // weighted toward classic 25m
const BREAK_DURATIONS = [5, 5, 10]

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)]

function record(start: Date, durationMin: number, type: 'focus' | 'break'): SessionRecord {
  const end = new Date(start.getTime() + durationMin * 60_000)
  return {
    id: crypto.randomUUID(),
    started_at: start.toISOString(),
    ended_at: end.toISOString(),
    duration_minutes: durationMin,
    session_type: type,
    soundscape: type === 'focus' ? pick(SOUNDS) : null,
    created_at: end.toISOString(),
  }
}

/**
 * Generate and persist a believable history. Weekdays are busier than weekends,
 * some days are empty, and daily totals span every heatmap intensity level.
 * Returns the rows (newest-first) so callers can show them immediately.
 */
export function seedDemoSessions(): SessionRecord[] {
  const rows: SessionRecord[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const day = new Date(today)
    day.setDate(today.getDate() - i)
    const isWeekend = day.getDay() === 0 || day.getDay() === 6

    // Some days have no focus at all (more likely on weekends).
    if (Math.random() < (isWeekend ? 0.55 : 0.22)) continue

    // How many focus blocks today — keeps totals varied so every shade appears.
    const blocks = isWeekend ? randInt(1, 2) : randInt(1, 5)

    let hour = randInt(8, 11)
    for (let b = 0; b < blocks; b++) {
      if (hour > 21) break
      const start = new Date(day)
      start.setHours(hour, randInt(0, 55), 0, 0)
      const dur = pick(FOCUS_DURATIONS)
      rows.push(record(start, dur, 'focus'))

      // A break usually follows a focus block.
      if (Math.random() < 0.6) {
        const breakStart = new Date(start.getTime() + (dur + 1) * 60_000)
        rows.push(record(breakStart, pick(BREAK_DURATIONS), 'break'))
      }
      hour += randInt(1, 2)
    }
  }

  rows.sort((a, b) => b.started_at.localeCompare(a.started_at)) // newest-first
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows))
  } catch {
    /* storage unavailable — caller still gets the rows to render */
  }
  return rows
}

/** Wipe the local demo (the History "Clear all" button also does this). */
export function clearDemoSessions(): void {
  try {
    localStorage.removeItem(LOCAL_KEY)
  } catch {
    /* ignore */
  }
}

// Handy from the browser console during development.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).cadenceSeed = seedDemoSessions
  ;(window as unknown as Record<string, unknown>).cadenceClear = clearDemoSessions
}
