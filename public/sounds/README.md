# Ambient sound files

Drop your **royalty-free** looping audio files here. The app's Ambient section
(see `src/audio/catalog.ts`) expects these exact filenames:

| Sound | File                  |
| ----- | --------------------- |
| Rain  | `rain.ogg`            |
| Fire  | `fire.ogg`            |
| Ocean | `ocean.ogg`           |
| Wind  | `wind.ogg`            |

## Tips

- **Format:** `.ogg` is preferred for seamless looping. `.mp3`/`.m4a` also work —
  if you use a different extension, update the `src` path for that sound in
  `src/audio/catalog.ts` (e.g. `/sounds/rain.mp3`).
- **Looping:** pick clips that are designed to loop — no fade-in/out at the ends,
  or you'll hear a gap each time the loop restarts.
- **Length:** 30s–2min is plenty; the file is looped automatically.
- **Licensing:** only add audio you have the right to use. Keep a note of the
  source/license for each file.

Files in this folder are served at `/sounds/<filename>` at runtime.
