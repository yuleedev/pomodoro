/* Minimal top bar: the wordmark, the soundscape / history / settings / theme
   controls (each reveals its label on hover), and the account control far right. */
import { AudioLines, BarChart3, Settings, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { AccountMenu } from './AccountMenu'
import { useUI } from '../state/ui'

export function Header() {
  const openCustomize = useUI((s) => s.openCustomize)
  const openSound = useUI((s) => s.openSound)
  const openSettings = useUI((s) => s.openSettings)
  const openHistory = useUI((s) => s.openHistory)

  return (
    <header className="flex items-center justify-between py-6">
      <span className="text-[17px] font-medium tracking-tight text-content">pomopomo.</span>
      <div className="flex items-center gap-1">
        <IconButton icon={AudioLines} label="Sounds" onClick={openSound} />
        <IconButton icon={Settings} label="Settings" onClick={openSettings} />
        <IconButton icon={BarChart3} label="History" onClick={openHistory} />
        <IconButton icon={SlidersHorizontal} label="Theme" onClick={openCustomize} />
        <AccountMenu />
      </div>
    </header>
  )
}

/* A circular icon that expands into a pill, sliding its label in on hover. */
function IconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="group flex h-9 items-center rounded-full text-secondary transition-colors duration-200 hover:bg-fill hover:text-content"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-[14px] opacity-0 transition-all duration-500 ease-[var(--ease-out)] group-hover:max-w-[8rem] group-hover:pr-3.5 group-hover:opacity-100">
        {label}
      </span>
    </button>
  )
}
