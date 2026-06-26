/*
 * App shell. Composes the calm, single-column layout: a quiet header, a hero
 * built around the breathing visualizer and the one large play control, then
 * the sound library, mixer, and focus session. The frosted control bar is
 * always present; focus mode takes over the whole field.
 */
import { BreathingVisualizer } from './components/BreathingVisualizer'
import { ControlBar } from './components/ControlBar'
import { FocusCard } from './components/FocusCard'
import { FocusMode } from './components/FocusMode'
import { Header } from './components/Header'
import { Mixer } from './components/Mixer'
import { SoundLibrary } from './components/SoundLibrary'
import { useKeyboard } from './hooks/useKeyboard'
import { useStore } from './state/store'

export function App() {
  useKeyboard()
  const focusMode = useStore((s) => s.focusMode)

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
    </div>
  )
}
