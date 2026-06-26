/* Minimal top bar: the wordmark, a history + account control, and the theme
   toggle. Nothing else. */
import { Moon, Sun } from 'lucide-react'
import { useStore } from '../state/store'
import { AccountMenu } from './AccountMenu'

export function Header() {
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)

  return (
    <header className="flex items-center justify-between py-6">
      <span className="text-[16px] font-medium tracking-tight text-content">Cadence</span>
      <div className="flex items-center gap-1">
        <AccountMenu />
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
      </div>
    </header>
  )
}
