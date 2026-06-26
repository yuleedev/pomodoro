/*
 * The persistent frosted control bar, pinned to the bottom. Holds a compact
 * play/pause (handy when scrolled away from the hero) and an entry into focus
 * mode. Translucent material, monochrome, restrained.
 */
import { motion } from 'framer-motion'
import { Maximize2, Pause, Play } from 'lucide-react'
import { useStore } from '../state/store'
import { spring } from '../lib/motion'

export function ControlBar() {
  const isPlaying = useStore((s) => s.isPlaying)
  const togglePlay = useStore((s) => s.togglePlay)
  const hasMix = useStore((s) => Object.keys(s.mix).length > 0)
  const enterFocus = useStore((s) => s.enterFocus)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="glass pointer-events-auto flex items-center gap-2 rounded-full px-3 py-2.5 shadow-[var(--shadow)]">
        {/* Compact play / pause */}
        <motion.button
          onClick={togglePlay}
          disabled={!hasMix}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          whileHover={hasMix ? { scale: 1.08 } : undefined}
          whileTap={hasMix ? { scale: 0.88 } : undefined}
          transition={spring}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-ink-contrast transition-colors duration-200 disabled:opacity-25"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" strokeWidth={1.5} fill="currentColor" />
          ) : (
            <Play className="h-4 w-4 translate-x-[1px]" strokeWidth={1.5} fill="currentColor" />
          )}
        </motion.button>

        {/* Enter focus */}
        <motion.button
          onClick={enterFocus}
          aria-label="Enter focus mode"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.88 }}
          transition={spring}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-secondary transition-colors duration-200 hover:bg-fill hover:text-content"
        >
          <Maximize2 className="h-4 w-4" strokeWidth={1.5} />
        </motion.button>
      </div>
    </div>
  )
}
