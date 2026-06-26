/* Minimal top bar: the wordmark and a single theme toggle. Nothing else. */
import { Moon, Sun } from 'lucide-react'
import { useStore } from '../state/store'

export function Header() {
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)

  return (
    <header className="flex items-center justify-between py-6">
      <span className="text-[15px] font-medium tracking-tight text-content">Soundscape</span>
      <button
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="grid h-9 w-9 place-items-center rounded-full text-secondary transition-colors duration-200 hover:bg-fill hover:text-content"
      >
        {theme === 'dark' ? (
          <Sun className="h-[18px] w-[18px]" strokeWidth={1.5} />
        ) : (
          <Moon className="h-[18px] w-[18px]" strokeWidth={1.5} />
        )}
      </button>
    </header>
  )
}
