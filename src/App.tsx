/*
 * App shell. Focus-first layout: the Pomodoro hero timer leads and the task
 * list sits directly beneath it (they work together). The soundscape lives in
 * its own panel, opened from the top bar. The frosted control bar is always
 * present; focus mode, sign-in, history, and the panels take over the field.
 */
import { useEffect } from 'react'
import { AuthPanel } from './components/AuthPanel'
import { CategoryBar } from './components/CategoryBar'
import { ControlBar } from './components/ControlBar'
import { CustomizePanel } from './components/CustomizePanel'
import { FocusMode } from './components/FocusMode'
import { Header } from './components/Header'
import { HistoryView } from './components/HistoryView'
import { Reveal } from './components/Reveal'
import { SoundPanel } from './components/SoundPanel'
import { TaskList } from './components/TaskList'
import { TimerHero } from './components/TimerHero'
import { useKeyboard } from './hooks/useKeyboard'
import { useAuth } from './state/auth'
import { useStore } from './state/store'
import { useUI } from './state/ui'

export function App() {
  useKeyboard()
  const focusMode = useStore((s) => s.focusMode)
  const loadTasks = useStore((s) => s.loadTasks)
  const loadCategories = useStore((s) => s.loadCategories)
  const authOpen = useUI((s) => s.authOpen)
  const historyOpen = useUI((s) => s.historyOpen)
  const customizeOpen = useUI((s) => s.customizeOpen)
  const soundOpen = useUI((s) => s.soundOpen)
  const initAuth = useAuth((s) => s.init)
  const userId = useAuth((s) => s.user?.id)
  const authStatus = useAuth((s) => s.status)

  // Resolve the persisted session and start listening for magic-link returns.
  useEffect(() => {
    initAuth()
  }, [initAuth])

  // Load tasks + categories initially and reload when auth changes (local ↔ remote).
  useEffect(() => {
    void loadTasks()
    void loadCategories()
  }, [loadTasks, loadCategories, userId, authStatus])

  return (
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-xl px-5 pb-40">
        <Reveal>
          <Header />
        </Reveal>

        <div className="space-y-12 pt-2">
          {/* Centerpiece + optional category attribution */}
          <Reveal delay={0.06} className="space-y-6">
            <TimerHero />
            <CategoryBar />
          </Reveal>

          {/* Integrated to-do list */}
          <Reveal delay={0.14}>
            <TaskList />
          </Reveal>
        </div>
      </div>

      <ControlBar />

      {focusMode && <FocusMode />}
      {historyOpen && <HistoryView />}
      {authOpen && <AuthPanel />}
      {customizeOpen && <CustomizePanel />}
      {soundOpen && <SoundPanel />}
    </div>
  )
}
