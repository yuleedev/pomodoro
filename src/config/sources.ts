/*
 * ─────────────────────────────────────────────────────────────────────────
 *  ADD YOUR OWN ROYALTY-FREE STREAMS HERE
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  Jazz and lofi require real, licensed audio, so this player ships with NO
 *  copyrighted tracks. There are two ways to bring sound to those categories:
 *
 *   1. Drop a `streamUrl` into the array below pointing at a legally-sourced,
 *      royalty-free audio stream you have the right to use. Good sources:
 *        • https://freemusicarchive.org   (check each track's license)
 *        • https://incompetech.com        (Kevin MacLeod, CC-BY)
 *        • Your own self-hosted files / a service you have rights to.
 *      The stream must allow cross-origin playback (CORS) to feed the Web
 *      Audio graph; otherwise it still plays but the visualizer stays flat.
 *
 *   2. Or skip this file entirely and use the in-app "Add your audio" button
 *      to play files from your own device. Nothing is uploaded — it stays local.
 *
 *  The placeholder entries below are DISABLED (streamUrl is empty). Fill in a
 *  URL to enable one; it will appear automatically in the sound library.
 */

export interface StreamSource {
  /** Stable id used for persistence and the audio graph. */
  id: string
  /** Display name in the library. */
  name: string
  /** Category — drives where it appears in the UI. */
  genre: 'lofi' | 'jazz' | 'ambient'
  /** A CORS-enabled, royalty-free audio URL. Empty = placeholder/disabled. */
  streamUrl: string
}

export const STREAM_SOURCES: StreamSource[] = [
  {
    id: 'lofi-stream-1',
    name: 'Lofi — your stream',
    genre: 'lofi',
    streamUrl: '', // ← paste a royalty-free lofi stream URL to enable
  },
  {
    id: 'jazz-stream-1',
    name: 'Jazz — your stream',
    genre: 'jazz',
    streamUrl: '', // ← paste a royalty-free jazz stream URL to enable
  },
  {
    id: 'ambient-stream-1',
    name: 'Ambient — your stream',
    genre: 'ambient',
    streamUrl: '', // ← paste a royalty-free ambient stream URL to enable
  },
]

/** Only sources with a real URL are surfaced in the UI. */
export const enabledStreamSources = (): StreamSource[] =>
  STREAM_SOURCES.filter((s) => s.streamUrl.trim().length > 0)
