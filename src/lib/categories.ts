/*
 * Category persistence - the same dual strategy as tasks.ts / history.ts.
 *
 * Categories are optional labels for tracking focus hours by area (e.g. Math,
 * Reading, Coding). Signed in → Supabase `categories` (owner-only RLS); signed
 * out → localStorage; local rows sync up on the first signed-in load.
 */
import { supabase } from './supabase'
import { getCurrentUserId } from './user'

const LOCAL_KEY = 'cadence:categories'

export interface Category {
  id: string
  name: string
  position: number
  created_at?: string
}

const isRemote = () => Boolean(getCurrentUserId() && supabase)

function readLocal(): Category[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const rows = raw ? (JSON.parse(raw) as Category[]) : []
    return rows.sort((a, b) => a.position - b.position)
  } catch {
    return []
  }
}

function writeLocal(rows: Category[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows))
  } catch {
    /* unavailable */
  }
}

function toRow(c: Category) {
  return { id: c.id, user_id: getCurrentUserId(), name: c.name, position: c.position }
}

async function pushLocal(): Promise<void> {
  if (!supabase) return
  const local = readLocal()
  if (local.length === 0) return
  const { error } = await supabase.from('categories').upsert(local.map(toRow))
  if (!error) writeLocal([])
  else console.warn('Could not sync local categories:', error.message)
}

export async function fetchCategories(): Promise<Category[]> {
  if (isRemote()) {
    await pushLocal()
    const { data, error } = await supabase!
      .from('categories')
      .select('*')
      .order('position', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as Category[]
  }
  return readLocal()
}

export async function createCategory(category: Category): Promise<void> {
  if (isRemote()) {
    const { error } = await supabase!.from('categories').insert(toRow(category))
    if (!error) return
    console.warn('Category insert failed, saving locally:', error.message)
  }
  writeLocal([...readLocal(), category])
}

export async function deleteCategoryRow(id: string): Promise<void> {
  if (isRemote()) {
    const { error } = await supabase!.from('categories').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  writeLocal(readLocal().filter((c) => c.id !== id))
}
