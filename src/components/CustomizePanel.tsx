/*
 * Customization panel - theme (black/white), timer style, and accent color.
 *
 * The app is monochrome by default; here the user can pick an accent or build
 * their own palette (presets + their own colors via the native color picker).
 * The accent flows through the timer ring, session dots, and the active-task
 * indicator via the global --accent variable.
 */
import { Check, Moon, Plus, Sun, X } from 'lucide-react'
import { useStore, type TimerStyle } from '../state/store'
import { useUI } from '../state/ui'
import { TimerRing } from './TimerRing'

const STYLES: { key: TimerStyle; label: string }[] = [
  { key: 'ring', label: 'Ring' },
  { key: 'squiggle', label: 'Squiggle' },
  { key: 'segments', label: 'Segments' },
  { key: 'dot', label: 'Dot' },
]

const PRESETS = [
  '#e0617a', // rose
  '#f0883e', // amber
  '#e6b800', // gold
  '#3fae6b', // green
  '#2bb3a3', // teal
  '#4f7df0', // blue
  '#8b6fe0', // violet
  '#c061c9', // magenta
]

export function CustomizePanel() {
  const close = useUI((s) => s.closeCustomize)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const timerStyle = useStore((s) => s.timerStyle)
  const setTimerStyle = useStore((s) => s.setTimerStyle)
  const accent = useStore((s) => s.accent)
  const setAccent = useStore((s) => s.setAccent)
  const customSwatches = useStore((s) => s.customSwatches)
  const addSwatch = useStore((s) => s.addSwatch)
  const removeSwatch = useStore((s) => s.removeSwatch)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      <div className="glass animate-fade-in relative m-3 w-full max-w-md rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[18px] font-medium tracking-tight text-content">Customize</h2>
          <button
            onClick={close}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full text-tertiary transition-colors duration-200 hover:bg-fill hover:text-content"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Theme */}
        <Section title="Theme">
          <div className="grid grid-cols-2 gap-3">
            <ThemeOption
              label="Dark"
              active={theme === 'dark'}
              onClick={() => setTheme('dark')}
              icon={<Moon className="h-4 w-4" strokeWidth={1.5} />}
            />
            <ThemeOption
              label="Light"
              active={theme === 'light'}
              onClick={() => setTheme('light')}
              icon={<Sun className="h-4 w-4" strokeWidth={1.5} />}
            />
          </div>
        </Section>

        {/* Timer style */}
        <Section title="Timer style">
          <div className="grid grid-cols-4 gap-3">
            {STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => setTimerStyle(s.key)}
                aria-pressed={timerStyle === s.key}
                className={`flex flex-col items-center gap-2 rounded-[var(--radius-lg)] p-2 transition-all duration-200 active:scale-95 ${
                  timerStyle === s.key ? 'bg-fill ring-1 ring-hairline-strong' : 'hover:bg-fill'
                }`}
              >
                <span className="relative h-12 w-12">
                  <TimerRing fraction={0.66} style={s.key} />
                </span>
                <span
                  className={`text-[11px] ${timerStyle === s.key ? 'text-content' : 'text-tertiary'}`}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* Color theme */}
        <Section title="Color theme">
          {/* Live preview of the whole-app tint for the current selection */}
          <ThemePreview accent={accent} />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Monochrome (default) */}
            <Swatch
              selected={accent === null}
              onClick={() => setAccent(null)}
              title="Monochrome"
              style={{ background: 'linear-gradient(135deg, var(--ink) 50%, var(--bg) 50%)' }}
            />

            {PRESETS.map((c) => (
              <Swatch
                key={c}
                selected={accent === c}
                onClick={() => setAccent(c)}
                title={c}
                style={{ backgroundColor: c }}
              />
            ))}

            {customSwatches.map((c) => (
              <div key={c} className="group relative">
                <Swatch
                  selected={accent === c}
                  onClick={() => setAccent(c)}
                  title={c}
                  style={{ backgroundColor: c }}
                />
                <button
                  onClick={() => removeSwatch(c)}
                  aria-label={`Remove ${c}`}
                  className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-elevated text-tertiary opacity-0 shadow-[var(--shadow)] transition-opacity duration-150 hover:text-content group-hover:opacity-100"
                >
                  <X className="h-2.5 w-2.5" strokeWidth={2} />
                </button>
              </div>
            ))}

            {/* Add a custom color via the native picker */}
            <label
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-dashed border-hairline-strong text-tertiary transition-colors duration-200 hover:bg-fill hover:text-content"
              title="Add a custom color"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              <input
                type="color"
                className="sr-only"
                onChange={(e) => addSwatch(e.target.value)}
                aria-label="Add a custom accent color"
              />
            </label>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-tertiary">
            Your color tints the entire app - background, text, and controls - not
            just the ring. Tap{' '}
            <span className="inline-flex h-4 w-4 -translate-y-px items-center justify-center rounded-full border border-dashed border-hairline-strong align-middle">
              <Plus className="h-2.5 w-2.5" strokeWidth={2} />
            </span>{' '}
            to add your own, or pick Monochrome for the original black-and-white look.
          </p>
        </Section>
      </div>
    </div>
  )
}

/* A miniature of the app rendered with the live semantic tokens, so it shows
   exactly how the current color tints the background, text, and controls. */
function ThemePreview({ accent }: { accent: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-hairline bg-bg p-3">
      {/* Mini timer ring + play */}
      <div className="relative grid h-12 w-12 shrink-0 place-items-center">
        <span
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: 'var(--fill-strong)' }}
        />
        <span
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'var(--accent)', transform: 'rotate(45deg)' }}
        />
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink">
          <span
            className="ml-0.5 h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent"
            style={{ borderLeftColor: 'var(--ink-contrast)' }}
          />
        </span>
      </div>

      {/* Mini text + chips */}
      <div className="min-w-0 flex-1">
        <div className="h-2.5 w-20 rounded-full bg-content" />
        <div className="mt-1.5 h-2 w-28 rounded-full bg-secondary opacity-70" />
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
          <span className="h-1.5 w-1.5 rounded-full bg-fill-strong" />
        </div>
      </div>

      <span className="shrink-0 text-[11px] tabular-nums text-tertiary">
        {accent ? accent.toUpperCase() : 'Mono'}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7 last:mb-0">
      <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-tertiary">
        {title}
      </h3>
      {children}
    </div>
  )
}

function ThemeOption({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 rounded-[var(--radius-lg)] py-3 text-[14px] transition-all duration-200 active:scale-[0.98] ${
        active
          ? 'bg-fill text-content ring-1 ring-hairline-strong'
          : 'border border-hairline text-secondary hover:bg-fill hover:text-content'
      }`}
    >
      {icon}
      {label}
      {active && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
    </button>
  )
}

function Swatch({
  selected,
  onClick,
  title,
  style,
}: {
  selected: boolean
  onClick: () => void
  title: string
  style: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={selected}
      className={`relative grid h-8 w-8 place-items-center rounded-full border border-hairline transition-transform duration-200 hover:scale-110 active:scale-95 ${
        selected ? 'ring-2 ring-content ring-offset-2 ring-offset-elevated' : ''
      }`}
      style={style}
    >
      {selected && (
        <Check className="h-4 w-4 text-white mix-blend-difference" strokeWidth={2.5} />
      )}
    </button>
  )
}
