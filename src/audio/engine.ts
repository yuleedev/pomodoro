/*
 * AudioEngine — owns the single AudioContext and the live node graph.
 *
 * Topology:           [layer source]→[layer gain]┐
 *                     [layer source]→[layer gain]┼→ master gain → analyser → output
 *                     [layer source]→[layer gain]┘
 *
 * Each active sound is a "layer" with its own gain (its volume slider). The
 * store calls these imperative methods; the engine knows nothing about React.
 */
import type { Sound } from './catalog'

interface Layer {
  /** Nodes to disconnect/stop when the layer is removed. */
  nodes: AudioNode[]
  gain: GainNode
  /** Media element to pause/cleanup, for stream/file layers. */
  media?: HTMLAudioElement
}

const RAMP = 0.08 // seconds — short, smooth volume ramps avoid clicks

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private workletReady: Promise<void> | null = null
  private layers = new Map<string, Layer>()

  /** Lazily create the context (must follow a user gesture per autoplay rules). */
  private async ensure(): Promise<AudioContext> {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 1024
      this.analyser.smoothingTimeConstant = 0.85
      this.master.connect(this.analyser)
      this.analyser.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    return this.ctx
  }

  private async loadWorklet(ctx: AudioContext): Promise<void> {
    if (!this.workletReady) {
      this.workletReady = ctx.audioWorklet.addModule('/noise-processor.js')
    }
    return this.workletReady
  }

  /** Expose the analyser so the visualizer can read live amplitude. */
  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  setMasterVolume(v: number) {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(clamp01(v), this.ctx.currentTime, RAMP)
    }
  }

  setLayerVolume(id: string, v: number) {
    const layer = this.layers.get(id)
    if (layer && this.ctx) {
      layer.gain.gain.setTargetAtTime(clamp01(v), this.ctx.currentTime, RAMP)
    }
  }

  isActive(id: string): boolean {
    return this.layers.has(id)
  }

  /** Add a sound to the mix at the given volume. Idempotent per id. */
  async start(sound: Sound, volume: number): Promise<void> {
    if (this.layers.has(sound.id)) return
    const ctx = await this.ensure()
    const gain = ctx.createGain()
    gain.gain.value = 0 // fade in from silence
    gain.connect(this.master!)

    const layer: Layer = { nodes: [gain], gain }

    if (sound.kind === 'noise') {
      await this.loadWorklet(ctx)
      const node = new AudioWorkletNode(ctx, 'noise-processor', {
        processorOptions: { type: sound.noiseType },
      })
      node.connect(gain)
      layer.nodes.push(node)
    } else if (sound.kind === 'ambient') {
      this.buildAmbient(ctx, sound, gain, layer)
    } else {
      // stream or file — play an HTMLAudioElement through the graph.
      const el = new Audio(sound.src)
      el.loop = true
      el.crossOrigin = 'anonymous'
      el.preload = 'auto'
      const srcNode = ctx.createMediaElementSource(el)
      srcNode.connect(gain)
      layer.nodes.push(srcNode)
      layer.media = el
      el.play().catch(() => {
        /* Autoplay/CORS issues surface as a flat layer; ignore quietly. */
      })
    }

    this.layers.set(sound.id, layer)
    gain.gain.setTargetAtTime(clamp01(volume), ctx.currentTime, RAMP)
  }

  /** Build a procedural ambient layer (filtered, modulated noise). */
  private buildAmbient(ctx: AudioContext, sound: Sound, gain: GainNode, layer: Layer) {
    // Ambient sounds also use the noise worklet, then shape with biquads.
    const startNoise = async (type: 'white' | 'brown') => {
      await this.loadWorklet(ctx)
      const node = new AudioWorkletNode(ctx, 'noise-processor', {
        processorOptions: { type },
      })
      return node
    }

    if (sound.ambientType === 'rain') {
      startNoise('white').then((noise) => {
        if (!this.layers.has(sound.id) && !this.starting(sound.id, layer)) return
        const hp = ctx.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.value = 600
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 5200
        noise.connect(hp)
        hp.connect(lp)
        lp.connect(gain)
        layer.nodes.push(noise, hp, lp)
        // Subtle shower swells via a slow LFO on a trim gain.
        const trim = this.attachSwell(ctx, lp, gain, 0.07, 0.12, layer)
        layer.nodes.push(trim)
      })
    } else {
      // wind
      startNoise('brown').then((noise) => {
        if (!this.layers.has(sound.id) && !this.starting(sound.id, layer)) return
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 900
        noise.connect(lp)
        lp.connect(gain)
        layer.nodes.push(noise, lp)
        // Slowly sweep the cutoff so the wind "breathes".
        const lfo = ctx.createOscillator()
        const lfoGain = ctx.createGain()
        lfo.frequency.value = 0.06
        lfoGain.gain.value = 400
        lfo.connect(lfoGain)
        lfoGain.connect(lp.frequency)
        lfo.start()
        layer.nodes.push(lfo, lfoGain)
      })
    }
  }

  /** Insert a slow amplitude swell between `from` and `to`. Returns the trim gain. */
  private attachSwell(
    ctx: AudioContext,
    _from: AudioNode,
    _to: GainNode,
    rate: number,
    depth: number,
    layer: Layer,
  ): GainNode {
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = rate
    lfoGain.gain.value = depth
    lfo.connect(lfoGain)
    lfoGain.connect(layer.gain.gain)
    lfo.start()
    layer.nodes.push(lfo, lfoGain)
    return lfoGain
  }

  /** Guard for async ambient builders: confirm the layer is still wanted. */
  private starting(id: string, layer: Layer): boolean {
    return this.layers.get(id) === layer
  }

  /** Remove a sound from the mix with a short fade-out. */
  stop(id: string) {
    const layer = this.layers.get(id)
    if (!layer || !this.ctx) return
    this.layers.delete(id)
    const now = this.ctx.currentTime
    layer.gain.gain.setTargetAtTime(0, now, RAMP)
    // Tear down after the fade completes.
    window.setTimeout(() => {
      layer.media?.pause()
      if (layer.media) layer.media.src = ''
      for (const node of layer.nodes) {
        try {
          ;(node as OscillatorNode).stop?.()
        } catch {
          /* not all nodes are stoppable */
        }
        try {
          node.disconnect()
        } catch {
          /* already disconnected */
        }
      }
    }, 400)
  }

  /** Pause all output (master suspend) without losing the mix. */
  async suspend() {
    if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend()
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume()
  }

  /** A soft two-note cue for focus-session phase changes. */
  async chime(rising = true) {
    const ctx = await this.ensure()
    const out = this.master ?? ctx.destination
    const notes = rising ? [523.25, 783.99] : [783.99, 523.25] // C5 → G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.18
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.18, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      osc.connect(g)
      g.connect(out)
      osc.start(t)
      osc.stop(t + 0.55)
    })
  }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Single shared engine instance for the app. */
export const engine = new AudioEngine()
