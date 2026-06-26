/*
 * The hero Pomodoro timer - the primary focal point at the top of the page.
 *
 * A grayscale circular progress ring (stroke weight + opacity, never color)
 * wraps big tight-tracked numerals and the active task name. Controls sit
 * below; when idle, compact duration steppers appear. Strictly monochrome.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react'
import { useStore } from '../state/store'
import { formatClock } from '../lib/time'
import { popSpring, softSpring, spring, tapScale } from '../lib/motion'
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
  const setTimerConfig = useStore((s) => s.setTimerConfig)
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

      {/* Duration steppers (Pomodoro, idle only) — collapse/expand on mode switch. */}
      <AnimatePresence initial={false}>
        {idle && !stopwatch && (
          <motion.div
            key="steppers"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={softSpring}
            className="w-full max-w-sm overflow-hidden"
          >
            <div className="mt-7 grid grid-cols-3 gap-3">
              <Stepper
                label="Focus"
                unit="min"
                value={timer.workMinutes}
                min={5}
                max={180}
                step={5}
                onChange={(v) => setTimerConfig({ workMinutes: v })}
              />
              <Stepper
                label="Break"
                unit="min"
                value={timer.breakMinutes}
                min={1}
                max={60}
                step={1}
                onChange={(v) => setTimerConfig({ breakMinutes: v })}
              />
              <Stepper
                label="Rounds"
                unit="×"
                value={timer.sessions}
                min={1}
                max={12}
                step={1}
                onChange={(v) => setTimerConfig({ sessions: v })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

function Stepper({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  // While editing, hold the raw text so partial input ("1", "") isn't clamped
  // mid-keystroke. On blur/Enter we parse, clamp to [min, max], and commit.
  const [draft, setDraft] = useState<string | null>(null)

  const commit = (raw: string) => {
    const n = Math.round(Number(raw))
    if (raw.trim() !== '' && Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)))
    setDraft(null)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[12px] uppercase tracking-[0.1em] text-tertiary">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="grid h-7 w-7 place-items-center rounded-full border border-hairline text-secondary transition-colors duration-200 hover:bg-fill hover:text-content disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <span className="flex w-11 items-baseline justify-center text-[22px] font-medium tabular-nums text-content">
          <input
            type="text"
            inputMode="numeric"
            aria-label={`${label} (${unit})`}
            value={draft ?? String(value)}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="w-7 bg-transparent text-right tabular-nums text-content outline-none focus:text-accent"
          />
          <span className="ml-0.5 text-[12px] text-tertiary">{unit}</span>
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="grid h-7 w-7 place-items-center rounded-full border border-hairline text-secondary transition-colors duration-200 hover:bg-fill hover:text-content disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
