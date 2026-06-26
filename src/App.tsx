/*
 * App shell. Composes the calm, single-column layout: a quiet header, a hero
 * built around the breathing visualizer, then the sound library, mixer, and
 * focus session. The frosted control bar is always present; focus mode, the
 * sign-in panel, and the history view each take over the whole field.
 */
import { useEffect } from 'react'
import { AuthPanel } from './components/AuthPanel'
import { BreathingVisualizer } from './components/BreathingVisualizer'
import { ControlBar } from './components/ControlBar'
import { FocusCard } from './components/FocusCard'
import { FocusMode } from './components/FocusMode'
import { Header } from './components/Header'
import { HistoryView } from './components/HistoryView'
import { Mixer } from './components/Mixer'
import { SoundLibrary } from './components/SoundLibrary'
import { useKeyboard } from './hooks/useKeyboard'
import { useAuth } from './state/auth'
import { useStore } from './state/store'
import { useUI } from './state/ui'

export function App() {
  useKeyboard()
  const focusMode = useStore((s) => s.focusMode)
  const authOpen = useUI((s) => s.authOpen)
  const historyOpen = useUI((s) => s.historyOpen)
  const initAuth = useAuth((s) => s.init)

  // Resolve the persisted session and start listening for magic-link returns.
  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <div className="min-h-dvh">
      <div className="mx-auto w-full max-w-xl px-5 pb-40">
        <Header />

        {/* Hero — the signature breathing visualizer. Playback is driven from
            the frosted control bar at the bottom. */}
        <section className="relative flex flex-col items-center pt-2 pb-12">
          <div className="relative aspect-square w-full max-w-[260px]">
            <BreathingVisualizer />
          </div>
        </section>

        {/* The work below the fold — generous spacing, lots of air. */}
        <div className="space-y-14">
          <SoundLibrary />
          <Mixer />
          <FocusCard />
        </div>
      </div>

      <ControlBar />

      {focusMode && <FocusMode />}
      {historyOpen && <HistoryView />}
      {authOpen && <AuthPanel />}
    </div>
  )
}
