/*
 * The mixer — every active sound with its own thin volume slider, so layers
 * like "lofi + rain + brown noise" can be balanced individually. Empty until
 * the first sound is added (clean empty state).
 */
import { X } from 'lucide-react'
import { buildCatalog, type Sound } from '../audio/catalog'
import { useStore } from '../state/store'
import { Slider } from './Slider'

export function Mixer() {
  const mix = useStore((s) => s.mix)
  const userFiles = useStore((s) => s.userFiles)
  const setVolume = useStore((s) => s.setVolume)
  const toggleSound = useStore((s) => s.toggleSound)

  const all: Sound[] = [...buildCatalog(), ...userFiles]
  const active = Object.keys(mix)
    .map((id) => all.find((s) => s.id === id))
    .filter((s): s is Sound => Boolean(s))

  return (
    <section className="w-full">
      <h2 className="mb-4 text-[13px] font-medium uppercase tracking-[0.14em] text-tertiary">
        Mix
      </h2>

      {active.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-tertiary">
          Nothing playing yet. Pick a sound to start, or describe your focus above
          and let the assistant build a mix.
        </p>
      ) : (
        <ul className="space-y-1">
          {active.map((sound) => (
            <li
              key={sound.id}
              className="group flex items-center gap-4 rounded-[var(--radius-lg)] px-3 py-3 transition-colors duration-200 hover:bg-fill"
            >
              <span className="w-28 shrink-0 truncate text-[14px] text-content">{sound.name}</span>
              <div className="flex-1">
                <Slider
                  value={mix[sound.id]}
                  onChange={(v) => setVolume(sound.id, v)}
                  ariaLabel={`${sound.name} volume`}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[12px] tabular-nums text-tertiary">
                {Math.round(mix[sound.id] * 100)}
              </span>
              <button
                onClick={() => toggleSound(sound.id)}
                aria-label={`Remove ${sound.name}`}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-tertiary opacity-0 transition-all duration-200 hover:bg-fill-strong hover:text-content group-hover:opacity-100"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
