/*
 * Global keyboard shortcuts. Kept minimal and distraction-free:
 *   Space  play / pause
 *   F      toggle focus mode
 *   T      toggle theme
 *   Esc    exit focus mode
 * Shortcuts are ignored while typing in an input or textarea.
 */
import { useEffect } from 'react'
import { useStore } from '../state/store'

export function useKeyboard() {
  const togglePlay = useStore((s) => s.togglePlay)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const enterFocus = useStore((s) => s.enterFocus)
  const exitFocus = useStore((s) => s.exitFocus)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'KeyF':
          useStore.getState().focusMode ? exitFocus() : enterFocus()
          break
        case 'KeyT':
          toggleTheme()
          break
        case 'Escape':
          if (useStore.getState().focusMode) exitFocus()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, toggleTheme, enterFocus, exitFocus])
}
