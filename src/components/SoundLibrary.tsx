/*
 * The sound library — every sound the user can layer in, grouped by category.
 * Procedural sounds always appear; Lofi/Jazz appear when streams are configured
 * in src/config/sources.ts, plus anything the user adds from their device.
 * Tapping a tile toggles it into the mix.
 */
import { useRef, type ReactNode } from 'react'
import { Check, Plus, Trash2, Upload } from 'lucide-react'
import { buildCatalog, CATEGORY_ORDER, type Sound, type SoundCategory } from '../audio/catalog'
import { useStore } from '../state/store'

export function SoundLibrary() {
  const userFiles = useStore((s) => s.userFiles)
  const mix = useStore((s) => s.mix)
  const toggleSound = useStore((s) => s.toggleSound)
  const addUserFile = useStore((s) => s.addUserFile)
  const removeUserFile = useStore((s) => s.removeUserFile)
  const fileInput = useRef<HTMLInputElement>(null)

  const all: Sound[] = [...buildCatalog(), ...userFiles]
  const byCategory = (cat: SoundCategory) => all.filter((s) => s.category === cat)

  return (
    <section className="w-full">
      <h2 className="mb-4 text-[13px] font-medium uppercase tracking-[0.14em] text-tertiary">
        Sounds
      </h2>

      <div className="space-y-7">
        {CATEGORY_ORDER.map((cat) => {
          const items = byCategory(cat)
          const isYours = cat === 'Yours'

          // Hide empty Lofi/Jazz with a gentle hint instead of a blank section.
          if (items.length === 0 && (cat === 'Lofi' || cat === 'Jazz')) {
            return (
              <div key={cat}>
                <CategoryLabel>{cat}</CategoryLabel>
                <p className="text-[13px] leading-relaxed text-tertiary">
                  No {cat.toLowerCase()} sources yet. Add a royalty-free stream in{' '}
                  <code className="rounded bg-fill px-1.5 py-0.5 text-[12px]">
                    src/config/sources.ts
                  </code>
                  , or add your own audio below.
                </p>
              </div>
            )
          }

          if (items.length === 0 && !isYours) return null

          return (
            <div key={cat}>
              <CategoryLabel>{cat}</CategoryLabel>
              <div className="flex flex-wrap gap-2.5">
                {items.map((sound) =>
                  isYours ? (
                    <DeletableTile
                      key={sound.id}
                      sound={sound}
                      active={sound.id in mix}
                      onToggle={() => toggleSound(sound.id)}
                      onDelete={() => removeUserFile(sound.id)}
                    />
                  ) : (
                    <Tile
                      key={sound.id}
                      sound={sound}
                      active={sound.id in mix}
                      onToggle={() => toggleSound(sound.id)}
                    />
                  ),
                )}

                {isYours && (
                  <button
                    onClick={() => fileInput.current?.click()}
                    className="flex items-center gap-2 rounded-full border border-dashed border-hairline-strong px-4 py-2.5 text-[13px] text-secondary transition-colors duration-200 hover:bg-fill hover:text-content"
                  >
                    <Upload className="h-4 w-4" strokeWidth={1.5} />
                    Add your audio
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files) Array.from(files).forEach(addUserFile)
          e.target.value = '' // allow re-adding the same file
        }}
      />
    </section>
  )
}

function CategoryLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-tertiary">
      {children}
    </h3>
  )
}

function Tile({
  sound,
  active,
  onToggle,
}: {
  sound: Sound
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      className={`group flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] transition-all duration-200 ease-[var(--ease-out)] active:scale-95 ${
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
    </button>
  )
}

/* A user-uploaded sound: a toggle plus a delete control, as one pill. Two
   sibling buttons inside a styled container (no nested buttons). */
function DeletableTile({
  sound,
  active,
  onToggle,
  onDelete,
}: {
  sound: Sound
  active: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`flex items-center rounded-full text-[13px] transition-all duration-200 ease-[var(--ease-out)] ${
        active
          ? 'bg-ink text-ink-contrast shadow-[var(--shadow)]'
          : 'border border-hairline text-secondary'
      }`}
    >
      <button
        onClick={onToggle}
        aria-pressed={active}
        className="flex items-center gap-2 rounded-l-full py-2.5 pl-4 pr-2"
      >
        <span className="grid h-4 w-4 place-items-center">
          {active ? (
            <Check className="h-3 w-3" strokeWidth={2.5} />
          ) : (
            <Plus className="h-3 w-3 opacity-50" strokeWidth={2} />
          )}
        </span>
        <span className="max-w-[140px] truncate">{sound.name}</span>
      </button>
      <button
        onClick={onDelete}
        aria-label={`Delete ${sound.name}`}
        className="grid place-items-center self-stretch rounded-r-full pl-1.5 pr-3.5 opacity-50 transition-opacity duration-200 hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  )
}
