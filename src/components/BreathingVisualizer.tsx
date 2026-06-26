/*
 * The signature animated element: a slowly breathing, monochrome circle that
 * pulses with playback. When audio is live it scales with the real output
 * amplitude (via the engine's AnalyserNode); when paused it rests still.
 * Rendered on a canvas in pure grayscale — concentric rings, no color.
 */
import { useEffect, useRef } from 'react'
import { engine } from '../audio/engine'
import { useStore } from '../state/store'

export function BreathingVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isPlaying = useStore((s) => s.isPlaying)
  const playingRef = useRef(isPlaying)
  playingRef.current = isPlaying

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let smooth = 0 // smoothed amplitude
    let phase = 0 // idle breathing phase

    // Handle device pixel ratio for crisp rendering.
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const data = new Uint8Array(1024)

    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const size = Math.min(w, h)
      const cx = w / 2
      const cy = h / 2
      ctx.clearRect(0, 0, w, h)

      // Read live amplitude when playing; otherwise gently breathe.
      let amp = 0
      const analyser = engine.getAnalyser()
      if (playingRef.current && analyser) {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        amp = Math.min(1, Math.sqrt(sum / data.length) * 3.2)
      }
      smooth += (amp - smooth) * 0.08
      phase += playingRef.current ? 0.012 : 0.008

      // Resolve the current ink tone from CSS so it tracks the theme.
      const ink = getComputedStyle(document.documentElement)
        .getPropertyValue('--ink')
        .trim()

      const breath = (Math.sin(phase) + 1) / 2 // 0–1 idle breathing
      const base = size * 0.22
      const energy = base * (0.06 * breath + smooth * 0.55)

      // Concentric rings — faint outer halo to crisp inner disc.
      const rings = 4
      for (let i = rings; i >= 1; i--) {
        const t = i / rings
        const r = base + energy * (1 + (1 - t) * 1.6)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = withAlpha(ink, 0.05 * t + smooth * 0.06 * t)
        ctx.fill()
      }

      // Solid inner disc.
      ctx.beginPath()
      ctx.arc(cx, cy, base * 0.62, 0, Math.PI * 2)
      ctx.fillStyle = withAlpha(ink, playingRef.current ? 0.16 + smooth * 0.25 : 0.1)
      ctx.fill()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  )
}

/** Apply an alpha to a CSS color (handles #hex and rgb()). */
function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha))
  if (color.startsWith('#')) {
    let hex = color.slice(1)
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  return color
}
