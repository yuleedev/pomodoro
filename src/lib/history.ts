/*
 * Pomodoro history persistence.
 *
 * Signed in  → rows live in Supabase (`pomodoro_sessions`), readable/writable
 *              only by their owner thanks to Row-Level Security.
 * Signed out → rows live in this browser's localStorage, so nothing is lost.
 * On sign-in → any local rows are pushed up to Supabase, then cleared locally.
 *
 * This module imports only the Supabase client (never the auth or UI stores),
 * so there are no import cycles. The auth store tells it who the current user
 * is via setCurrentUser().
 */
import { supabase } from './supabase'
import { getCurrentUserId } from './user'

const LOCAL_KEY = 'cadence:sessions'

export interface SessionRecord {
  id: string
  started_at: string
  ended_at: string
  duration_minutes: number
  session_type: 'focus' | 'break'
  soundscape: string | null
  /** Optional category name this session counts toward (for per-area hours). */
  category: string | null
  created_at: string
}

/** A completed session before it's been given an id/created_at. */
export type NewSession = Omit<SessionRecord, 'id' | 'created_at'>

const isRemote = () => Boolean(getCurrentUserId() && supabase)

// ── localStorage helpers ────────────────────────────────────────────────────
function readLocal(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as SessionRecord[]) : []
  } catch {
    return []
  }
}

function writeLocal(rows: SessionRecord[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows))
  } catch {
    /* storage full / unavailable - nothing else we can do */
  }
}

// ── public API ──────────────────────────────────────────────────────────────

/** Persist a completed session. Falls back to localStorage on any failure. */
export async function recordSession(input: NewSession): Promise<void> {
  if (isRemote()) {
    const { error } = await supabase!
      .from('pomodoro_sessions')
      .insert({ user_id: getCurrentUserId(), ...input })
    if (!error) return
    // Don't lose the data - keep it locally so a later sync can recover it.
    console.warn('Session insert failed, saving locally:', error.message)
  }
  const record: SessionRecord = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  writeLocal([record, ...readLocal()])
}

/** Newest-first list of the current user's (or local) sessions. */
export async function listSessions(): Promise<SessionRecord[]> {
  if (isRemote()) {
    const { data, error } = await supabase!
      .from('pomodoro_sessions')
      .select('*')
      .order('started_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as SessionRecord[]
  }
  return readLocal()
}

/** Delete one session by id. */
export async function deleteSession(id: string): Promise<void> {
  if (isRemote()) {
    const { error } = await supabase!.from('pomodoro_sessions').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  writeLocal(readLocal().filter((r) => r.id !== id))
}

/** Delete every session belonging to the current user (or all local ones). */
export async function clearAllSessions(): Promise<void> {
  if (isRemote()) {
    const { error } = await supabase!
      .from('pomodoro_sessions')
      .delete()
      .eq('user_id', getCurrentUserId())
    if (error) throw new Error(error.message)
    return
  }
  writeLocal([])
}

// Guard against concurrent syncs (e.g. getSession + SIGNED_IN firing together).
let syncing = false

/** Push any locally-saved sessions up to Supabase, then clear them locally. */
export async function syncLocalSessions(userId: string): Promise<number> {
  if (!supabase || syncing) return 0
  const local = readLocal()
  if (local.length === 0) return 0
  syncing = true
  try {
    const rows = local.map((r) => ({
      user_id: userId,
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_minutes: r.duration_minutes,
      session_type: r.session_type,
      soundscape: r.soundscape,
      category: r.category ?? null,
    }))
    const { error } = await supabase.from('pomodoro_sessions').insert(rows)
    if (error) {
      console.warn('Could not sync local sessions:', error.message)
      return 0
    }
    writeLocal([]) // uploaded successfully - safe to clear
    return rows.length
  } finally {
    syncing = false
  }
}
