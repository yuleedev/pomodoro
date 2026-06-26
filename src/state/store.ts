/*
 * Application store (Zustand) — the single source of truth for the UI.
 *
 * It owns playback intent (which sounds, at what volume), the focus timer, and
 * the theme. It drives the imperative AudioEngine in response to user actions.
 * Persisted slices (theme, mix, timer prefs) survive reloads; playback never
 * auto-starts (browser autoplay rules require a user gesture).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { engine } from '../audio/engine'
import { buildCatalog, type Sound } from '../audio/catalog'

export type Theme = 'dark' | 'light'
export type TimerPhase = 'idle' | 'work' | 'break'

export interface TimerConfig {
  workMinutes: number
  breakMinutes: number
  sessions: number
}

interface State {
  theme: Theme
  masterVolume: number
  /** Active sounds: id → volume (0–1). The "mix". */
  mix: Record<string, number>
  isPlaying: boolean

  /** User-added local files (session-only; object URLs are not persisted). */
  userFiles: Sound[]

  timer: TimerConfig
  phase: TimerPhase
  remainingSec: number
  completedSessions: number
  timerRunning: boolean

  focusMode: boolean

  // ── actions ──────────────────────────────────────────────────────────────
  toggleTheme: () => void
  setMasterVolume: (v: number) => void
  toggleSound: (id: string) => void
  setVolume: (id: string, v: number) => void
  togglePlay: () => void
  addUserFile: (file: File) => void
  removeUserFile: (id: string) => void

  setTimerConfig: (c: Partial<TimerConfig>) => void
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void

  enterFocus: () => void
  exitFocus: () => void
}

/** Resolve a sound by id from the built-in catalog or the user's files. */
function findSound(id: string, userFiles: Sound[]): Sound | undefined {
  return buildCatalog().find((s) => s.id === id) ?? userFiles.find((s) => s.id === id)
}

