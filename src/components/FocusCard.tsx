/*
 * The focus-session card on the main screen. When idle it tunes the
 * Pomodoro-style intervals (work / break / repeats). When a session is running
 * it shows the live countdown and controls right here — so the timer runs
 * inline and the student keeps full access to the mixer, volume, and library
 * below. An optional "Focus mode" button opens the distraction-free fullscreen.
 */
import type { ReactNode } from 'react'
import { Maximize2, Minus, Pause, Play, Plus, RotateCcw, Timer as TimerIcon } from 'lucide-react'
import { useStore } from '../state/store'
import type { TimerConfig } from '../state/store'
import { formatClock } from '../lib/time'

export function FocusCard() {
  const timer = useStore((s) => s.timer)
  const phase = useStore((s) => s.phase)
  const remainingSec = useStore((s) => s.remainingSec)
  const running = useStore((s) => s.timerRunning)
  const completed = useStore((s) => s.completedSessions)
  const setTimerConfig = useStore((s) => s.setTimerConfig)
  const startTimer = useStore((s) => s.startTimer)
  const pauseTimer = useStore((s) => s.pauseTimer)
  const resetTimer = useStore((s) => s.resetTimer)
  const enterFocus = useStore((s) => s.enterFocus)

  const idle = phase === 'idle'

  return (
    <section className="w-full">
      <h2 className="mb-4 flex items-center gap-2 text-[14px] font-medium uppercase tracking-[0.14em] text-tertiary">
        <TimerIcon className="h-4 w-4" strokeWidth={1.5} />
        Focus session
      </h2>

      <div className="glass rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow)]">
        {idle ? (
          <>
            <div className="grid grid-cols-3 gap-3">
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

            <button
              onClick={startTimer}
              className="mt-5 w-full rounded-full bg-ink py-3 text-[15px] font-medium text-ink-contrast transition-all duration-200 ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.98]"
            >
              Begin focus
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-5 py-1">
            <span className="text-[12px] uppercase tracking-[0.3em] text-tertiary">
              {phase === 'work' ? 'Focus' : 'Break'}
            </span>
            <span className="text-[60px] font-light leading-none tabular-nums text-content">
              {formatClock(remainingSec)}
            </span>

            {timer.sessions > 1 && (
              <div className="flex items-center gap-2">
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

            <div className="mt-1 flex items-center gap-3">
              {running ? (
                <RoundBtn onClick={pauseTimer} label="Pause timer">
                  <Pause className="h-4 w-4" strokeWidth={1.5} fill="currentColor" />
                </RoundBtn>
              ) : (
                <RoundBtn onClick={startTimer} label="Resume timer">
                  <Play className="h-4 w-4 translate-x-[1px]" strokeWidth={1.5} fill="currentColor" />
                </RoundBtn>
              )}
              <RoundBtn onClick={resetTimer} label="Reset timer">
                <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
              </RoundBtn>
              <RoundBtn onClick={enterFocus} label="Open focus mode">
                <Maximize2 className="h-4 w-4" strokeWidth={1.5} />
              </RoundBtn>
            </div>
          </div>
        )}
      </div>
    </section>
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
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(Math.min(max, value + step))
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[12px] uppercase tracking-[0.1em] text-tertiary">{label}</span>
      <div className="flex items-center gap-2">
        <SmallBtn onClick={dec} disabled={value <= min} label={`Decrease ${label}`}>
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        </SmallBtn>
        <span className="w-10 text-center text-[22px] font-medium tabular-nums text-content">
          {value}
          <span className="ml-0.5 text-[12px] text-tertiary">{unit}</span>
        </span>
        <SmallBtn onClick={inc} disabled={value >= max} label={`Increase ${label}`}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </SmallBtn>
      </div>
    </div>
  )
}

function SmallBtn({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-full border border-hairline text-secondary transition-colors duration-200 hover:bg-fill hover:text-content disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function RoundBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-full border border-hairline text-secondary transition-all duration-200 ease-[var(--ease-out)] hover:bg-fill hover:text-content active:scale-95"
    >
      {children}
    </button>
  )
}

export type { TimerConfig }
