/*
 * The to-do list, integrated with the Pomodoro timer.
 *
 *  • Add, inline-edit, complete, delete, and drag-to-reorder tasks.
 *  • Select a task to make it "active" - the hero timer runs against it, and
 *    each completed focus interval adds a session dot to it.
 *  • Completed tasks de-emphasize (strikethrough + lowered opacity) rather than
 *    vanish.
 *
 * Motion (framer-motion): spring layout reorder + animated add/remove. Drag is
 * gated to an explicit grip handle so taps on the checkbox/title still work.
 */
import { useState } from 'react'
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion'
import { Check, GripVertical, Plus, Repeat, StickyNote, Trash2 } from 'lucide-react'
import { useStore } from '../state/store'
import { spring } from '../lib/motion'
import type { Task } from '../lib/tasks'

export function TaskList() {
  const tasks = useStore((s) => s.tasks)
  const addTask = useStore((s) => s.addTask)
  const reorderTasks = useStore((s) => s.reorderTasks)
  const [draft, setDraft] = useState('')
  const [notes, setNotes] = useState('')
  const [repeat, setRepeat] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const reset = () => {
    setDraft('')
    setNotes('')
    setRepeat(false)
    setExpanded(false)
  }

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!draft.trim()) return
    addTask(draft, { notes, recurrence: repeat ? 'daily' : undefined })
    reset()
  }

  const remaining = tasks.filter((t) => !t.completed).length

  return (
    <section className="w-full">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[15px] font-medium uppercase tracking-[0.14em] text-tertiary">Tasks</h2>
        {tasks.length > 0 && (
          <span className="text-[13px] tabular-nums text-tertiary">{remaining} left</span>
        )}
      </div>

      {/* Add task - the bar drops down to a notes field + repeat toggle on focus */}
      <form onSubmit={submit} className="mb-4">
        <div className="glass rounded-[var(--radius-lg)] shadow-[var(--shadow)] transition-all duration-300 ease-[var(--ease-out)] focus-within:scale-[1.005]">
          <div className="flex items-center gap-3 px-4 py-3">
            <Plus className="h-[18px] w-[18px] shrink-0 text-tertiary" strokeWidth={1.5} />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => setExpanded(true)}
              placeholder="Add a task…"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-content placeholder:text-tertiary focus:outline-none"
              aria-label="Add a task"
            />
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-3 border-t border-hairline px-4 pb-3.5 pt-3">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Write any notes here…"
                    rows={3}
                    className="block w-full resize-none rounded-[var(--radius-md)] bg-fill px-3 py-2 text-[14px] leading-relaxed text-content placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-hairline-strong"
                    aria-label="Task notes"
                  />

                  <div className="flex items-center justify-between gap-3">
                    {/* Repeat every day */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={repeat}
                      onClick={() => setRepeat((r) => !r)}
                      className="flex items-center gap-2.5 text-[14px] text-secondary transition-colors hover:text-content"
                    >
                      <span
                        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${
                          repeat ? 'bg-ink' : 'bg-fill-strong'
                        }`}
                      >
                        <motion.span
                          className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-elevated shadow-[var(--shadow)]"
                          animate={{ x: repeat ? 16 : 0 }}
                          transition={spring}
                        />
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Repeat className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Repeat every day
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={reset}
                        className="rounded-full px-3 py-1.5 text-[13px] text-tertiary transition-colors hover:text-content"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!draft.trim()}
                        className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-ink-contrast transition-opacity duration-200 disabled:opacity-40"
                      >
                        Add task
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>

      {tasks.length === 0 ? (
        <p className="px-1 text-[15px] leading-relaxed text-tertiary">
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
  const toggleTask = useStore((s) => s.toggleTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const renameTask = useStore((s) => s.renameTask)
  const setTaskRecurrence = useStore((s) => s.setTaskRecurrence)
  const setTaskNotes = useStore((s) => s.setTaskNotes)

  const repeats = task.recurrence === 'daily'
  const hasNotes = Boolean(task.notes && task.notes.trim())

  // The active task is whichever sits first in the list (managed by the store).
  const active = selectedTaskId === task.id

  // Click the task to open its editor; edits save live as you type/leave.
  const [open, setOpen] = useState(false)
  const [titleVal, setTitleVal] = useState(task.title)
  const [noteVal, setNoteVal] = useState(task.notes ?? '')

  const openEditor = () => {
    setTitleVal(task.title)
    setNoteVal(task.notes ?? '')
    setOpen(true)
  }

  const commitTitle = () => {
    if (titleVal.trim() && titleVal.trim() !== task.title) renameTask(task.id, titleVal)
    else setTitleVal(task.title)
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
      className={`group relative rounded-[var(--radius-lg)] transition-colors duration-200 ${
        open ? 'bg-fill' : 'hover:bg-fill'
      }`}
    >
      <div className="relative flex items-center gap-2 py-2.5 pl-2 pr-2">
        {/* Active accent bar - marks the first task, which the timer runs against */}
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

        {/* Title - click to open the editor */}
        <button
          onClick={() => (open ? setOpen(false) : openEditor())}
          aria-expanded={open}
          className="min-w-0 flex-1 truncate text-left text-[16px] transition-colors"
          title="Click to edit"
        >
          <span
            className={
              task.completed
                ? 'text-tertiary line-through'
                : active
                  ? 'text-content'
                  : 'text-secondary'
            }
          >
            {task.title}
          </span>
        </button>

        {/* Read-only badges so you can see at a glance what's set (not buttons) */}
        {repeats && (
          <Repeat
            className="h-3.5 w-3.5 shrink-0 text-tertiary"
            strokeWidth={1.5}
            aria-label="Repeats every day"
          />
        )}
        {hasNotes && (
          <StickyNote
            className="h-3.5 w-3.5 shrink-0 text-tertiary"
            strokeWidth={1.5}
            aria-label="Has notes"
          />
        )}

        {/* Session dots */}
        {task.session_count > 0 && <SessionDots count={task.session_count} />}
      </div>

      {/* Click-to-edit panel: title, notes, repeat, delete. Edits save live. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-hairline px-3 pb-3.5 pt-3">
              <input
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitTitle()
                    setOpen(false)
                  }
                  if (e.key === 'Escape') {
                    setTitleVal(task.title)
                    setOpen(false)
                  }
                }}
                placeholder="Task title"
                className="block w-full rounded-[var(--radius-md)] bg-fill px-3 py-2 text-[15px] text-content placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-hairline-strong"
                aria-label="Task title"
              />

              <textarea
                value={noteVal}
                onChange={(e) => setNoteVal(e.target.value)}
                onBlur={() => setTaskNotes(task.id, noteVal)}
                placeholder="Write any notes here…"
                rows={3}
                className="block w-full resize-none rounded-[var(--radius-md)] bg-fill px-3 py-2 text-[14px] leading-relaxed text-content placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-hairline-strong"
                aria-label="Task notes"
              />

              <div className="flex items-center justify-between gap-3">
                {/* Repeat every day */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={repeats}
                  onClick={() => setTaskRecurrence(task.id, repeats ? undefined : 'daily')}
                  className="flex items-center gap-2.5 text-[14px] text-secondary transition-colors hover:text-content"
                >
                  <span
                    className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${
                      repeats ? 'bg-ink' : 'bg-fill-strong'
                    }`}
                  >
                    <motion.span
                      className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-elevated shadow-[var(--shadow)]"
                      animate={{ x: repeats ? 16 : 0 }}
                      transition={spring}
                    />
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Repeat className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Repeat every day
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-tertiary transition-colors hover:text-content"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      commitTitle()
                      setTaskNotes(task.id, noteVal)
                      setOpen(false)
                    }}
                    className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-ink-contrast transition-opacity duration-200"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  )
}

/* Up to 5 dots; beyond that, a compact count. Pure grayscale. */
function SessionDots({ count }: { count: number }) {
  if (count > 5) {
    return <span className="shrink-0 text-[12px] tabular-nums text-tertiary">{count}×</span>
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
