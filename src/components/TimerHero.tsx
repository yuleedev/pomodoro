/*
 * The hero Pomodoro timer — the primary focal point at the top of the page.
 *
 * A grayscale circular progress ring (stroke weight + opacity, never color)
 * wraps big tight-tracked numerals and the active task name. A faint ring
 * "breathes" while the timer runs — the signature animated element. Controls
 * sit below; when idle, compact duration steppers appear. Strictly monochrome.
 */
import { Maximize2, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react'
import { useStore } from '../state/store'
import { formatClock } from '../lib/time'

const R = 46
const C = 2 * Math.PI * R

export function TimerHero() {
  const timer = useStore((s) => s.timer)
  const phase = useStore((s) => s.phase)
  const remainingSec = useStore((s) => s.remainingSec)
  const running = useStore((s) => s.timerRunning)
  const completed = useStore((s) => s.completedSessions)
  const startTimer = useStore((s) => s.startTimer)
  const pauseTimer = useStore((s) => s.pauseTimer)
  const resetTimer = useStore((s) => s.resetTimer)
  const enterFocus = useStore((s) => s.enterFocus)
  const setTimerConfig = useStore((s) => s.setTimerConfig)
  const activeTask = useStore((s) => s.tasks.find((t) => t.id === s.selectedTaskId))

  const idle = phase === 'idle'
  const totalSec = (phase === 'break' ? timer.breakMinutes : timer.workMinutes) * 60
  const shownSec = idle ? timer.workMinutes * 60 : remainingSec
  const fraction = idle ? 1 : Math.max(0, Math.min(1, remainingSec / totalSec))
  const phaseLabel = idle ? 'Ready' : phase === 'work' ? 'Focus' : 'Break'

  return (
    <section className="flex flex-col items-center pt-2">
      <p className="mb-6 text-[13px] uppercase tracking-[0.32em] text-tertiary">{phaseLabel}</p>

      {/* Ring + numerals */}
      <div className="relative aspect-square w-full max-w-[320px]">
        {/* Breathing glow — only while running. */}
        {running && (
          <div
            className="pointer-events-none absolute inset-[12%] rounded-full"
            style={{
              background:
                'radial-gradient(circle, color-mix(in srgb, var(--ink) 14%, transparent) 0%, transparent 70%)',
              animation: 'breathe 4.5s ease-in-out infinite',
            }}
          />
        )}

        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          {/* Track */}
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--fill-strong)" strokeWidth="2" />
          {/* Progress */}
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - fraction)}
            style={{ transition: 'stroke-dashoffset 0.6s linear' }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <span
            className="font-light tabular-nums leading-none text-content"
            style={{ fontSize: 'clamp(48px, 17vw, 80px)', letterSpacing: '-0.03em' }}
          >
            {formatClock(shownSec)}
          </span>
          <span className="mt-3 max-w-full truncate text-[13px] text-secondary">
            {activeTask ? activeTask.title : <span className="text-tertiary">No task selected</span>}
          </span>
        </div>
      </div>

      {/* Session dots */}
      {timer.sessions > 1 && (
        <div className="mt-6 flex items-center gap-2">
          {Array.from({ length: timer.sessions }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                i < completed ? 'bg-content' : 'bg-fill-strong'
              }`}
            />
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="mt-8 flex items-center gap-5">
        <GhostBtn onClick={resetTimer} label="Reset timer">
          <RotateCcw className="h-5 w-5" strokeWidth={1.5} />
        </GhostBtn>

        <button
          onClick={running ? pauseTimer : startTimer}
          aria-label={running ? 'Pause timer' : 'Start timer'}
          className="grid h-20 w-20 place-items-center rounded-full bg-ink text-ink-contrast shadow-[var(--shadow)] transition-all duration-300 ease-[var(--ease-out)] hover:scale-[1.04] active:scale-95"
        >
          {running ? (
            <Pause className="h-8 w-8" strokeWidth={1.5} fill="currentColor" />
          ) : (
            <Play className="h-8 w-8 translate-x-[2px]" strokeWidth={1.5} fill="currentColor" />
          )}
        </button>

        <GhostBtn onClick={enterFocus} label="Enter focus mode">
          <Maximize2 className="h-5 w-5" strokeWidth={1.5} />
        </GhostBtn>
      </div>

      {/* Duration steppers (only when idle) */}
      {idle && (
        <div className="mt-9 grid w-full max-w-sm grid-cols-3 gap-3">
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
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-12 w-12 place-items-center rounded-full text-secondary transition-all duration-200 ease-[var(--ease-out)] hover:bg-fill hover:text-content active:scale-95"
    >
      {children}
    </button>
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
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.1em] text-tertiary">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="grid h-7 w-7 place-items-center rounded-full border border-hairline text-secondary transition-colors duration-200 hover:bg-fill hover:text-content disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <span className="w-11 text-center text-[20px] font-medium tabular-nums text-content">
          {value}
          <span className="ml-0.5 text-[11px] text-tertiary">{unit}</span>
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
