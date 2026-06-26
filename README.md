# Cadence

A focus-first study app. A Pomodoro timer at its heart, an integrated to-do
list, and ambient soundscapes underneath — calm, precise, and strictly
monochrome (black/white/gray only, no color accents ever).

- **Pomodoro timer (the centerpiece)** — a large, centered hero timer with a
  grayscale circular progress ring, big tight-tracked numerals, smooth
  start/pause/reset, and a distraction-free fullscreen focus mode. A faint ring
  "breathes" while it runs — the one signature animated element.
- **Tasks, integrated with the timer** — add, inline-edit, complete, delete, and
  **drag to reorder**. Select a task to make it *active*: the timer runs against
  it, its name shows under the clock, and every completed focus interval adds a
  session dot to it. Completed tasks de-emphasize (strikethrough) rather than
  vanish.
- **Soundscapes (secondary)** — procedural white/pink/brown noise and rain/wind
  generated live with the Web Audio API (offline, no files, no licensing); layer
  sounds with per-track volume.
- **Accounts & cross-device sync** *(optional)* — passwordless magic-link sign-in
  via Supabase. Tasks and completed focus sessions sync to your account and work
  on any device. Signed out, everything is kept in `localStorage` and synced up
  the next time you sign in.
- **History** — a monochrome view of past sessions with a contribution-style
  activity heatmap, a 14-day focus bar chart, day groups, and delete controls.
- **Local-first** — preferences, tasks, mix, and history persist locally; the
  core app needs no backend. Supabase only adds optional accounts + sync.

## Tech

React + Vite + TypeScript, Web Audio API, Tailwind CSS, Zustand, Supabase (auth +
Postgres), and Framer Motion. Icons from Lucide.

**Why Framer Motion?** One small, focused dependency powers the springy task
reorder (its accessible `Reorder` primitive — handle-gated drag, no heavyweight
drag-and-drop library) plus the animated add/remove of list items. Everything
else (timer ring, hovers, presses, theme transition, the breathing element) is
hand-built CSS — no other UI/animation libraries.

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
`pomodoro_sessions` and `tasks` tables, enables RLS on both, and adds policies so
each user can only read/insert/update/delete **their own** rows
(`user_id = auth.uid()`). (The file is safe to re-run.)

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
  `pomodoro_sessions` (or to `localStorage` if signed out), and the active task's
  session count is incremented.
- **Tasks**: created/edited/reordered tasks save to the `tasks` table when signed
  in, or `localStorage` when signed out.
- **Sync on login**: any sessions and tasks saved while signed out are pushed to
  your account the first time you sign in, then cleared locally. (Tasks sync on
  the first load after sign-in; sessions sync on the sign-in event.)
- **History view**: the **clock icon** in the header opens it — aggregate stats,
  a monochrome activity heatmap (contribution-graph style) and a 14-day focus
  bar chart, sessions grouped by day, delete a single session (inline confirm)
  or clear all. Deletes hit Supabase directly; RLS guarantees only your rows are
  affected.
- **Sign out**: the account avatar (top right) → **Sign out**.

## Sounds

The soundscape layer is fully procedural — there are no audio files, uploads, or
external streams. Five generators (white / pink / brown noise, rain, wind) are
synthesized live with the Web Audio API, so they always work offline and are
license-free. Toggle any of them under **Sounds** and balance them in the
**Mix**. To add or tweak generators, edit `src/audio/catalog.ts` (and, for new
synthesis, `public/noise-processor.js` / `src/audio/engine.ts`).

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
- Everything mixes into a master gain → output. Each sound has its own gain node
  (its volume slider). See `src/audio/engine.ts`. The timer's breathing ring is a
  pure-CSS animation tied to the running state, not the audio signal.

## Project structure

```
public/noise-processor.js   Procedural noise AudioWorklet
supabase/schema.sql         pomodoro_sessions + tasks tables, RLS (run in Supabase)
src/
  index.css                 Design system: monochrome tokens, typography, texture
  audio/
    catalog.ts              The sound library (procedural generators)
    engine.ts               Web Audio graph manager
  lib/
    supabase.ts             Supabase client (from VITE_ env vars; null if unset)
    user.ts                 Shared current-user id (no import cycles)
    history.ts              Session recording: Supabase or localStorage + sync
    tasks.ts                Task persistence: Supabase or localStorage + sync
    time.ts                 Clock / duration / day-grouping helpers
  state/
    store.ts                Player + timer + tasks state (Zustand) + persist
    auth.ts                 Magic-link auth state
    ui.ts                   Auth/history overlay open-state
  hooks/useKeyboard.ts      Keyboard shortcuts
  components/
    TimerHero.tsx           The centerpiece Pomodoro timer + progress ring
    TaskList.tsx            Drag-reorderable to-do list, wired to the timer
    FocusMode.tsx           Fullscreen distraction-free timer
    ...                     ControlBar, SoundLibrary, Mixer, History*, auth, header
  App.tsx                   Layout (timer → tasks → soundscape)
```