// Module-level interval handle for the timer tick (kept out of React state).
let tickHandle: number | null = null

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      masterVolume: 0.8,
      mix: {},
      isPlaying: false,
      userFiles: [],

      timer: { workMinutes: 25, breakMinutes: 5, sessions: 4 },
      phase: 'idle',
      remainingSec: 0,
      completedSessions: 0,
      timerRunning: false,

      focusMode: false,

      toggleTheme: () => {
        const theme = get().theme === 'dark' ? 'light' : 'dark'
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ theme })
      },

      setMasterVolume: (v) => {
        engine.setMasterVolume(v)
        set({ masterVolume: v })
      },

      toggleSound: (id) => {
        const { mix, userFiles, isPlaying, masterVolume } = get()
        if (id in mix) {
          // Remove from the mix.
          engine.stop(id)
          const next = { ...mix }
          delete next[id]
          const stillPlaying = Object.keys(next).length > 0 && isPlaying
          set({ mix: next, isPlaying: stillPlaying })
        } else {
          const sound = findSound(id, userFiles)
          if (!sound) return
          engine.setMasterVolume(masterVolume)
          void engine.start(sound, sound.defaultVolume)
          void engine.resume()
          set({ mix: { ...mix, [id]: sound.defaultVolume }, isPlaying: true })
        }
      },

      setVolume: (id, v) => {
        engine.setLayerVolume(id, v)
        set({ mix: { ...get().mix, [id]: v } })
      },

      togglePlay: () => {
        const { isPlaying, mix, userFiles, masterVolume } = get()
        if (isPlaying) {
          void engine.suspend()
          set({ isPlaying: false })
        } else {
          // Start any mix entries that aren't live yet (e.g. after a reload).
          engine.setMasterVolume(masterVolume)
          for (const [id, vol] of Object.entries(mix)) {
            const sound = findSound(id, userFiles)
            if (sound) void engine.start(sound, vol)
          }
          void engine.resume()
          set({ isPlaying: true })
        }
      },

      addUserFile: (file) => {
        const id = `file-${Date.now()}-${Math.round(performance.now())}`
        const sound: Sound = {
          id,
          name: file.name.replace(/\.[^.]+$/, ''),
          kind: 'file',
          category: 'Yours',
          src: URL.createObjectURL(file),
          defaultVolume: 0.7,
          description: 'A track you added from your device.',
        }
        set({ userFiles: [...get().userFiles, sound] })
      },

      removeUserFile: (id) => {
        const { mix, userFiles, isPlaying } = get()
        const file = userFiles.find((f) => f.id === id)
        // Stop it if it's playing and drop it from the mix.
        if (id in mix) {
          engine.stop(id)
          const next = { ...mix }
          delete next[id]
          set({ mix: next, isPlaying: Object.keys(next).length > 0 && isPlaying })
        }
        // Free the object URL and remove the file from the library.
        if (file?.src) URL.revokeObjectURL(file.src)
        set({ userFiles: userFiles.filter((f) => f.id !== id) })
      },

      setTimerConfig: (c) => {
        set({ timer: { ...get().timer, ...c } })
        // Reflect config edits immediately when the timer is idle.
        if (get().phase === 'idle') {
          set({ remainingSec: (c.workMinutes ?? get().timer.workMinutes) * 60 })
        }
      },

      startTimer: () => {
        const { phase, timer, isPlaying, togglePlay } = get()
        if (phase === 'idle') {
          set({
            phase: 'work',
            remainingSec: timer.workMinutes * 60,
            completedSessions: 0,
          })
        }
        set({ timerRunning: true })
        if (!isPlaying && Object.keys(get().mix).length > 0) togglePlay()
        startTicking(set, get)
      },

      pauseTimer: () => {
        set({ timerRunning: false })
        stopTicking()
      },

      resetTimer: () => {
        stopTicking()
        set({
          timerRunning: false,
          phase: 'idle',
          remainingSec: 0,
          completedSessions: 0,
        })
      },

      enterFocus: () => set({ focusMode: true }),
      exitFocus: () => set({ focusMode: false }),
    }),
    {
      name: 'soundscape:state',
      // Persist only durable preferences — never live playback state.
      partialize: (s) => ({
        theme: s.theme,
        masterVolume: s.masterVolume,
        mix: s.mix,
        timer: s.timer,
      }),
      onRehydrateStorage: () => (state) => {
        // Keep the <html> class in sync with the persisted theme, and never
        // resume audio automatically — wait for a user gesture.
        if (state) {
          document.documentElement.classList.toggle('dark', state.theme === 'dark')
          state.isPlaying = false
          state.remainingSec = state.timer.workMinutes * 60
        }
      },
    },
  ),
)

// ── timer ticking (module-level, outside React) ─────────────────────────────
function startTicking(set: SetFn, get: GetFn) {
  stopTicking()
  tickHandle = window.setInterval(() => {
    const { remainingSec, phase, timer, completedSessions } = get()
    if (remainingSec > 1) {
      set({ remainingSec: remainingSec - 1 })
      return
    }
    // Phase boundary reached.
    if (phase === 'work') {
      const done = completedSessions + 1
      if (done >= timer.sessions) {
        // All sessions complete — wind down.
        void engine.chime(false)
        stopTicking()
        set({ phase: 'idle', timerRunning: false, remainingSec: 0, completedSessions: done })
      } else {
        void engine.chime(false)
        set({ phase: 'break', remainingSec: timer.breakMinutes * 60, completedSessions: done })
      }
    } else {
      // Break finished — back to work.
      void engine.chime(true)
      set({ phase: 'work', remainingSec: timer.workMinutes * 60 })
    }
  }, 1000)
}

function stopTicking() {
  if (tickHandle !== null) {
    window.clearInterval(tickHandle)
    tickHandle = null
  }
}

type SetFn = (partial: Partial<State>) => void
type GetFn = () => State
