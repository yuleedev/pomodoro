/*
 * Application store (Zustand) - the single source of truth for the UI.
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
import { isToday } from '../lib/time'
import {
  createTask,
  deleteTaskRow,
  fetchTasks,
  saveOrder,
  updateTask,
  type Task,
} from '../lib/tasks'
import {
  createCategory,
  deleteCategoryRow,
  fetchCategories,
  type Category,
} from '../lib/categories'

export type Theme = 'dark' | 'light'
export type TimerPhase = 'idle' | 'work' | 'break'
/** Countdown Pomodoro, or a free-running count-up stopwatch. */
export type TimerMode = 'pomodoro' | 'stopwatch'
/** Visual style of the hero timer's progress indicator. */
export type TimerStyle = 'ring' | 'squiggle' | 'segments' | 'dot'

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

  timer: TimerConfig
  /** Which clock the hero shows: countdown Pomodoro or count-up stopwatch. */
  timerMode: TimerMode
  /** When a focus session ends, start the break automatically (Pomodoro). */
  autoStartBreak: boolean
  /** When a break ends, start the next focus session automatically (Pomodoro). */
  autoStartFocus: boolean
  phase: TimerPhase
  remainingSec: number
  /** Seconds elapsed in stopwatch mode (counts up; unused in Pomodoro). */
  elapsedSec: number
  completedSessions: number
  timerRunning: boolean
  /** Epoch ms when the current phase began - used as a session's started_at. */
  phaseStartedAt: number | null

  focusMode: boolean

  // ── appearance / customization ───────────────────────────────────────────
  timerStyle: TimerStyle
  /** Accent color (any CSS color), or null for monochrome (default). */
  accent: string | null
  /** Colors the user has saved into their own palette. */
  customSwatches: string[]

  /** To-do list, ordered by position. */
  tasks: Task[]
  /** The task the timer is currently running "against". */
  selectedTaskId: string | null

  /** Optional categories for tracking focus hours by area. */
  categories: Category[]
  /** The category completed focus sessions count toward (null = untracked). */
  activeCategoryId: string | null

  // ── actions ──────────────────────────────────────────────────────────────
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  setTimerStyle: (s: TimerStyle) => void
  setAccent: (color: string | null) => void
  addSwatch: (color: string) => void
  removeSwatch: (color: string) => void
  clearSwatches: () => void
  setMasterVolume: (v: number) => void
  toggleSound: (id: string) => void
  setVolume: (id: string, v: number) => void
  togglePlay: () => void

  setTimerConfig: (c: Partial<TimerConfig>) => void
  setTimerMode: (mode: TimerMode) => void
  setAutoStartBreak: (v: boolean) => void
  setAutoStartFocus: (v: boolean) => void
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
  /** Turn daily repeat on (`'daily'`) or off (`undefined`) for a task. */
  setTaskRecurrence: (id: string, recurrence: Task['recurrence']) => void
  /** Re-open any daily task that was completed on an earlier day. */
  rolloverDailyTasks: () => void

  // categories
  loadCategories: () => Promise<void>
  addCategory: (name: string) => void
  deleteCategory: (id: string) => void
  selectCategory: (id: string | null) => void
}

/** Resolve a sound by id from the built-in catalog. */
function findSound(id: string): Sound | undefined {
  return buildCatalog().find((s) => s.id === id)
}

// Module-level interval handle for the timer tick (kept out of React state).
let tickHandle: number | null = null

/**
 * Set (or clear) the accent. When a color is given we set the global --accent
 * variable AND add the `.tinted` class, which re-derives the entire palette
 * from that color (see index.css). When null, both are cleared so the UI falls
 * back to the monochrome black-and-white stylesheet default.
 */
