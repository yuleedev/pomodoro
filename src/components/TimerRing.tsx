/*
 * The timer's progress indicator, in several styles. Every style visualizes the
 * SAME thing - elapsed progress - and uses the accent color (which defaults to
 * the monochrome ink tone via --accent).
 *
 * Progress always sweeps CLOCKWISE FROM THE TOP (12 o'clock) as time runs out,
 * so the indicator reads consistently across every style:
 *
 *  • ring      - an arc that fills clockwise from the top
 *  • squiggle  - a wavy arc that fills clockwise from the top
 *  • segments  - tick marks that light up one by one, clockwise from the top
 *  • dot       - a marker that travels clockwise from the top
 *
 * SVG `pathLength={1}` normalizes any path to length 1, so progress is just
 * strokeDashoffset = 1 - p regardless of the shape's real length.
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
  /** Fraction of time REMAINING (1 = full, 0 = done). */
  fraction: number
  style: TimerStyle
}) {
  // Elapsed progress: what the indicator fills in, clockwise from the top.
  const p = 1 - Math.max(0, Math.min(1, fraction))

  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {style === 'ring' && <RingStyle p={p} />}
        {style === 'squiggle' && <SquiggleStyle p={p} />}
        {style === 'segments' && <SegmentsStyle p={p} />}
        {style === 'dot' && <DotStyle p={p} />}
      </svg>
    </div>
  )
}

function RingStyle({ p }: { p: number }) {
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
        strokeDashoffset={1 - p}
        style={{ transition: 'stroke-dashoffset 0.6s linear' }}
      />
    </g>
  )
}

function SquiggleStyle({ p }: { p: number }) {
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
        strokeDashoffset={1 - p}
        style={{ transition: 'stroke-dashoffset 0.6s linear' }}
      />
    </g>
  )
}

function SegmentsStyle({ p }: { p: number }) {
  const N = 56
  const lit = Math.round(p * N)
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

function DotStyle({ p }: { p: number }) {
  // The dot marks how far we've travelled: top at the start, a full loop at the end.
  const a = (-90 + 360 * p) * (Math.PI / 180)
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
