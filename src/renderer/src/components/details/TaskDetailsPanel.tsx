import { useEffect, useMemo, useState } from 'react'
import { deriveTaskState } from '@shared/deriveTimeline'
import { todayDateOnly } from '@shared/date'
import { useAppStore } from '../../store/useAppStore'
import { Modal } from '../common/Modal'

export function TaskDetailsPanel(): JSX.Element {
  const document = useAppStore((s) => s.document)
  const customerId = useAppStore((s) => s.selectedCustomerId)
  const projectId = useAppStore((s) => s.selectedProjectId)
  const selectedTaskId = useAppStore((s) => s.selectedTaskId)
  const selectTask = useAppStore((s) => s.selectTask)
  const applyCommand = useAppStore((s) => s.applyCommand)

  const project = useMemo(() => {
    if (!document || !customerId || !projectId) return null
    const c = document.customers.find((x) => x.id === customerId)
    return c?.projects.find((p) => p.id === projectId) ?? null
  }, [document, customerId, projectId])

  const task = useMemo(() => {
    if (!project || !selectedTaskId) return null
    return project.tasks.find((t) => t.id === selectedTaskId) ?? null
  }, [project, selectedTaskId])

  const derived = useMemo(() => {
    if (!task || !project) return null
    return deriveTaskState(task, project, todayDateOnly())
  }, [task, project])

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [handoffModal, setHandoffModal] = useState(false)
  const [handoffLane, setHandoffLane] = useState('')
  const [handoffDate, setHandoffDate] = useState(todayDateOnly())
  const [handoffNote, setHandoffNote] = useState('')
  const [noteModal, setNoteModal] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [statusDate, setStatusDate] = useState(todayDateOnly())
  const [startDateEdit, setStartDateEdit] = useState('')

  const createdDate =
    task?.events[0]?.type === 'created' ? task.events[0].date : ''

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setSummary(task.summary)
      setStartDateEdit(createdDate)
    }
  }, [task?.id, task?.title, task?.summary, createdDate])

  const lanes = useMemo(() => {
    if (!project) return []
    const out: { id: string; label: string }[] = []
    for (const g of [...project.groups].sort((a, b) => a.order - b.order)) {
      for (const sg of [...g.subGroups].sort((a, b) => a.order - b.order)) {
        out.push({ id: sg.id, label: `${g.name} / ${sg.name}` })
      }
    }
    return out
  }, [project])

  if (!document) {
    return (
      <div className="panel details">
        <div className="panel-header">Task</div>
        <div className="empty-hint">Loading…</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="panel details">
        <div className="panel-header">Task</div>
        <div className="empty-hint">Select a project.</div>
      </div>
    )
  }

  if (!task || !derived) {
    return (
      <div className="panel details">
        <div className="panel-header">Task</div>
        <div className="empty-hint">Click a task bar on the timeline to view details.</div>
      </div>
    )
  }

  const currentLabel =
    derived.currentLaneId != null
      ? lanes.find((l) => l.id === derived.currentLaneId)?.label ?? derived.currentLaneId
      : '—'

  const saveMeta = async () => {
    if (!customerId || !projectId) return
    await applyCommand({
      type: 'updateTask',
      customerId,
      projectId,
      taskId: task.id,
      title: title.trim() || task.title,
      summary
    })
  }

  const doHandoff = async () => {
    if (!customerId || !projectId || !handoffLane) return
    await applyCommand({
      type: 'handoffTask',
      customerId,
      projectId,
      taskId: task.id,
      toLaneId: handoffLane,
      date: handoffDate,
      note: handoffNote.trim() || undefined
    })
    setHandoffModal(false)
    setHandoffNote('')
  }

  const saveStartDate = async () => {
    if (!task || !customerId || !projectId || !startDateEdit) return
    await applyCommand({
      type: 'setCreatedDate',
      customerId,
      projectId,
      taskId: task.id,
      date: startDateEdit
    })
  }

  const doAddNote = async () => {
    if (!customerId || !projectId || !statusNote.trim()) return
    await applyCommand({
      type: 'addStatusNote',
      customerId,
      projectId,
      taskId: task.id,
      date: statusDate,
      note: statusNote.trim()
    })
    setNoteModal(false)
    setStatusNote('')
  }

  return (
    <div className="panel details">
      <div className="panel-header">Task details</div>
      <div className="details-body">
        <div className="details-section">
          <h3>Title</h3>
          <input
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-strong)' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void saveMeta()}
          />
        </div>
        <div className="details-section">
          <h3>Summary</h3>
          <textarea
            rows={4}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-strong)', resize: 'vertical' }}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onBlur={() => void saveMeta()}
          />
        </div>
        <div className="details-section">
          <h3>Status</h3>
          <div className="meta-grid">
            <div className="meta-item">
              <span>State</span>
              {derived.isOpen ? (
                <strong style={{ color: 'var(--accent)' }}>Open</strong>
              ) : (
                <strong>Closed</strong>
              )}
            </div>
            <div className="meta-item">
              <span>Current owner (lane)</span>
              <strong>{currentLabel}</strong>
            </div>
            <div className="meta-item" style={{ gridColumn: '1 / -1' }}>
              <span>Start date (created)</span>
              <input
                type="date"
                value={startDateEdit}
                onChange={(e) => setStartDateEdit(e.target.value)}
                onBlur={() => void saveStartDate()}
                style={{ marginTop: 4, padding: 6, borderRadius: 6, border: '1px solid var(--border-strong)' }}
              />
            </div>
            <div className="meta-item">
              <span>Last activity</span>
              {derived.lastActivityDate ?? '—'}
            </div>
          </div>
        </div>
        <div className="details-section" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn btn-primary" onClick={() => setHandoffModal(true)}>
            Hand off
          </button>
          <button type="button" className="btn" onClick={() => setNoteModal(true)}>
            Add note
          </button>
          {derived.isOpen ? (
            <button
              type="button"
              className="btn"
              onClick={() =>
                void applyCommand({
                  type: 'closeTask',
                  customerId: customerId!,
                  projectId: projectId!,
                  taskId: task.id,
                  date: todayDateOnly()
                })
              }
            >
              Close
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() =>
                void applyCommand({
                  type: 'reopenTask',
                  customerId: customerId!,
                  projectId: projectId!,
                  taskId: task.id,
                  date: todayDateOnly()
                })
              }
            >
              Re-open
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => selectTask(null)}>
            Clear selection
          </button>
        </div>
        <div className="details-section">
          <h3>History</h3>
          <ul className="history-list">
            {derived.historyLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      {noteModal ? (
        <Modal
          title="Status note"
          onClose={() => setNoteModal(false)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setNoteModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void doAddNote()}>
                Add
              </button>
            </div>
          }
        >
          <div className="modal-field">
            <label>Date</label>
            <input type="date" value={statusDate} onChange={(e) => setStatusDate(e.target.value)} />
          </div>
          <div className="modal-field">
            <label>Note</label>
            <textarea rows={3} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} autoFocus />
          </div>
        </Modal>
      ) : null}

      {handoffModal ? (
        <Modal
          title="Hand off task"
          onClose={() => setHandoffModal(false)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setHandoffModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void doHandoff()}>
                Confirm
              </button>
            </div>
          }
        >
          <div className="modal-field">
            <label>To lane</label>
            <select value={handoffLane} onChange={(e) => setHandoffLane(e.target.value)}>
              <option value="">Select…</option>
              {lanes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-field">
            <label>Date</label>
            <input type="date" value={handoffDate} onChange={(e) => setHandoffDate(e.target.value)} />
          </div>
          <div className="modal-field">
            <label>Note (optional)</label>
            <textarea rows={2} value={handoffNote} onChange={(e) => setHandoffNote(e.target.value)} />
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
