/*
 * The focus-session card on the main screen. Lets the student tune the
 * Pomodoro-style intervals (work / break / repeats) and begin a session, which
 * starts the timer and drops into the distraction-free focus view. Claude can
 * also set these values from the mood prompt.
 */
import type { ReactNode } from 'react'
import { Minus, Plus, Timer as TimerIcon } from 'lucide-react'
import { useStore } from '../state/store'
import type { TimerConfig } from '../state/store'

export function FocusCard() {
  const timer = useStore((s) => s.timer)
  const setTimerConfig = useStore((s) => s.setTimerConfig)
  const startTimer = useStore((s) => s.startTimer)
  const enterFocus = useStore((s) => s.enterFocus)

  const begin = () => {
    startTimer()
    enterFocus()
  }

  return (
    <section className="w-full">
      <h2 className="mb-4 flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-tertiary">
        <TimerIcon className="h-4 w-4" strokeWidth={1.5} />
        Focus session
      </h2>

      <div className="glass rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow)]">
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
          onClick={begin}
          className="mt-5 w-full rounded-full bg-ink py-3 text-[14px] font-medium text-ink-contrast transition-all duration-200 ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.98]"
        >
          Begin focus
        </button>
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
      <span className="text-[11px] uppercase tracking-[0.1em] text-tertiary">{label}</span>
      <div className="flex items-center gap-2">
        <RoundBtn onClick={dec} disabled={value <= min} label={`Decrease ${label}`}>
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        </RoundBtn>
        <span className="w-10 text-center text-[20px] font-medium tabular-nums text-content">
          {value}
          <span className="ml-0.5 text-[11px] text-tertiary">{unit}</span>
        </span>
        <RoundBtn onClick={inc} disabled={value >= max} label={`Increase ${label}`}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </RoundBtn>
      </div>
    </div>
  )
}

function RoundBtn({
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
      className="grid h-7 w-7 place-items-center rounded-full border border-hairline text-secondary transition-colors duration-200 hover:bg-fill hover:text-content disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  )
}

export type { TimerConfig }
