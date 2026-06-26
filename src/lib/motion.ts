/*
 * Shared Framer Motion spring presets. Kept subtle and "bouncy but restrained"
 * to match the monochrome, Apple-inspired feel — a little overshoot, never
 * cartoonish. Reduced-motion is honoured globally via <MotionConfig> in main.
 */
import type { Transition } from 'framer-motion'

/** Crisp, lightly bouncy — buttons, taps, small UI. */
export const spring: Transition = { type: 'spring', stiffness: 520, damping: 30 }

/** Softer, more visible overshoot — entrances, graph bars. */
export const softSpring: Transition = { type: 'spring', stiffness: 320, damping: 22 }

/** Gentle, heavier — large overlays sliding in. */
export const overlaySpring: Transition = { type: 'spring', stiffness: 260, damping: 28 }
