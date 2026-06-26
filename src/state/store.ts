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
import { recordSession } from '../lib/history'
import {
  createTask,
  deleteTaskRow,
  fetchTasks,
  saveOrder,
  updateTask,
  type Task,
} from '../lib/tasks'

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
  /** Epoch ms when the current phase began — used as a session's started_at. */
  phaseStartedAt: number | null

  focusMode: boolean

  /** To-do list, ordered by position. */
  tasks: Task[]
  /** The task the timer is currently running "against". */
  selectedTaskId: string | null

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

  // tasks
  loadTasks: () => Promise<void>
  addTask: (title: string) => void
  renameTask: (id: string, title: string) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  reorderTasks: (ordered: Task[]) => void
  selectTask: (id: string | null) => void
  bumpActiveTaskSession: () => void
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
      phaseStartedAt: null,

      focusMode: false,

      tasks: [],
      selectedTaskId: null,

      toggleTheme: () => {
        const theme = get().theme === 'dark' ? 'light' : 'dark'
        document.documentElement.classList.toggle('dark', theme === 'dark')
        // Mirror to a dedicated key so the pre-paint script (index.html) can
        // apply the right theme before React loads — no flash.
        try {
          localStorage.setItem('cadence:theme', theme)
        } catch {
          /* ignore */
        }
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
            phaseStartedAt: Date.now(),
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
          phaseStartedAt: null,
        })
      },

      enterFocus: () => set({ focusMode: true }),
      exitFocus: () => set({ focusMode: false }),

      // ── tasks ──────────────────────────────────────────────────────────────
      loadTasks: async () => {
        try {
          set({ tasks: await fetchTasks() })
        } catch {
          /* keep whatever we have on a transient failure */
        }
      },

      addTask: (title) => {
        const t = title.trim()
        if (!t) return
        const { tasks } = get()
        const position = tasks.reduce((m, x) => Math.max(m, x.position), -1) + 1
        const task: Task = {
          id: crypto.randomUUID(),
          title: t,
          completed: false,
          session_count: 0,
          position,
          created_at: new Date().toISOString(),
        }
        set({ tasks: [...tasks, task] })
        void createTask(task)
      },

      renameTask: (id, title) => {
        const t = title.trim()
        const task = get().tasks.find((x) => x.id === id)
        if (!task || !t) return
        const updated = { ...task, title: t }
        set({ tasks: get().tasks.map((x) => (x.id === id ? updated : x)) })
        void updateTask(updated)
      },

      toggleTask: (id) => {
        const task = get().tasks.find((x) => x.id === id)
        if (!task) return
        const updated = { ...task, completed: !task.completed }
        set({ tasks: get().tasks.map((x) => (x.id === id ? updated : x)) })
        void updateTask(updated)
      },

      deleteTask: (id) => {
        const { tasks, selectedTaskId } = get()
        set({
          tasks: tasks.filter((x) => x.id !== id),
          selectedTaskId: selectedTaskId === id ? null : selectedTaskId,
        })
        void deleteTaskRow(id)
      },

      reorderTasks: (ordered) => {
        const withPos = ordered.map((t, i) => ({ ...t, position: i }))
        set({ tasks: withPos })
        void saveOrder(withPos)
      },

      // Toggle selection: clicking the active task again deselects it.
      selectTask: (id) => set({ selectedTaskId: get().selectedTaskId === id ? null : id }),

      bumpActiveTaskSession: () => {
        const { selectedTaskId, tasks } = get()
        if (!selectedTaskId) return
        const task = tasks.find((x) => x.id === selectedTaskId)
        if (!task) return
        const updated = { ...task, session_count: task.session_count + 1 }
        set({ tasks: tasks.map((x) => (x.id === task.id ? updated : x)) })
        void updateTask(updated)
      },
    }),
    {
      name: 'cadence:state',
      // Persist only durable preferences — never live playback state.
      partialize: (s) => ({
        theme: s.theme,
        masterVolume: s.masterVolume,
        mix: s.mix,
        timer: s.timer,
        selectedTaskId: s.selectedTaskId,
      }),
      onRehydrateStorage: () => (state) => {
        // Keep the <html> class in sync with the persisted theme, and never
        // resume audio automatically — wait for a user gesture.
        if (state) {
          document.documentElement.classList.toggle('dark', state.theme === 'dark')
          try {
            localStorage.setItem('cadence:theme', state.theme)
          } catch {
            /* ignore */
          }
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
    // Phase boundary reached — the phase that just ended is a completed session.
    const startedAt = get().phaseStartedAt
    if (phase === 'work') {
      logCompleted('focus', timer.workMinutes, startedAt, get)
      get().bumpActiveTaskSession() // credit the active task with a pomodoro
      const done = completedSessions + 1
      if (done >= timer.sessions) {
        // All sessions complete — wind down.
        void engine.chime(false)
        stopTicking()
        set({
          phase: 'idle',
          timerRunning: false,
          remainingSec: 0,
          completedSessions: done,
          phaseStartedAt: null,
        })
      } else {
        void engine.chime(false)
        set({
          phase: 'break',
          remainingSec: timer.breakMinutes * 60,
          completedSessions: done,
          phaseStartedAt: Date.now(),
        })
      }
    } else {
      // Break finished — record it, then back to work.
      logCompleted('break', timer.breakMinutes, startedAt, get)
      void engine.chime(true)
      set({ phase: 'work', remainingSec: timer.workMinutes * 60, phaseStartedAt: Date.now() })
    }
  }, 1000)
}

/** A human-readable summary of what was playing, for the session's soundscape. */
function mixDescription(get: GetFn): string | null {
  const { mix, userFiles } = get()
  const names = Object.keys(mix)
    .map((id) => findSound(id, userFiles)?.name)
    .filter((n): n is string => Boolean(n))
  return names.length ? names.join(', ') : null
}

/** Persist a completed focus/break session (Supabase or localStorage). */
function logCompleted(
  type: 'focus' | 'break',
  minutes: number,
  startedAt: number | null,
  get: GetFn,
) {
  const ended = Date.now()
  const started = startedAt ?? ended - minutes * 60_000
  void recordSession({
    started_at: new Date(started).toISOString(),
    ended_at: new Date(ended).toISOString(),
    duration_minutes: minutes,
    session_type: type,
    soundscape: mixDescription(get),
  })
}

function stopTicking() {
  if (tickHandle !== null) {
    window.clearInterval(tickHandle)
    tickHandle = null
  }
}

type SetFn = (partial: Partial<State>) => void
type GetFn = () => State
