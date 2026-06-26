# Cadence

A focus-first study app. A Pomodoro timer at its heart, an integrated to-do
list, and ambient soundscapes underneath — calm, precise, and monochrome by
default, with an optional accent color you can set (or build your own palette).

- **Pomodoro timer (the centerpiece)** — a large, centered hero timer whose
  border shows time remaining, big tight-tracked numerals, smooth
  start/pause/reset, and a distraction-free fullscreen focus mode. A faint ring
  "breathes" while it runs — the signature animated element. Choose from four
  progress styles: **Ring, Squiggle, Segments, Dot**.
- **Customizable look** — a Customize menu (slider icon, top right) to switch
  theme (dark/light), pick the timer style, and set an accent color from presets
  or **your own palette** (native color picker). Defaults to monochrome.
- **Tasks, integrated with the timer** — add, inline-edit, complete, delete, and
  **drag to reorder**. Select a task to make it *active*: the timer runs against
  it, its name shows under the clock, and every completed focus interval adds a
  session dot to it. Completed tasks de-emphasize (strikethrough) rather than
  vanish.
- **Categories (optional)** — create categories (e.g. Math, Reading, Coding) and
  pick an active one under the timer to attribute completed focus sessions to it.
  History shows a per-category **hours breakdown**. Leave none selected to track
  nothing — it's entirely optional.
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

## Tech stack

A deliberately small, mostly client-side stack. The core app is a static
single-page React build with no server; everything below earns its place.

- **React 19 + TypeScript** form the UI layer, written as small function
  components with hooks. TypeScript runs in strict mode (`noUnusedLocals` /
  `noUnusedParameters` on), so dead code and loose types fail the build rather
  than ship.
- **Vite** is the dev server and bundler. It gives near-instant HMR in
  development and emits a static `dist/` for production, which is why the app
  deploys to any static host with zero backend.
- **Tailwind CSS v4** handles styling with its CSS-first config: the design
  system lives in `src/index.css` as CSS custom properties (the monochrome
  tokens, spacing, easing) mapped into Tailwind via `@theme`. The single
  `--accent` variable is what lets one color re-tint the entire palette at
  runtime.
- **Zustand** is the state store. One small hook-based store (`src/state/store.ts`)
  holds timer, tasks, mix, and appearance state, with its `persist` middleware
  writing durable preferences to `localStorage` so they survive reloads. A second
  tiny store (`ui.ts`) tracks which overlays are open.
- **Web Audio API** generates the soundscapes. Procedural white/pink/brown noise
  runs in an `AudioWorklet` off the main thread, then `BiquadFilter`s and slow
  LFOs shape it into rain and wind. No audio files, no network, fully offline.
- **Supabase** (optional) provides passwordless magic-link auth and a Postgres
  database for cross-device sync. Row-Level Security scopes every row to its
  owner, which is what makes shipping the public anon key in the browser safe.
  Left unconfigured, the app falls back to `localStorage` and runs fully.
- **Framer Motion** is the only animation dependency, and a focused one: it
  powers the spring-based task reorder (its accessible `Reorder` primitive with
  handle-gated drag, instead of a heavyweight drag-and-drop library) and the
  animated add/remove of list items. Everything else (the timer ring, hovers,
  presses, theme transition) is hand-built CSS.
- **Lucide** supplies the line icons, kept at a consistent 1.5px stroke weight to
  match the restrained, monochrome look.

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
`pomodoro_sessions`, `tasks`, and `categories` tables (plus a `category` column
on `pomodoro_sessions`), enables RLS on all, and adds policies so each user can
only read/insert/update/delete **their own** rows (`user_id = auth.uid()`). (The
file is safe to re-run.)

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

## Customize

Open the Customize menu from the **slider icon** (top right):

- **Theme** — Dark or Light (black/white). `T` still toggles it.
- **Timer style** — the progress indicator that shows time remaining, in four
  styles: **Ring**, **Squiggle**, **Segments**, **Dot**. Each previews live.
- **Accent** — the app is monochrome by default. Pick a preset, or tap **+** to
  choose **your own color** with the native picker; your colors are saved into a
  personal palette (remove any with its ✕). The accent flows through the timer
  ring, breathing glow, session dots, and the active-task indicator. Choosing
  **Monochrome** restores the original black-and-white look.

All choices persist locally (and the accent is applied before first paint on
reload). Implementation: a single `--accent` CSS variable (defaulting to the ink
tone) set on `<html>`; see `src/components/CustomizePanel.tsx`,
`src/components/TimerRing.tsx`, and the appearance slice of `src/state/store.ts`.

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
supabase/schema.sql         pomodoro_sessions + tasks + categories tables, RLS
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
    categories.ts           Category persistence: Supabase or localStorage + sync
    time.ts                 Clock / duration / day-grouping helpers
  state/
    store.ts                Player + timer + tasks state (Zustand) + persist
    auth.ts                 Magic-link auth state
    ui.ts                   Auth/history overlay open-state
  hooks/useKeyboard.ts      Keyboard shortcuts
  components/
    TimerHero.tsx           The centerpiece Pomodoro timer
    TimerRing.tsx           The progress indicator styles (ring/squiggle/…)
    CustomizePanel.tsx      Theme · timer style · accent palette
    TaskList.tsx            Drag-reorderable to-do list, wired to the timer
    FocusMode.tsx           Fullscreen distraction-free timer
    ...                     ControlBar, SoundLibrary, Mixer, History*, auth, header
  App.tsx                   Layout (timer → tasks → soundscape)
```
