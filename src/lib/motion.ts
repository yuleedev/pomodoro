/*
 * Shared Framer Motion spring presets. Kept subtle and "bouncy but restrained"
 * to match the monochrome, Apple-inspired feel - a little overshoot, never
 * cartoonish. Reduced-motion is honoured globally via <MotionConfig> in main.
 */
import type { Transition } from 'framer-motion'

/** Crisp, lightly bouncy - buttons, taps, small UI. */
export const spring: Transition = { type: 'spring', stiffness: 520, damping: 30 }

/** Softer, more visible overshoot - entrances, graph bars. */
export const softSpring: Transition = { type: 'spring', stiffness: 320, damping: 22 }

/** Gentle, heavier - large overlays sliding in. */
export const overlaySpring: Transition = { type: 'spring', stiffness: 260, damping: 28 }

/** Pop-in for modal cards (a little overshoot). */
export const popSpring: Transition = { type: 'spring', stiffness: 380, damping: 26 }

/** Standard whileTap for bouncy presses. Pair with a component's own spring. */
export const tapScale = { scale: 0.93 }

/** Reusable entrance variants for lists/sections (use with `custom={index}`). */
export const revealVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.985 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...softSpring, delay: i * 0.05 },
  }),
}
