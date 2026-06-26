/*
 * Procedural noise generator — runs on the audio rendering thread.
 *
 * Generates white, pink, and brown noise in real time. No audio files, no
 * licensing, fully offline. Loaded via `audioWorklet.addModule('/noise-processor.js')`.
 *
 *  - white: uniform random samples
 *  - pink : Paul Kellet's economical refined filter (~ -3dB/octave)
 *  - brown: leaky integrator over white noise (~ -6dB/octave)
 *
 * The `type` is set once at construction via processorOptions; gain/shaping
 * is handled downstream in the main-thread audio graph (see engine.ts).
 */
class NoiseProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.type = (options && options.processorOptions && options.processorOptions.type) || 'white'

    // Pink-noise filter state (7-pole running sums).
    this.b0 = 0
    this.b1 = 0
    this.b2 = 0
    this.b3 = 0
    this.b4 = 0
    this.b5 = 0
    this.b6 = 0

    // Brown-noise integrator state.
    this.last = 0
  }

  process(_inputs, outputs) {
    const output = outputs[0]
    for (let channel = 0; channel < output.length; channel++) {
      const buffer = output[channel]
      for (let i = 0; i < buffer.length; i++) {
        const white = Math.random() * 2 - 1

        if (this.type === 'white') {
          buffer[i] = white * 0.6
        } else if (this.type === 'pink') {
          // Paul Kellet's refined pink-noise filter.
          this.b0 = 0.99886 * this.b0 + white * 0.0555179
          this.b1 = 0.99332 * this.b1 + white * 0.0750759
          this.b2 = 0.969 * this.b2 + white * 0.153852
          this.b3 = 0.8665 * this.b3 + white * 0.3104856
          this.b4 = 0.55 * this.b4 + white * 0.5329522
          this.b5 = -0.7616 * this.b5 - white * 0.016898
          const pink =
            this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362
          this.b6 = white * 0.115926
          buffer[i] = pink * 0.11
        } else {
          // Brown noise — integrate white noise, with leak to avoid DC drift.
          this.last = (this.last + 0.02 * white) / 1.02
          buffer[i] = this.last * 3.5
        }
      }
    }
    return true // keep the processor alive
  }
}

registerProcessor('noise-processor', NoiseProcessor)
