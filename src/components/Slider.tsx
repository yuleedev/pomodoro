/* Thin, minimal, grayscale slider. The filled portion is rendered with a
   gradient on the track so the "level" reads without any color. */
interface SliderProps {
  value: number // 0–1
  onChange: (v: number) => void
  ariaLabel: string
}

export function Slider({ value, onChange, ariaLabel }: SliderProps) {
  const pct = Math.round(value * 100)
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={pct}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="slider"
      style={{
        // Fill the track up to the thumb using the ink tone, rest is the idle fill.
        background: `linear-gradient(to right, var(--ink) 0%, var(--ink) ${pct}%, var(--fill-strong) ${pct}%, var(--fill-strong) 100%)`,
      }}
    />
  )
}
