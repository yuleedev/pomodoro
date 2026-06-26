/*
 * Focus mode — a full-field, distraction-free view. Just the timer, the phase,
 * the session progress, and a way to stop. Centered monochrome type, nothing
 * else. Escape or the close control returns to the main screen.
 */
import type { ReactNode } from 'react'
import { Pause, Play, RotateCcw, X } from 'lucide-react'
import { useStore } from '../state/store'
import { formatClock } from '../lib/time'

export function FocusMode() {
  const phase = useStore((s) => s.phase)
  const mode = useStore((s) => s.timerMode)
  const remainingSec = useStore((s) => s.remainingSec)
  const elapsedSec = useStore((s) => s.elapsedSec)
  const running = useStore((s) => s.timerRunning)
  const timer = useStore((s) => s.timer)
  const completed = useStore((s) => s.completedSessions)

  const startTimer = useStore((s) => s.startTimer)
  const pauseTimer = useStore((s) => s.pauseTimer)
  const resetTimer = useStore((s) => s.resetTimer)
  const exitFocus = useStore((s) => s.exitFocus)
  const activeTask = useStore((s) => s.tasks.find((t) => t.id === s.selectedTaskId))

  const isIdle = phase === 'idle'
  const stopwatch = mode === 'stopwatch'
  const label = stopwatch
    ? isIdle
      ? 'Stopwatch'
      : 'Focus'
    : isIdle
      ? completed >= timer.sessions && timer.sessions > 0
        ? 'Done'
        : 'Ready'
      : phase === 'work'
        ? 'Focus'
        : 'Break'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg animate-fade-in">
      {/* Close (top-right) */}
      <button
        onClick={exitFocus}
        aria-label="Exit focus mode"
        className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full text-tertiary transition-colors duration-200 hover:bg-fill hover:text-content"
      >
        <X className="h-5 w-5" strokeWidth={1.5} />
      </button>

      {/* Phase label */}
      <p className="mb-6 text-[14px] uppercase tracking-[0.35em] text-tertiary">{label}</p>

      {/* The clock — the single focal point */}
      <div className="select-none text-[18vw] font-light leading-none tracking-tight tabular-nums text-content sm:text-[130px]">
        {stopwatch
          ? formatClock(isIdle ? 0 : elapsedSec)
          : formatClock(isIdle ? timer.workMinutes * 60 : remainingSec)}
      </div>

      {/* Active task */}
      {activeTask && (
        <p className="mt-6 max-w-xs truncate px-6 text-center text-[15px] text-secondary">
          {activeTask.title}
        </p>
      )}

      {/* Session progress dots */}
      {!stopwatch && timer.sessions > 1 && (
        <div className="mt-10 flex items-center gap-2.5">
          {Array.from({ length: timer.sessions }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                i < completed ? 'bg-content' : 'bg-fill-strong'
              }`}
            />
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="mt-12 flex items-center gap-4">
        {running ? (
          <ControlBtn onClick={pauseTimer} label="Pause timer">
            <Pause className="h-5 w-5" strokeWidth={1.5} fill="currentColor" />
          </ControlBtn>
        ) : (
          <ControlBtn onClick={startTimer} label={isIdle ? 'Start timer' : 'Resume timer'} primary>
            <Play className="h-5 w-5 translate-x-[1px]" strokeWidth={1.5} fill="currentColor" />
          </ControlBtn>
        )}
        <ControlBtn onClick={resetTimer} label="Reset timer">
          <RotateCcw className="h-5 w-5" strokeWidth={1.5} />
        </ControlBtn>
      </div>

      <p className="absolute bottom-8 text-[13px] text-tertiary">Press Esc to exit</p>
    </div>
  )
}

function ControlBtn({
  onClick,
  label,
  primary,
  children,
}: {
  onClick: () => void
  label: string
  primary?: boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`grid h-14 w-14 place-items-center rounded-full transition-all duration-200 ease-[var(--ease-out)] hover:scale-105 active:scale-95 ${
        primary
          ? 'bg-ink text-ink-contrast shadow-[var(--shadow)]'
          : 'border border-hairline text-secondary hover:bg-fill hover:text-content'
      }`}
    >
      {children}
    </button>
  )
}
