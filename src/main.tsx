import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './index.css'
import { App } from './App'
import { Analytics } from "@vercel/analytics/react"

// One-time migration of pre-rename localStorage keys (soundscape:* → cadence:*)
// so existing local preferences and history carry over to the new brand.
;(function migrateLegacyKeys() {
  try {
    const moves: [string, string][] = [
      ['soundscape:state', 'cadence:state'],
      ['soundscape:sessions', 'cadence:sessions'],
      ['soundscape:theme', 'cadence:theme'],
    ]
    for (const [from, to] of moves) {
      const val = localStorage.getItem(from)
      if (val !== null && localStorage.getItem(to) === null) {
        localStorage.setItem(to, val)
        localStorage.removeItem(from)
      }
    }
  } catch {
    /* localStorage unavailable - nothing to migrate */
  }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user" → all springs below honour prefers-reduced-motion. */}
    <MotionConfig reducedMotion="user">
      <App />
      <Analytics />
    </MotionConfig>
  </StrictMode>,
)