function applyAccent(color: string | null) {
  const root = document.documentElement
  if (color) {
    root.style.setProperty('--accent', color)
    root.classList.add('tinted')
  } else {
    root.style.removeProperty('--accent')
    root.classList.remove('tinted')
  }
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      masterVolume: 0.8,
      mix: {},
      isPlaying: false,

      timer: { workMinutes: 25, breakMinutes: 5, sessions: 4 },
      timerMode: 'pomodoro',
      autoStartBreak: true,
      autoStartFocus: true,
      phase: 'idle',
      remainingSec: 0,
      elapsedSec: 0,
      completedSessions: 0,
      timerRunning: false,
      phaseStartedAt: null,

      focusMode: false,

      timerStyle: 'ring',
      accent: null,
      customSwatches: [],

      tasks: [],
      selectedTaskId: null,

      categories: [],
      activeCategoryId: null,

      toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),

      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        // Mirror to a dedicated key so the pre-paint script (index.html) can
        // apply the right theme before React loads - no flash.
        try {
          localStorage.setItem('cadence:theme', theme)
        } catch {
          /* ignore */
        }
        set({ theme })
      },

      setTimerStyle: (s) => set({ timerStyle: s }),

      setAccent: (color) => {
        applyAccent(color)
        set({ accent: color })
      },

      addSwatch: (color) => {
        const c = color.toLowerCase()
        const swatches = get().customSwatches
        if (!swatches.includes(c)) set({ customSwatches: [...swatches, c] })
        get().setAccent(c) // selecting the new color immediately
      },

      removeSwatch: (color) => {
        const c = color.toLowerCase()
        set({ customSwatches: get().customSwatches.filter((s) => s !== c) })
        if (get().accent === c) get().setAccent(null)
      },

      clearSwatches: () => {
        // Drop every saved custom color; if the active accent was one of them,
        // fall back to monochrome so nothing dangles.
        const { accent, customSwatches } = get()
        if (accent && customSwatches.includes(accent)) get().setAccent(null)
        set({ customSwatches: [] })
      },

      setMasterVolume: (v) => {
        engine.setMasterVolume(v)
        set({ masterVolume: v })
      },

      toggleSound: (id) => {
        const { mix, isPlaying, masterVolume } = get()
        if (id in mix) {
          // Remove from the mix.
          engine.stop(id)
          const next = { ...mix }
          delete next[id]
          const stillPlaying = Object.keys(next).length > 0 && isPlaying
          set({ mix: next, isPlaying: stillPlaying })
        } else {
          const sound = findSound(id)
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
        const { isPlaying, mix, masterVolume } = get()
        if (isPlaying) {
          void engine.suspend()
          set({ isPlaying: false })
        } else {
          // Start any mix entries that aren't live yet (e.g. after a reload).
          engine.setMasterVolume(masterVolume)
          for (const [id, vol] of Object.entries(mix)) {
            const sound = findSound(id)
            if (sound) void engine.start(sound, vol)
          }
          void engine.resume()
          set({ isPlaying: true })
        }
      },

      setTimerConfig: (c) => {
        set({ timer: { ...get().timer, ...c } })
        // Reflect config edits immediately when the timer is idle.
        if (get().phase === 'idle') {
          set({ remainingSec: (c.workMinutes ?? get().timer.workMinutes) * 60 })
        }
      },

      setTimerMode: (mode) => {
        // Switching the clock type always returns to a clean idle state.
        stopTicking()
        set({
          timerMode: mode,
          timerRunning: false,
          phase: 'idle',
          remainingSec: mode === 'pomodoro' ? get().timer.workMinutes * 60 : 0,
          elapsedSec: 0,
          completedSessions: 0,
          phaseStartedAt: null,
        })
      },

      setAutoStartBreak: (v) => set({ autoStartBreak: v }),
      setAutoStartFocus: (v) => set({ autoStartFocus: v }),

      startTimer: () => {
        const { phase, timer, timerMode, isPlaying, togglePlay } = get()
        if (phase === 'idle') {
          set({
            phase: 'work',
            remainingSec: timerMode === 'stopwatch' ? 0 : timer.workMinutes * 60,
            elapsedSec: 0,
            completedSessions: 0,
            phaseStartedAt: Date.now(),
          })
        } else if (get().phaseStartedAt === null) {
          // Resuming a phase that was parked at a boundary because auto-start is
          // off (e.g. focus ended, waiting for the user to start the break).
          set({ phaseStartedAt: Date.now() })
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
        // A stopwatch run that's accumulated real time counts as a focus session.
        const { timerMode, phase, elapsedSec, phaseStartedAt } = get()
        if (timerMode === 'stopwatch' && phase !== 'idle' && elapsedSec >= 60) {
          logCompleted('focus', Math.round(elapsedSec / 60), phaseStartedAt, get)
          get().bumpActiveTaskSession()
        }
        stopTicking()
        set({
          timerRunning: false,
          phase: 'idle',
          remainingSec: 0,
          elapsedSec: 0,
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
          get().rolloverDailyTasks()
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
        const completed = !task.completed
        // Stamp the completion time so a daily task knows which day it was for.
        const updated = {
          ...task,
          completed,
          completed_at: completed ? new Date().toISOString() : undefined,
        }
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

      setTaskRecurrence: (id, recurrence) => {
        const task = get().tasks.find((x) => x.id === id)
        if (!task) return
        const updated = { ...task, recurrence }
        set({ tasks: get().tasks.map((x) => (x.id === id ? updated : x)) })
        void updateTask(updated)
      },

      rolloverDailyTasks: () => {
        const { tasks } = get()
        let changed = false
        const next = tasks.map((t) => {
          // A daily task completed on an earlier day re-opens for today.
          if (t.recurrence === 'daily' && t.completed && t.completed_at && !isToday(t.completed_at)) {
            changed = true
            const reset = { ...t, completed: false, completed_at: undefined }
            void updateTask(reset)
            return reset
          }
          return t
        })
        if (changed) set({ tasks: next })
      },

      // ── categories ──────────────────────────────────────────────────────────
      loadCategories: async () => {
        try {
          set({ categories: await fetchCategories() })
        } catch {
          /* keep whatever we have */
        }
      },

      addCategory: (name) => {
        const n = name.trim()
        if (!n) return
        const { categories } = get()
        // Avoid duplicates (case-insensitive).
        if (categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) return
        const position = categories.reduce((m, x) => Math.max(m, x.position), -1) + 1
        const category: Category = {
          id: crypto.randomUUID(),
          name: n,
          position,
          created_at: new Date().toISOString(),
        }
        set({ categories: [...categories, category], activeCategoryId: category.id })
        void createCategory(category)
      },

      deleteCategory: (id) => {
        const { categories, activeCategoryId } = get()
        set({
          categories: categories.filter((c) => c.id !== id),
          activeCategoryId: activeCategoryId === id ? null : activeCategoryId,
        })
        void deleteCategoryRow(id)
      },

      // Toggle selection: clicking the active category again deselects it.
      selectCategory: (id) =>
        set({ activeCategoryId: get().activeCategoryId === id ? null : id }),
    }),
    {
      name: 'cadence:state',
      // Persist only durable preferences - never live playback state.
      partialize: (s) => ({
        theme: s.theme,
        masterVolume: s.masterVolume,
        mix: s.mix,
        timer: s.timer,
        timerMode: s.timerMode,
        autoStartBreak: s.autoStartBreak,
        autoStartFocus: s.autoStartFocus,
        selectedTaskId: s.selectedTaskId,
        activeCategoryId: s.activeCategoryId,
        timerStyle: s.timerStyle,
        accent: s.accent,
        customSwatches: s.customSwatches,
      }),
      onRehydrateStorage: () => (state) => {
        // Keep the <html> class in sync with the persisted theme, apply the
        // saved accent, and never resume audio automatically (autoplay rules).
        if (state) {
          document.documentElement.classList.toggle('dark', state.theme === 'dark')
          try {
            localStorage.setItem('cadence:theme', state.theme)
          } catch {
            /* ignore */
          }
          applyAccent(state.accent ?? null)
          state.isPlaying = false
          state.elapsedSec = 0
          state.remainingSec =
            state.timerMode === 'stopwatch' ? 0 : state.timer.workMinutes * 60
        }
      },
    },
  ),
)

// ── timer ticking (module-level, outside React) ─────────────────────────────
function startTicking(set: SetFn, get: GetFn) {
  stopTicking()
  tickHandle = window.setInterval(() => {
    const { remainingSec, phase, timer, completedSessions, timerMode } = get()
    // Stopwatch simply accumulates - no phases, no boundary.
    if (timerMode === 'stopwatch') {
      set({ elapsedSec: get().elapsedSec + 1 })
      return
    }
    if (remainingSec > 1) {
      set({ remainingSec: remainingSec - 1 })
      return
    }
    // Phase boundary reached - the phase that just ended is a completed session.
    const startedAt = get().phaseStartedAt
    if (phase === 'work') {
      logCompleted('focus', timer.workMinutes, startedAt, get)
      get().bumpActiveTaskSession() // credit the active task with a pomodoro
      const done = completedSessions + 1
      if (done >= timer.sessions) {
        // All sessions complete - wind down.
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
        // Move into the break. Auto-start keeps ticking; otherwise park it at
        // the boundary (paused, no start time) until the user hits start.
        void engine.chime(false)
        const auto = get().autoStartBreak
        set({
          phase: 'break',
          remainingSec: timer.breakMinutes * 60,
          completedSessions: done,
          phaseStartedAt: auto ? Date.now() : null,
          timerRunning: auto,
        })
        if (!auto) stopTicking()
      }
    } else {
      // Break finished - record it, then back to work (auto-start or parked).
      logCompleted('break', timer.breakMinutes, startedAt, get)
      void engine.chime(true)
      const auto = get().autoStartFocus
      set({
        phase: 'work',
        remainingSec: timer.workMinutes * 60,
        phaseStartedAt: auto ? Date.now() : null,
        timerRunning: auto,
      })
      if (!auto) stopTicking()
    }
  }, 1000)
}

/** A human-readable summary of what was playing, for the session's soundscape. */
function mixDescription(get: GetFn): string | null {
  const { mix } = get()
  const names = Object.keys(mix)
    .map((id) => findSound(id)?.name)
    .filter((n): n is string => Boolean(n))
  return names.length ? names.join(', ') : null
}

/** Name of the active category (for attributing focus hours), or null. */
function activeCategoryName(get: GetFn): string | null {
  const { activeCategoryId, categories } = get()
  if (!activeCategoryId) return null
  return categories.find((c) => c.id === activeCategoryId)?.name ?? null
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
    // Only focus sessions are attributed to a category.
    category: type === 'focus' ? activeCategoryName(get) : null,
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
