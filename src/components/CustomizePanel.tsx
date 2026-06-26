/*
 * Customization panel - theme (black/white), timer style, and accent color.
 *
 * The app is monochrome by default; here the user can pick an accent or build
 * their own palette (presets + their own colors via the native color picker).
 * The accent flows through the timer ring, session dots, and the active-task
 * indicator via the global --accent variable.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Moon, Sun, X } from 'lucide-react'
import { useStore, type TimerStyle } from '../state/store'
import { useUI } from '../state/ui'
import { popSpring, spring, tapScale } from '../lib/motion'
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
  const clearSwatches = useStore((s) => s.clearSwatches)

  // The hex shown in the picker. Moving the spectrum live-previews the accent
  // but does NOT save it; the color joins the palette only when you press Enter.
  const [hex, setHex] = useState(accent ?? '#4f7df0')

  const commitHex = () => {
    const v = hex.trim().toLowerCase()
    if (/^#[0-9a-f]{6}$/.test(v)) addSwatch(v) // addSwatch sets the accent + saves it
  }

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
        className="relative m-3 w-full max-w-md rounded-[var(--radius-2xl)] border border-hairline bg-elevated p-6 shadow-[var(--shadow)]"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[20px] font-medium tracking-tight text-content">Customize</h2>
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
              <motion.button
                key={s.key}
                onClick={() => setTimerStyle(s.key)}
                aria-pressed={timerStyle === s.key}
                whileTap={tapScale}
                transition={spring}
                className="relative flex flex-col items-center gap-2 rounded-[var(--radius-lg)] p-2 hover:bg-fill"
              >
                {/* Sliding selection highlight that springs between styles. */}
                {timerStyle === s.key && (
                  <motion.span
                    layoutId="styleSel"
                    transition={spring}
                    className="absolute inset-0 rounded-[var(--radius-lg)] bg-fill ring-1 ring-hairline-strong"
                  />
                )}
                <span className="relative z-10 h-12 w-12">
                  <TimerRing fraction={0.66} style={s.key} />
                </span>
                <span
                  className={`relative z-10 text-[12px] ${
                    timerStyle === s.key ? 'text-content' : 'text-tertiary'
                  }`}
                >
                  {s.label}
                </span>
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Color theme */}
        <Section title="Color theme">
          {/* Live preview of the whole-app tint for the current selection. */}
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

            {customSwatches.length > 0 && (
              <button
                onClick={clearSwatches}
                className="ml-1 text-[12px] text-tertiary underline-offset-4 transition-colors hover:text-content hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Custom color: drag the spectrum to preview, press Enter to save it. */}
          <div className="mt-4 flex items-center gap-2">
            <label
              className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-hairline"
              title="Pick from the color spectrum"
              style={{ backgroundColor: hex }}
            >
              <input
                type="color"
                className="absolute inset-0 cursor-pointer opacity-0"
                value={hex}
                onChange={(e) => {
                  setHex(e.target.value)
                  setAccent(e.target.value) // live preview only - not saved yet
                }}
                aria-label="Pick a custom color from the spectrum"
              />
            </label>
            <input
              type="text"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitHex()
              }}
              spellCheck={false}
              placeholder="#rrggbb"
              aria-label="Hex color, press Enter to add to your palette"
              className="w-28 rounded-full border border-hairline bg-transparent px-3.5 py-1.5 text-[14px] tabular-nums text-content outline-none transition-colors focus:border-hairline-strong"
            />
            <span className="text-[12px] text-tertiary">Enter to save</span>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-tertiary">
            Your color tints the entire app - background, text, and controls - not
            just the ring. Drag the spectrum to try a color, then press Enter to add
            it to your palette. Pick Monochrome for the original black-and-white look.
          </p>
        </Section>
      </motion.div>
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

      <span className="shrink-0 text-[12px] tabular-nums text-tertiary">
        {accent ? accent.toUpperCase() : 'Mono'}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7 last:mb-0">
      <h3 className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-tertiary">
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
      className={`flex items-center justify-center gap-2 rounded-[var(--radius-lg)] py-3 text-[15px] transition-all duration-200 active:scale-[0.98] ${
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
    <motion.button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={selected}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.9 }}
      transition={popSpring}
      className={`relative grid h-8 w-8 place-items-center rounded-full border border-hairline ${
        selected ? 'ring-2 ring-content ring-offset-2 ring-offset-elevated' : ''
      }`}
      style={style}
    >
      {selected && (
        <Check className="h-4 w-4 text-white mix-blend-difference" strokeWidth={2.5} />
      )}
    </motion.button>
  )
}
