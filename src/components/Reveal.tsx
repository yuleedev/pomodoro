/*
 * Reveal — a small entrance wrapper so the whole app gets the same subtle,
 * lightly-bouncy spring-in the history page uses. Fades + lifts + scales its
 * children on mount; `delay` staggers siblings. Honors reduced-motion globally
 * via <MotionConfig> in main.tsx.
 */
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { softSpring } from '../lib/motion'

export function Reveal({
  children,
  delay = 0,
  y = 12,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...softSpring, delay }}
    >
      {children}
    </motion.div>
  )
}
