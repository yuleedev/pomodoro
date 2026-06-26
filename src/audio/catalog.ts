/*
 * The sound library. Each entry is something the user can layer into the mix.
 * Procedural sounds (noise, ambient) always work offline; stream sounds come
 * from src/config/sources.ts and only appear when a URL is provided.
 *
 * `description` is a short human-readable note for each sound.
 */
import { enabledStreamSources } from '../config/sources'

export type SoundKind = 'noise' | 'ambient' | 'stream' | 'file'

export type SoundCategory = 'Noise' | 'Ambient' | 'Lofi' | 'Jazz' | 'Yours'

export interface Sound {
  id: string
  name: string
  kind: SoundKind
  category: SoundCategory
  description: string
  defaultVolume: number
  /** noise sounds only */
  noiseType?: 'white' | 'pink' | 'brown'
  /** procedural ambient sounds only */
  ambientType?: 'rain' | 'wind'
  /** stream / file sounds only */
  src?: string
}

/** Procedural sounds — generated in real time, always available offline. */
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
    ambientType: 'rain',
    defaultVolume: 0.5,
    description: 'Gentle, steady rainfall. Cozy and grounding for reading or writing.',
  },
  {
    id: 'ambient-wind',
    name: 'Wind',
    kind: 'ambient',
    category: 'Ambient',
    ambientType: 'wind',
    defaultVolume: 0.45,
    description: 'Soft, drifting wind. Airy and spacious; a light ambient layer.',
  },
]

/** Catalog entries derived from user-configured royalty-free streams. */
const streams = (): Sound[] =>
  enabledStreamSources().map((s) => ({
    id: s.id,
    name: s.name,
    kind: 'stream' as const,
    category: (s.genre === 'lofi' ? 'Lofi' : s.genre === 'jazz' ? 'Jazz' : 'Ambient') as SoundCategory,
    src: s.streamUrl,
    defaultVolume: 0.7,
    description: `${s.genre} stream — foreground music for relaxed studying.`,
  }))

/** The full built-in catalog (procedural + configured streams). */
export const buildCatalog = (): Sound[] => [...PROCEDURAL, ...streams()]

export const CATEGORY_ORDER: SoundCategory[] = ['Noise', 'Ambient', 'Lofi', 'Jazz', 'Yours']
