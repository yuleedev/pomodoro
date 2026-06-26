/*
 * Settings panel - timer intervals and automation, opened from the top bar.
 * Focus / break / rounds are set with draggable bars; the automation toggles
 * decide whether the next phase starts on its own or waits for you.
 */
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'
import { popSpring, spring } from '../lib/motion'

export function SettingsPanel() {
  const close = useUI((s) => s.closeSettings)
  const timer = useStore((s) => s.timer)
  const setTimerConfig = useStore((s) => s.setTimerConfig)
  const autoStartBreak = useStore((s) => s.autoStartBreak)
  const autoStartFocus = useStore((s) => s.autoStartFocus)
  const setAutoStartBreak = useStore((s) => s.setAutoStartBreak)
  const setAutoStartFocus = useStore((s) => s.setAutoStartFocus)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      {/* Backdrop. `backdrop-soften` keeps the blur alive permanently (see
          index.css) so the card's spring animation can't make Chromium drop it. */}
      <div
        className="backdrop-soften absolute inset-0 bg-black/40"
        onClick={close}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={popSpring}
        className="relative m-3 flex max-h-[85dvh] w-full max-w-md flex-col rounded-[var(--radius-2xl)] border border-hairline bg-elevated p-6 shadow-[var(--shadow)]"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[20px] font-medium tracking-tight text-content">Settings</h2>
          <button
            onClick={close}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full text-tertiary transition-colors duration-200 hover:bg-fill hover:text-content"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="-mx-1 space-y-8 overflow-y-auto px-1 pb-1">
          {/* Timer intervals */}
          <Section title="Timer">
            <div className="space-y-6">
              <RangeRow
                label="Focus"
                value={timer.workMinutes}
                min={5}
                max={120}
                step={5}
                format={(v) => `${v} min`}
                onChange={(v) => setTimerConfig({ workMinutes: v })}
              />
              <RangeRow
                label="Break"
                value={timer.breakMinutes}
                min={1}
                max={45}
                step={1}
                format={(v) => `${v} min`}
                onChange={(v) => setTimerConfig({ breakMinutes: v })}
              />
              <RangeRow
                label="Rounds"
                value={timer.sessions}
                min={1}
                max={12}
                step={1}
                format={(v) => `${v}×`}
                onChange={(v) => setTimerConfig({ sessions: v })}
              />
            </div>
          </Section>

          {/* Automation */}
          <Section title="Automation">
            <div className="space-y-1">
              <ToggleRow
                label="Auto-start breaks"
                description="Start the rest timer automatically when a focus session ends."
                checked={autoStartBreak}
                onChange={setAutoStartBreak}
              />
              <ToggleRow
                label="Auto-start focus"
                description="Start the next focus session automatically when a break ends."
                checked={autoStartFocus}
                onChange={setAutoStartFocus}
              />
            </div>
          </Section>
        </div>
      </motion.div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-tertiary">
        {title}
      </h3>
      {children}
    </div>
  )
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  const pct = Math.round(((value - min) / (max - min)) * 100)
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-[15px] text-content">{label}</span>
        <span className="text-[15px] font-medium tabular-nums text-content">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
        style={{
          background: `linear-gradient(to right, var(--ink) 0%, var(--ink) ${pct}%, var(--fill-strong) ${pct}%, var(--fill-strong) 100%)`,
        }}
      />
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[15px] text-content">{label}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-tertiary">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-ink' : 'bg-fill-strong'
        }`}
      >
        <motion.span
          className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-elevated shadow-[var(--shadow)]"
          animate={{ x: checked ? 16 : 0 }}
          transition={spring}
        />
      </button>
    </div>
  )
}
