/*
 * The mixer - every active sound with its own thin volume slider, so layers
 * like "rain + brown noise" can be balanced individually. Empty until the first
 * sound is added (clean empty state).
 */
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { buildCatalog, type Sound } from '../audio/catalog'
import { useStore } from '../state/store'
import { spring } from '../lib/motion'
import { Slider } from './Slider'

export function Mixer() {
  const mix = useStore((s) => s.mix)
  const setVolume = useStore((s) => s.setVolume)
  const toggleSound = useStore((s) => s.toggleSound)

  const all: Sound[] = buildCatalog()
  const active = Object.keys(mix)
    .map((id) => all.find((s) => s.id === id))
    .filter((s): s is Sound => Boolean(s))

  return (
    <section className="w-full">
      <h2 className="mb-4 text-[15px] font-medium uppercase tracking-[0.14em] text-tertiary">
        Mix
      </h2>

      {active.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-tertiary">
          Nothing playing yet. Pick a sound above to start your mix.
        </p>
      ) : (
        <ul className="space-y-1">
          <AnimatePresence initial={false} mode="popLayout">
          {active.map((sound) => (
            <motion.li
              key={sound.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8, transition: { duration: 0.12 } }}
              transition={spring}
              className="group flex items-center gap-4 rounded-[var(--radius-lg)] px-3 py-3 transition-colors duration-200 hover:bg-fill"
            >
              <span className="w-28 shrink-0 truncate text-[16px] text-content">{sound.name}</span>
              <div className="flex-1">
                <Slider
                  value={mix[sound.id]}
                  onChange={(v) => setVolume(sound.id, v)}
                  ariaLabel={`${sound.name} volume`}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[14px] tabular-nums text-tertiary">
                {Math.round(mix[sound.id] * 100)}
              </span>
              <button
                onClick={() => toggleSound(sound.id)}
                aria-label={`Remove ${sound.name}`}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-tertiary opacity-0 transition-all duration-200 hover:bg-fill-strong hover:text-content group-hover:opacity-100"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </motion.li>
          ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
