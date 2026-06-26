/* Tiny UI store for the two full-screen overlays (auth + history), so any
   component can open/close them without prop drilling. */
import { create } from 'zustand'

interface UIState {
  authOpen: boolean
  historyOpen: boolean
  openAuth: () => void
  closeAuth: () => void
  openHistory: () => void
  closeHistory: () => void
}

export const useUI = create<UIState>((set) => ({
  authOpen: false,
  historyOpen: false,
  openAuth: () => set({ authOpen: true }),
  closeAuth: () => set({ authOpen: false }),
  openHistory: () => set({ historyOpen: true }),
  closeHistory: () => set({ historyOpen: false }),
}))
