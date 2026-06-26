/*
 * Soundscape panel - the ambient sound controls, opened from the top bar.
 * Holds the sound library (tap to layer) and the mixer (balance active layers),
 * kept out of the main focus view so the timer and tasks stay front and center.
 */
import { X } from 'lucide-react'
import { useUI } from '../state/ui'
import { SoundLibrary } from './SoundLibrary'
import { Mixer } from './Mixer'

export function SoundPanel() {
  const close = useUI((s) => s.closeSound)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      <div className="glass animate-fade-in relative m-3 flex max-h-[85dvh] w-full max-w-md flex-col rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[18px] font-medium tracking-tight text-content">Soundscape</h2>
          <button
            onClick={close}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full text-tertiary transition-colors duration-200 hover:bg-fill hover:text-content"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrolls when the library + mix overflow the panel height. */}
        <div className="-mx-1 space-y-10 overflow-y-auto px-1 pb-1">
          <SoundLibrary />
          <Mixer />
        </div>
      </div>
    </div>
  )
}
