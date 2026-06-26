# Soundscape

A minimalist, local-first soundscape player for studying and focus. Calm,
precise, strictly monochrome — built to get out of your way.

- **Procedural noise** — white / pink / brown, generated in real time with the
  Web Audio API. No files, no licensing, always works offline.
- **Ambient layers** — procedural rain and wind, mixable with everything else.
- **Bring your own audio** — add lofi/jazz/anything from your device, or wire up
  royalty-free streams in one config file.
- **Mixer** — layer multiple sounds (e.g. *rain + brown noise*), each with its
  own volume.
- **Focus sessions** — a built-in Pomodoro-style timer with a distraction-free
  fullscreen mode.
- **Local-first** — your last mix, volumes, timer settings, and theme persist in
  `localStorage`. Nothing is uploaded; there is no backend.

## Tech

React + Vite + TypeScript, Web Audio API, Tailwind CSS, Zustand. Icons from
Lucide. Dependency-light and entirely client-side.

## Run it

Requires Node 18+.

```bash
npm install
npm run dev      # http://localhost:5173
```

Build and preview a production bundle:

```bash
npm run build
npm run preview
```

It's a static site — deploy `dist/` to any static host (Vercel, Netlify, GitHub
Pages, Cloudflare Pages, …). No environment variables, no server required.

## Adding your own sounds

There are two ways to bring lofi, jazz, or any other audio into the player.

### 1. From your device (no setup)

Open the app, scroll to **Sounds → Yours**, and click **Add your audio**. Pick
one or more audio files. They play locally and never leave your machine (they
are session-only and not persisted).

### 2. Royalty-free streams (shared config)

The app ships with **no copyrighted tracks**. To add a stream that anyone using
your build can play, edit **`src/config/sources.ts`** and fill in a `streamUrl`:

```ts
export const STREAM_SOURCES: StreamSource[] = [
  {
    id: 'lofi-stream-1',
    name: 'My Lofi Stream',
    genre: 'lofi',                       // 'lofi' | 'jazz' | 'ambient'
    streamUrl: 'https://example.com/your-royalty-free-stream.mp3',
  },
  // ...add as many as you like
]
```

- Entries with an empty `streamUrl` are placeholders and stay hidden.
- Any entry with a URL appears automatically in the sound library under its
  genre, ready to mix.
- Use only audio you have the right to use. Good sources for royalty-free music:
  - [Free Music Archive](https://freemusicarchive.org) (check each license)
  - [Incompetech](https://incompetech.com) (Kevin MacLeod, CC-BY)
  - Your own self-hosted files.
- For the live waveform to react to a stream, the host must allow cross-origin
  requests (CORS). Without CORS the audio still plays; the visualizer just stays
  calm.

## Keyboard shortcuts

| Key     | Action              |
| ------- | ------------------- |
| `Space` | Play / pause        |
| `F`     | Toggle focus mode   |
| `T`     | Toggle light / dark |
| `Esc`   | Exit focus mode     |

Shortcuts are ignored while you're typing in a field.

## How the audio works

- **Noise** (`public/noise-processor.js`) runs on an `AudioWorklet` on the audio
  thread. White noise is uniform random; pink uses Paul Kellet's refined filter
  (~−3 dB/octave); brown is a leaky integrator (~−6 dB/octave).
- **Ambient** sounds reuse that worklet, then shape it with `BiquadFilter`s and
  slow LFOs (rain = filtered white noise with gentle swells; wind = filtered
  brown noise with a drifting cutoff).
- **Files & streams** play through an `HTMLAudioElement` routed into the graph.
- Everything mixes into a master gain → analyser → output. Each sound has its
  own gain node (its volume slider); the analyser drives the breathing
  visualizer. See `src/audio/engine.ts`.

## Project structure

```
public/noise-processor.js   Procedural noise AudioWorklet
src/
  index.css                 Design system: monochrome tokens, typography, base
  audio/
    catalog.ts              The sound library (procedural + configured streams)
    engine.ts               Web Audio graph manager
  config/sources.ts         ← add royalty-free jazz/lofi/ambient streams here
  state/store.ts            App state (Zustand) + localStorage persistence
  hooks/useKeyboard.ts      Keyboard shortcuts
  components/               UI (visualizer, controls, library, mixer, focus mode)
  App.tsx                   Layout
```
