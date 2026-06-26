/*
 * The hero Pomodoro timer - the primary focal point at the top of the page.
 *
 * A grayscale circular progress ring (stroke weight + opacity, never color)
 * wraps big tight-tracked numerals and the active task name. Controls sit
 * below; when idle, the Pomodoro/Stopwatch toggle appears. Durations and
 * automation live in the Settings panel. Strictly monochrome.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, Pause, Play, RotateCcw } from 'lucide-react'
import { useStore } from '../state/store'
import { formatClock } from '../lib/time'
import { popSpring, spring, tapScale } from '../lib/motion'
import { TimerRing } from './TimerRing'

export function TimerHero() {
  const timer = useStore((s) => s.timer)
  const mode = useStore((s) => s.timerMode)
  const phase = useStore((s) => s.phase)
  const remainingSec = useStore((s) => s.remainingSec)
  const elapsedSec = useStore((s) => s.elapsedSec)
  const running = useStore((s) => s.timerRunning)
  const completed = useStore((s) => s.completedSessions)
  const timerStyle = useStore((s) => s.timerStyle)
  const startTimer = useStore((s) => s.startTimer)
  const pauseTimer = useStore((s) => s.pauseTimer)
  const resetTimer = useStore((s) => s.resetTimer)
  const enterFocus = useStore((s) => s.enterFocus)
  const setTimerMode = useStore((s) => s.setTimerMode)
  const activeTask = useStore((s) => s.tasks.find((t) => t.id === s.selectedTaskId))

  const idle = phase === 'idle'
  const stopwatch = mode === 'stopwatch'
  const totalSec = (phase === 'break' ? timer.breakMinutes : timer.workMinutes) * 60
  const shownSec = stopwatch ? elapsedSec : idle ? timer.workMinutes * 60 : remainingSec
  // Stopwatch has no fixed end, so the ring stays full (it just breathes).
  const fraction = stopwatch ? 1 : idle ? 1 : Math.max(0, Math.min(1, remainingSec / totalSec))
  const phaseLabel = stopwatch
    ? idle
      ? 'Stopwatch'
      : 'Focus'
    : idle
      ? 'Ready'
      : phase === 'work'
        ? 'Focus'
        : 'Break'

  return (
    <section className="flex flex-col items-center pt-2">
      <p className="mb-6 text-[14px] uppercase tracking-[0.32em] text-tertiary">{phaseLabel}</p>

      {/* Ring + numerals */}
      <div className="relative aspect-square w-full max-w-[320px]">
        {/* Swap ring shapes with a springy pop when the style changes. */}
        <AnimatePresence>
          <motion.div
            key={timerStyle}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.82 }}
            transition={popSpring}
          >
            <TimerRing fraction={fraction} style={timerStyle} />
          </motion.div>
        </AnimatePresence>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <span
            className="font-light tabular-nums leading-none text-content"
            style={{ fontSize: 'clamp(54px, 18vw, 88px)', letterSpacing: '-0.03em' }}
          >
            {formatClock(shownSec)}
          </span>
          <span className="mt-3 max-w-full truncate text-[14px] text-secondary">
            {activeTask ? activeTask.title : <span className="text-tertiary">No task selected</span>}
          </span>
        </div>
      </div>

      {/* Session dots */}
      {!stopwatch && timer.sessions > 1 && (
        <div className="mt-6 flex items-center gap-2">
          {Array.from({ length: timer.sessions }).map((_, i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: i < completed ? 'var(--accent)' : 'var(--fill-strong)' }}
              animate={{ scale: i < completed ? [1, 1.5, 1] : 1 }}
              transition={spring}
            />
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="mt-8 flex items-center gap-5">
        <GhostBtn onClick={resetTimer} label="Reset timer">
          <RotateCcw className="h-5 w-5" strokeWidth={1.5} />
        </GhostBtn>

        <motion.button
          onClick={running ? pauseTimer : startTimer}
          aria-label={running ? 'Pause timer' : 'Start timer'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          transition={spring}
          className="grid h-20 w-20 place-items-center rounded-full bg-ink text-ink-contrast shadow-[var(--shadow)]"
        >
          {running ? (
            <Pause className="h-8 w-8" strokeWidth={1.5} fill="currentColor" />
          ) : (
            <Play className="h-8 w-8 translate-x-[2px]" strokeWidth={1.5} fill="currentColor" />
          )}
        </motion.button>

        <GhostBtn onClick={enterFocus} label="Enter focus mode">
          <Maximize2 className="h-5 w-5" strokeWidth={1.5} />
        </GhostBtn>
      </div>

      {/* Mode toggle: Pomodoro countdown vs. count-up stopwatch (idle only).
          The active pill slides between options with a spring (layoutId). */}
      {idle && (
        <div className="mt-8 inline-flex rounded-full border border-hairline p-0.5">
          {(['pomodoro', 'stopwatch'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTimerMode(m)}
              aria-pressed={mode === m}
              className="relative rounded-full px-4 py-1.5 text-[13px] capitalize tracking-wide"
            >
              {mode === m && (
                <motion.span
                  layoutId="modePill"
                  transition={spring}
                  className="absolute inset-0 rounded-full bg-ink"
                />
              )}
              <span
                className={`relative z-10 transition-colors duration-200 ${
                  mode === m ? 'text-ink-contrast' : 'text-secondary hover:text-content'
                }`}
              >
                {m}
              </span>
            </button>
          ))}
        </div>
      )}

    </section>
  )
}

function GhostBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      whileTap={tapScale}
      transition={spring}
      className="grid h-12 w-12 place-items-center rounded-full text-secondary transition-colors duration-200 hover:bg-fill hover:text-content"
    >
      {children}
    </motion.button>
  )
}

