/*
 * AudioEngine - owns the single AudioContext and the live node graph.
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
}

const RAMP = 0.08 // seconds - short, smooth volume ramps avoid clicks

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private workletReady: Promise<void> | null = null
  private layers = new Map<string, Layer>()
  /** Decoded audio files, cached by src so each file is fetched once. */
  private buffers = new Map<string, Promise<AudioBuffer>>()

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
    } else if (sound.src) {
      // ambient - looping royalty-free audio file.
      this.buildFile(ctx, sound, gain, layer)
    }

    this.layers.set(sound.id, layer)
    gain.gain.setTargetAtTime(clamp01(volume), ctx.currentTime, RAMP)
  }

  /** Fetch and decode an audio file once; subsequent plays reuse the buffer. */
  private loadBuffer(ctx: AudioContext, src: string): Promise<AudioBuffer> {
    let pending = this.buffers.get(src)
    if (!pending) {
      pending = fetch(src)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
          return res.arrayBuffer()
        })
        .then((data) => ctx.decodeAudioData(data))
        .catch((err) => {
          this.buffers.delete(src) // allow a later retry
          throw err
        })
      this.buffers.set(src, pending)
    }
    return pending
  }

  /** Build an ambient layer from a looping audio file. */
  private buildFile(ctx: AudioContext, sound: Sound, gain: GainNode, layer: Layer) {
    this.loadBuffer(ctx, sound.src!)
      .then((buffer) => {
        if (!this.starting(sound.id, layer)) return // stopped before it loaded
        const node = ctx.createBufferSource()
        node.buffer = buffer
        node.loop = true
        node.connect(gain)
        node.start()
        layer.nodes.push(node)
      })
      .catch((err) => {
        console.warn(`Could not play "${sound.name}" (${sound.src}):`, err)
      })
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
