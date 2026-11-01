# pomopomo.

pomopomo. is a study app built around a Pomodoro timer. It also has a to-do list that works with the timer and background sounds you can mix while you work. It is made with React and TypeScript and deployed on Vercel.

## Getting Started/Installation

You need Node 18 or newer.

1. Clone the repo: `git clone https://github.com/yuleedev/pomodoro.git`
2. Install packages: `npm install`
3. Start the dev server: `npm run dev`
4. Open `http://localhost:5173` in your browser.

The app runs without any setup. Your tasks and history are saved in your browser.

**Optional accounts:** To turn on sign-in and syncing across devices, create a Supabase project and run `supabase/schema.sql` in the SQL editor. Then copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Controls

- **Mouse:** Start the timer, add and edit tasks, and change settings.
- **Space:** Play or pause the timer.
- **F:** Turn focus mode on or off.
- **T:** Switch between light and dark mode.
- **Esc:** Leave focus mode.

(Shortcuts don't work while you're typing in a text box.)

## How to Use

### Timer

- Press play to start a focus session. The border of the timer shows how much time is left.
- Set the focus, break and round lengths with the sliders, or type in a number.
- Choose a timer style: Ring, Squiggle, Segments or Dot.

### Tasks

- Add a task. You can also add notes or set it to repeat every day.
- Drag tasks to put them in a different order. The task at the top is the one the timer is tracking.
- Each finished focus session adds a dot to that task.

### Sounds

- Turn on white, pink or brown noise, or ambient sounds like rain, fire and ocean.
- Play several at once and set the volume for each one.

### History

- Click the bar chart icon to see an activity heatmap, a 14-day focus chart and your past sessions by day.

### Customize

- Pick light or dark mode and choose an accent color. You can use a preset or pick your own.
