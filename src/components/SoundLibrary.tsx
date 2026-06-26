/*
 * The sound library - the procedural sounds you can layer into the mix,
 * grouped by category. Tapping a tile toggles it on/off. Tiles spring in with a
 * subtle stagger and bounce on tap, matching the rest of the app.
 */
import { motion } from 'framer-motion'
import { Check, Plus } from 'lucide-react'
import { buildCatalog, CATEGORY_ORDER, type Sound, type SoundCategory } from '../audio/catalog'
import { useStore } from '../state/store'
import { revealVariants, tapScale } from '../lib/motion'

export function SoundLibrary() {
  const mix = useStore((s) => s.mix)
  const toggleSound = useStore((s) => s.toggleSound)

  const all = buildCatalog()
  const byCategory = (cat: SoundCategory) => all.filter((s) => s.category === cat)

  let order = 0 // running index for a continuous stagger across categories

  return (
    <section className="w-full">
      <h2 className="mb-4 text-[15px] font-medium uppercase tracking-[0.14em] text-tertiary">
        Sounds
      </h2>

      <div className="space-y-7">
        {CATEGORY_ORDER.map((cat) => {
          const items = byCategory(cat)
          if (items.length === 0) return null
          return (
            <div key={cat}>
              <h3 className="mb-3 text-[14px] font-medium uppercase tracking-[0.14em] text-tertiary">
                {cat}
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {items.map((sound) => (
                  <Tile
                    key={sound.id}
                    sound={sound}
                    active={sound.id in mix}
                    onToggle={() => toggleSound(sound.id)}
                    index={order++}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Tile({
  sound,
  active,
  onToggle,
  index,
}: {
  sound: Sound
  active: boolean
  onToggle: () => void
  index: number
}) {
  return (
    <motion.button
      onClick={onToggle}
      aria-pressed={active}
      variants={revealVariants}
      initial="hidden"
      animate="show"
      custom={index}
      whileTap={tapScale}
      className={`group flex items-center gap-2 rounded-full px-4 py-2.5 text-[15px] ${
        active
          ? 'bg-ink text-ink-contrast shadow-[var(--shadow)]'
          : 'border border-hairline text-secondary hover:bg-fill hover:text-content'
      }`}
    >
      <span
        className={`grid h-4 w-4 place-items-center rounded-full transition-colors ${
          active ? 'bg-ink-contrast/20' : ''
        }`}
      >
        {active ? (
          <Check className="h-3 w-3" strokeWidth={2.5} />
        ) : (
          <Plus className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" strokeWidth={2} />
        )}
      </span>
      {sound.name}
    </motion.button>
  )
}
