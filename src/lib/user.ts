/*
 * The signed-in user's id, shared by the persistence layers (history, tasks)
 * so they can decide between Supabase and localStorage without importing the
 * auth store (which would create an import cycle). The auth store is the only
 * writer - it calls setCurrentUser() on every auth change.
 */
let currentUserId: string | null = null

export function setCurrentUser(id: string | null) {
  currentUserId = id
}

export function getCurrentUserId(): string | null {
  return currentUserId
}
