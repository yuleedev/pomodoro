/* Minimal top bar: the wordmark, the history + account control, and a
   customization button (theme, timer style, accent palette). */
import { SlidersHorizontal } from 'lucide-react'
import { AccountMenu } from './AccountMenu'
import { useUI } from '../state/ui'

export function Header() {
  const openCustomize = useUI((s) => s.openCustomize)

  return (
    <header className="flex items-center justify-between py-6">
      <span className="text-[16px] font-medium tracking-tight text-content">Cadence</span>
      <div className="flex items-center gap-1">
        <AccountMenu />
        <button
          onClick={openCustomize}
          aria-label="Customize appearance"
          className="grid h-9 w-9 place-items-center rounded-full text-secondary transition-colors duration-200 hover:bg-fill hover:text-content"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  )
}
