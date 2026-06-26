/*
 * Optional category selector, shown under the timer. Pick a category to
 * attribute the next focus session to it (so you can track hours by area like
 * Math / Reading / Coding). Entirely optional — with no category selected,
 * sessions are simply untracked. Per-category totals appear in History.
 */
import { useState } from 'react'
import { Plus, Tag, X } from 'lucide-react'
import { useStore } from '../state/store'

export function CategoryBar() {
  const categories = useStore((s) => s.categories)
  const activeCategoryId = useStore((s) => s.activeCategoryId)
  const selectCategory = useStore((s) => s.selectCategory)
  const addCategory = useStore((s) => s.addCategory)
  const deleteCategory = useStore((s) => s.deleteCategory)

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const commitAdd = () => {
    if (draft.trim()) addCategory(draft)
    setDraft('')
    setAdding(false)
  }

  // Empty + not adding: a single discreet hint to opt in.
  if (categories.length === 0 && !adding) {
    return (
      <div className="flex justify-center">
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-tertiary transition-colors duration-200 hover:bg-fill hover:text-content"
        >
          <Tag className="h-3.5 w-3.5" strokeWidth={1.5} />
          Track time by category
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {categories.map((cat) => {
        const active = cat.id === activeCategoryId
        return (
          <div
            key={cat.id}
            className={`group flex items-center rounded-full text-[13px] transition-all duration-200 ease-[var(--ease-out)] ${
              active
                ? 'bg-ink text-ink-contrast shadow-[var(--shadow)]'
                : 'border border-hairline text-secondary'
            }`}
          >
            <button
              onClick={() => selectCategory(cat.id)}
              aria-pressed={active}
              className="rounded-l-full py-1.5 pl-3.5 pr-2"
            >
              {cat.name}
            </button>
            <button
              onClick={() => deleteCategory(cat.id)}
              aria-label={`Delete ${cat.name}`}
              className="grid place-items-center self-stretch rounded-r-full pl-1 pr-3 opacity-40 transition-opacity duration-200 hover:opacity-100"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
        )
      })}

      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitAdd}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitAdd()
            if (e.key === 'Escape') {
              setDraft('')
              setAdding(false)
            }
          }}
          placeholder="Category name"
          className="w-36 rounded-full border border-hairline-strong bg-transparent px-3.5 py-1.5 text-[13px] text-content placeholder:text-tertiary focus:outline-none"
          aria-label="New category name"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          aria-label="Add category"
          className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-hairline-strong text-tertiary transition-colors duration-200 hover:bg-fill hover:text-content"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  )
}
