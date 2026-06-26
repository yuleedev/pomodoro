/*
 * The to-do list, integrated with the Pomodoro timer.
 *
 *  • Add, inline-edit, complete, delete, and drag-to-reorder tasks.
 *  • Select a task to make it "active" — the hero timer runs against it, and
 *    each completed focus interval adds a session dot to it.
 *  • Completed tasks de-emphasize (strikethrough + lowered opacity) rather than
 *    vanish.
 *
 * Motion (framer-motion): spring layout reorder + animated add/remove. Drag is
 * gated to an explicit grip handle so taps on the checkbox/title still work.
 */
import { useState } from 'react'
import { AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { Check, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../state/store'
import type { Task } from '../lib/tasks'

export function TaskList() {
  const tasks = useStore((s) => s.tasks)
  const addTask = useStore((s) => s.addTask)
  const reorderTasks = useStore((s) => s.reorderTasks)
  const [draft, setDraft] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    addTask(draft)
    setDraft('')
  }

  const remaining = tasks.filter((t) => !t.completed).length

  return (
    <section className="w-full">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[14px] font-medium uppercase tracking-[0.14em] text-tertiary">Tasks</h2>
        {tasks.length > 0 && (
          <span className="text-[12px] tabular-nums text-tertiary">{remaining} left</span>
        )}
      </div>

      {/* Add task */}
      <form onSubmit={submit} className="mb-4">
        <div className="glass flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow)] transition-all duration-300 ease-[var(--ease-out)] focus-within:scale-[1.005]">
          <Plus className="h-[18px] w-[18px] shrink-0 text-tertiary" strokeWidth={1.5} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a task…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-content placeholder:text-tertiary focus:outline-none"
            aria-label="Add a task"
          />
        </div>
      </form>

      {tasks.length === 0 ? (
        <p className="px-1 text-[14px] leading-relaxed text-tertiary">
          No tasks yet. Add one above, then select it to focus your next session on it.
        </p>
      ) : (
        <Reorder.Group axis="y" values={tasks} onReorder={reorderTasks} className="select-none">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </section>
  )
}

function TaskRow({ task }: { task: Task }) {
  const controls = useDragControls()
  const selectedTaskId = useStore((s) => s.selectedTaskId)
  const selectTask = useStore((s) => s.selectTask)
  const toggleTask = useStore((s) => s.toggleTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const renameTask = useStore((s) => s.renameTask)

  const active = selectedTaskId === task.id
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(task.title)

  const commit = () => {
    setEditing(false)
    if (val.trim() && val.trim() !== task.title) renameTask(task.id, val)
    else setVal(task.title)
  }

  return (
    <Reorder.Item
      value={task}
      dragListener={false}
      dragControls={controls}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 520, damping: 42 }}
      className={`group relative flex items-center gap-2 rounded-[var(--radius-lg)] py-2.5 pl-2 pr-2 transition-colors duration-200 ${
        active ? 'bg-fill' : 'hover:bg-fill'
      }`}
    >
      {/* Active accent bar */}
      {active && (
        <span
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      )}

      {/* Drag handle */}
      <button
        onPointerDown={(e) => controls.start(e)}
        aria-label="Drag to reorder"
        className="grid h-7 w-5 shrink-0 cursor-grab touch-none place-items-center text-tertiary opacity-0 transition-opacity duration-200 hover:text-content group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" strokeWidth={1.5} />
      </button>

      {/* Complete checkbox */}
      <button
        onClick={() => toggleTask(task.id)}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        aria-pressed={task.completed}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all duration-200 ease-[var(--ease-out)] active:scale-90 ${
          task.completed
            ? 'border-transparent bg-ink text-ink-contrast'
            : 'border-hairline-strong text-transparent hover:border-content'
        }`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </button>

      {/* Title — click to select as active; double-click to edit */}
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setVal(task.title)
              setEditing(false)
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-content focus:outline-none"
          aria-label="Edit task"
        />
      ) : (
        <button
          onClick={() => selectTask(task.id)}
          onDoubleClick={() => setEditing(true)}
          className="min-w-0 flex-1 truncate text-left text-[15px] transition-colors"
          title={active ? 'Active — click to deselect' : 'Click to focus on this task'}
        >
          <span
            className={
              task.completed ? 'text-tertiary line-through' : active ? 'text-content' : 'text-secondary'
            }
          >
            {task.title}
          </span>
        </button>
      )}

      {/* Session dots */}
      {task.session_count > 0 && <SessionDots count={task.session_count} />}

      {/* Row actions (hover) */}
      <div className="flex shrink-0 items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit task"
          className="grid h-7 w-7 place-items-center rounded-full text-tertiary transition-colors hover:bg-fill-strong hover:text-content"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => deleteTask(task.id)}
          aria-label="Delete task"
          className="grid h-7 w-7 place-items-center rounded-full text-tertiary transition-colors hover:bg-fill-strong hover:text-content"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </Reorder.Item>
  )
}

/* Up to 5 dots; beyond that, a compact count. Pure grayscale. */
function SessionDots({ count }: { count: number }) {
  if (count > 5) {
    return <span className="shrink-0 text-[11px] tabular-nums text-tertiary">{count}×</span>
  }
  return (
    <span className="flex shrink-0 items-center gap-1" title={`${count} session${count > 1 ? 's' : ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      ))}
    </span>
  )
}
