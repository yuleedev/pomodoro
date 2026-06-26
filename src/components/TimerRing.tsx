/*
 * The timer's progress indicator, in several styles. Every style visualizes the
 * SAME thing - the fraction of time remaining - and uses the accent color
 * (which defaults to the monochrome ink tone via --accent).
 *
 *  • ring      - a smooth circular border that depletes
 *  • squiggle  - a wavy circular border that depletes
 *  • segments  - a ring of tick marks; remaining ticks are accented
 *  • dot       - a marker orbiting a faint track
 *
 * SVG `pathLength={1}` normalizes any path to length 1, so progress is just
 * strokeDashoffset = 1 − fraction regardless of the shape's real length.
 */
import { useMemo } from 'react'
import type { TimerStyle } from '../state/store'

const R = 46
const TRACK = 'var(--fill-strong)'
const ACCENT = 'var(--accent)'

export function TimerRing({
  fraction,
  style,
}: {
  fraction: number
  style: TimerStyle
}) {
  const f = Math.max(0, Math.min(1, fraction))

  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {style === 'ring' && <RingStyle f={f} />}
        {style === 'squiggle' && <SquiggleStyle f={f} />}
        {style === 'segments' && <SegmentsStyle f={f} />}
        {style === 'dot' && <DotStyle f={f} />}
      </svg>
    </div>
  )
}

function RingStyle({ f }: { f: number }) {
  return (
    <g transform="rotate(-90 50 50)">
      <circle cx="50" cy="50" r={R} fill="none" stroke={TRACK} strokeWidth="2" />
      <circle
        cx="50"
        cy="50"
        r={R}
        fill="none"
        stroke={ACCENT}
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - f}
        style={{ transition: 'stroke-dashoffset 0.6s linear' }}
      />
    </g>
  )
}

function SquiggleStyle({ f }: { f: number }) {
  const d = useMemo(() => squigglePath(R - 3, 14, 2.6), [])
  return (
    <g transform="rotate(-90 50 50)">
      <path d={d} fill="none" stroke={TRACK} strokeWidth="1.6" pathLength={1} />
      <path
        d={d}
        fill="none"
        stroke={ACCENT}
        strokeWidth="2.2"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - f}
        style={{ transition: 'stroke-dashoffset 0.6s linear' }}
      />
    </g>
  )
}

function SegmentsStyle({ f }: { f: number }) {
  const N = 56
  const lit = Math.round(f * N)
  const inner = 40
  const outer = R
  return (
    <g>
      {Array.from({ length: N }).map((_, i) => {
        const a = (-90 + (i * 360) / N) * (Math.PI / 180)
        const cos = Math.cos(a)
        const sin = Math.sin(a)
        return (
          <line
            key={i}
            x1={50 + inner * cos}
            y1={50 + inner * sin}
            x2={50 + outer * cos}
            y2={50 + outer * sin}
            stroke={i < lit ? ACCENT : TRACK}
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transition: 'stroke 0.3s linear' }}
          />
        )
      })}
    </g>
  )
}

function DotStyle({ f }: { f: number }) {
  // The dot marks the consumed boundary: top at full, a complete loop at zero.
  const a = (-90 + 360 * (1 - f)) * (Math.PI / 180)
  const x = 50 + R * Math.cos(a)
  const y = 50 + R * Math.sin(a)
  return (
    <g>
      <circle cx="50" cy="50" r={R} fill="none" stroke={TRACK} strokeWidth="1.5" />
      <circle
        cx={x}
        cy={y}
        r="3"
        fill={ACCENT}
        style={{ transition: 'cx 0.6s linear, cy 0.6s linear' }}
      />
    </g>
  )
}

/** A closed squiggly circle: radius modulated by a sine wave. */
function squigglePath(baseR: number, waves: number, amp: number): string {
  const pts: string[] = []
  const steps = 240
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const r = baseR + amp * Math.sin(waves * t)
    const x = 50 + r * Math.cos(t)
    const y = 50 + r * Math.sin(t)
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return pts.join(' ') + ' Z'
}
