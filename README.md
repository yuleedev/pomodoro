# pomopomo.

A focus-first study app: a Pomodoro timer at its heart, an integrated to-do
list, and ambient soundscapes underneath. Calm, precise, and monochrome by
default, with an optional accent color you can set or build into your own palette.

Deployed on Vercel — every push to `main` builds and ships automatically.

## Features

- **Pomodoro timer** — a large hero timer whose border shows time remaining, with
  smooth start/pause/reset, a fullscreen focus mode, and four progress styles
  (Ring, Squiggle, Segments, Dot). Set focus/break/round lengths with a slider or
  by typing a value.
- **Tasks, wired to the timer** — add a task (with optional notes and a
  repeat-every-day toggle), drag to reorder, and click any task to edit it. The
  task at the top of the list is automatically the active one: the timer runs
  against it and logs a session dot each time a focus interval completes.
- **Sounds** — procedural white/pink/brown noise plus looping ambient tracks
  (rain, fire, ocean, wind). Layer any of them and balance with per-track volume.
- **Customize** — dark/light theme, the timer style, and an accent color (presets
  or your own via the color picker) that re-tints the whole app. Monochrome by
  default.
- **History** — a monochrome dashboard (the bar-chart icon): activity heatmap,
  14-day focus chart, and sessions grouped by day.
- **Accounts & sync** *(optional)* — passwordless magic-link sign-in via Supabase
  syncs tasks and sessions across devices. Signed out, everything lives in
  `localStorage`; it syncs up the next time you sign in.

## Sounds

- **Noise** (white/pink/brown) is generated live with the Web Audio API — no
  files, fully offline.
- **Ambient** (rain/fire/ocean/wind) plays looping audio files from
  `public/sounds/`. Drop your own royalty-free `.ogg` files there
  (`rain.ogg`, `fire.ogg`, `ocean.ogg`, `wind.ogg`) to fill them in. The catalog
  lives in `src/audio/catalog.ts`; the Web Audio graph in `src/audio/engine.ts`.

## Keyboard shortcuts

| Key     | Action              |
| ------- | ------------------- |
| `Space` | Play / pause        |
| `F`     | Toggle focus mode   |
| `T`     | Toggle light / dark |
| `Esc`   | Exit focus mode     |

Ignored while you're typing in a field.

## Tech stack

React 19 + TypeScript (strict), Vite, Tailwind CSS v4, Zustand for state, Framer
Motion for the task reorder and list animations, Lucide icons, and the Web Audio
API for sound. Supabase is optional and only powers accounts + sync.

## Local development

Requires Node 18+.

```bash
npm install
npm run dev      # http://localhost:5173
```

The app is a static SPA and needs no backend to run — the core works with zero
environment variables.

## Accounts (optional, Supabase)

Without this, the app runs fully and history is saved in `localStorage`. To enable
sign-in and cross-device sync:

1. Create a Supabase project, then run [`supabase/schema.sql`](./supabase/schema.sql)
   in the SQL editor (creates the tables + Row-Level Security; safe to re-run).
2. Set two environment variables (in Vercel, or a local `.env` — see
   `.env.example`):
   - `VITE_SUPABASE_URL` — your project URL
   - `VITE_SUPABASE_ANON_KEY` — the **anon** public key (never the service-role key)
3. In **Authentication → URL Configuration**, add your app origins (e.g.
   `http://localhost:5173` and your Vercel URL) to **Site URL** + **Redirect URLs**,
   so the magic link can return to the app.

RLS scopes every row to its owner (`user_id = auth.uid()`), which is what makes
shipping the public anon key in the browser safe — don't disable it.
