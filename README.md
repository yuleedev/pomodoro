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
- **Accounts & cross-device history** *(optional)* — passwordless magic-link
  sign-in via Supabase. Completed sessions are recorded to your account and show
  up in a clean history view on any device. Signed out, history is kept locally
  and synced up the next time you sign in.
- **Local-first** — your last mix, volumes, timer settings, and theme persist in
  `localStorage`. The core player needs no backend at all; Supabase only adds the
  optional accounts + synced history.

## Tech

React + Vite + TypeScript, Web Audio API, Tailwind CSS, Zustand, Supabase (auth +
Postgres). Icons from Lucide. Dependency-light; the audio player is entirely
client-side.

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
Pages, Cloudflare Pages, …). The core player needs no environment variables and
no server. To enable accounts + synced history, set the two Supabase env vars
below.

## Accounts & cross-device history (Supabase)

This is optional. Without it, the app runs fully and Pomodoro history is saved in
the browser's `localStorage`. Add Supabase to get passwordless sign-in and
history that follows the user across devices.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a name,
   a database password (you won't need it for this app), and a region.
2. Wait for it to finish provisioning.

### 2. Create the table + Row-Level Security

Open **SQL Editor → New query**, paste the contents of
[`supabase/schema.sql`](./supabase/schema.sql), and **Run**. This creates the
`pomodoro_sessions` table, enables RLS, and adds policies so each user can only
read/insert/update/delete **their own** rows. (The file is safe to re-run.)

> ⚠️ RLS is what makes the public anon key safe in the browser. Don't skip it —
> with RLS off, the anon key could read everyone's data.

### 3. Get your URL + anon key

In **Project Settings → API**, copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

Create a `.env` file (copy `.env.example`) and fill them in:

```bash
cp .env.example .env
# then edit .env:
# VITE_SUPABASE_URL=https://your-ref.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Restart `npm run dev` after editing `.env`. The `VITE_` prefix is required for
Vite to expose them to the client; only ever put the **anon** key here, never the
service-role key.

### 4. Configure the magic-link redirect URLs

The sign-in email links back into the app, so Supabase must allow your app's URL.
In **Authentication → URL Configuration**:

- **Site URL**: your production URL (e.g. `https://yourapp.com`), or
  `http://localhost:5173` while developing.
- **Redirect URLs**: add every origin you'll sign in from, e.g.
  `http://localhost:5173` and `https://yourapp.com`.

The app requests a redirect back to `window.location.origin`, so the origin the
user signs in from must appear in this list.

Email delivery works out of the box with Supabase's built-in mailer for testing.
For production volume, configure your own SMTP under **Authentication → Emails**.

### How auth & history behave

- **Sign in**: header → **Sign in** → enter email → open the magic link → you're
  back in the app, authenticated. The session persists, so you stay signed in
  across visits and devices.
- **Recording**: when a focus or break interval completes, a row is written to
  `pomodoro_sessions` (or to `localStorage` if signed out).
- **Sync on login**: any sessions saved while signed out are pushed to your
  account the first time you sign in, then cleared locally.
- **History view**: the **clock icon** in the header opens it — aggregate stats,
  sessions grouped by day, delete a single session (inline confirm) or clear all.
  Deletes hit Supabase directly; RLS guarantees only your rows are affected.
- **Sign out**: the account avatar (top right) → **Sign out**.

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
supabase/schema.sql         Table + Row-Level Security policies (run in Supabase)
src/
  index.css                 Design system: monochrome tokens, typography, base
  audio/
    catalog.ts              The sound library (procedural + configured streams)
    engine.ts               Web Audio graph manager
  config/sources.ts         ← add royalty-free jazz/lofi/ambient streams here
  lib/
    supabase.ts             Supabase client (from VITE_ env vars; null if unset)
    history.ts              Session recording: Supabase or localStorage + sync
    time.ts                 Clock / duration / day-grouping helpers
  state/
    store.ts                Player + timer state (Zustand) + localStorage persist
    auth.ts                 Magic-link auth state
    ui.ts                   Auth/history overlay open-state
  hooks/useKeyboard.ts      Keyboard shortcuts
  components/               UI (visualizer, controls, library, mixer, focus mode,
                            auth panel, account menu, history view)
  App.tsx                   Layout
```
