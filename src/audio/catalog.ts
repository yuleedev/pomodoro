/*
 * The sound library. Noise sounds are fully procedural (generated in real time
 * with the Web Audio API). Ambient sounds play looping royalty-free audio files
 * from /public/sounds — drop your own files there and reference them via `src`.
 */

export type SoundKind = 'noise' | 'ambient'

export type SoundCategory = 'Noise' | 'Ambient'

export interface Sound {
  id: string
  name: string
  kind: SoundKind
  category: SoundCategory
  description: string
  defaultVolume: number
  /** noise sounds only */
  noiseType?: 'white' | 'pink' | 'brown'
  /** ambient sounds: path to a looping audio file under /public */
  src?: string
}

/** Procedural sounds - generated in real time, always available offline. */
const PROCEDURAL: Sound[] = [
  {
    id: 'noise-white',
    name: 'White noise',
    kind: 'noise',
    category: 'Noise',
    noiseType: 'white',
    defaultVolume: 0.4,
    description: 'Bright, full-spectrum static. Masks chatter; good for raw concentration.',
  },
  {
    id: 'noise-pink',
    name: 'Pink noise',
    kind: 'noise',
    category: 'Noise',
    noiseType: 'pink',
    defaultVolume: 0.5,
    description: 'Balanced, softer-than-white static. A comfortable all-day focus bed.',
  },
  {
    id: 'noise-brown',
    name: 'Brown noise',
    kind: 'noise',
    category: 'Noise',
    noiseType: 'brown',
    defaultVolume: 0.55,
    description: 'Deep, low rumble like distant surf. Calming; eases anxiety and deep work.',
  },
  {
    id: 'ambient-rain',
    name: 'Rain',
    kind: 'ambient',
    category: 'Ambient',
    src: '/sounds/rain.ogg',
    defaultVolume: 0.5,
    description: 'Gentle, steady rainfall. Cozy and grounding for reading or writing.',
  },
  {
    id: 'ambient-fire',
    name: 'Fire',
    kind: 'ambient',
    category: 'Ambient',
    src: '/sounds/fire.ogg',
    defaultVolume: 0.5,
    description: 'Crackling fireplace. Warm and intimate; a snug late-night layer.',
  },
  {
    id: 'ambient-ocean',
    name: 'Ocean',
    kind: 'ambient',
    category: 'Ambient',
    src: '/sounds/ocean.ogg',
    defaultVolume: 0.5,
    description: 'Rolling ocean waves. Slow, rhythmic, and deeply calming.',
  },
  {
    id: 'ambient-wind',
    name: 'Wind',
    kind: 'ambient',
    category: 'Ambient',
    src: '/sounds/wind.ogg',
    defaultVolume: 0.45,
    description: 'Soft, drifting wind. Airy and spacious; a light ambient layer.',
  },
]

/** The full built-in catalog. */
export const buildCatalog = (): Sound[] => [...PROCEDURAL]

export const CATEGORY_ORDER: SoundCategory[] = ['Noise', 'Ambient']
