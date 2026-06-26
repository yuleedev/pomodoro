/* Tiny UI store for the full-screen overlays (auth, history) and the
   customization panel, so any component can open/close them without prop
   drilling. */
import { create } from 'zustand'

interface UIState {
  authOpen: boolean
  historyOpen: boolean
  customizeOpen: boolean
  soundOpen: boolean
  openAuth: () => void
  closeAuth: () => void
  openHistory: () => void
  closeHistory: () => void
  openCustomize: () => void
  closeCustomize: () => void
  openSound: () => void
  closeSound: () => void
}

export const useUI = create<UIState>((set) => ({
  authOpen: false,
  historyOpen: false,
  customizeOpen: false,
  soundOpen: false,
  openAuth: () => set({ authOpen: true }),
  closeAuth: () => set({ authOpen: false }),
  openHistory: () => set({ historyOpen: true }),
  closeHistory: () => set({ historyOpen: false }),
  openCustomize: () => set({ customizeOpen: true }),
  closeCustomize: () => set({ customizeOpen: false }),
  openSound: () => set({ soundOpen: true }),
  closeSound: () => set({ soundOpen: false }),
}))
