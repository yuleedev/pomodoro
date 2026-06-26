/*
 * Task persistence - the same dual strategy as history.ts.
 *
 * Signed in  → rows in Supabase `tasks` (owner-only RLS).
 * Signed out → rows in localStorage.
 * On load while signed in, any local tasks are pushed up first, then cleared -
 * so tasks created while signed out follow the user to their account.
 */
import { supabase } from './supabase'
import { getCurrentUserId } from './user'

const LOCAL_KEY = 'cadence:tasks'

export interface Task {
  id: string
  title: string
  completed: boolean
  /** How many focus sessions have been logged against this task. */
  session_count: number
  /** Sort order (ascending). */
  position: number
  created_at?: string
}

const isRemote = () => Boolean(getCurrentUserId() && supabase)

function readLocal(): Task[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const rows = raw ? (JSON.parse(raw) as Task[]) : []
    return rows.sort((a, b) => a.position - b.position)
  } catch {
    return []
  }
}

function writeLocal(rows: Task[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows))
  } catch {
    /* unavailable */
  }
}

/** Strip client-only fields for a Supabase row. */
function toRow(t: Task) {
  return {
    id: t.id,
    user_id: getCurrentUserId(),
    title: t.title,
    completed: t.completed,
    session_count: t.session_count,
    position: t.position,
  }
}

/** Push any local tasks to the account, then clear them locally. */
async function pushLocal(): Promise<void> {
  if (!supabase) return
  const local = readLocal()
  if (local.length === 0) return
  const { error } = await supabase.from('tasks').upsert(local.map(toRow))
  if (!error) writeLocal([])
  else console.warn('Could not sync local tasks:', error.message)
}

/** Load tasks (newest sort order). Remote loads sync local tasks up first. */
export async function fetchTasks(): Promise<Task[]> {
  if (isRemote()) {
    await pushLocal()
    const { data, error } = await supabase!
      .from('tasks')
      .select('*')
      .order('position', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as Task[]
  }
  return readLocal()
}

export async function createTask(task: Task): Promise<void> {
  if (isRemote()) {
    const { error } = await supabase!.from('tasks').insert(toRow(task))
    if (!error) return
    console.warn('Task insert failed, saving locally:', error.message)
  }
  writeLocal([...readLocal(), task])
}

export async function updateTask(task: Task): Promise<void> {
  if (isRemote()) {
    const { error } = await supabase!
      .from('tasks')
      .update({
        title: task.title,
        completed: task.completed,
        session_count: task.session_count,
        position: task.position,
      })
      .eq('id', task.id)
    if (error) throw new Error(error.message)
    return
  }
  writeLocal(readLocal().map((t) => (t.id === task.id ? task : t)))
}

export async function deleteTaskRow(id: string): Promise<void> {
  if (isRemote()) {
    const { error } = await supabase!.from('tasks').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  writeLocal(readLocal().filter((t) => t.id !== id))
}

/** Persist a reordered list (positions already assigned by the caller). */
export async function saveOrder(tasks: Task[]): Promise<void> {
  if (isRemote()) {
    const { error } = await supabase!.from('tasks').upsert(tasks.map(toRow))
    if (error) throw new Error(error.message)
    return
  }
  writeLocal(tasks)
}
