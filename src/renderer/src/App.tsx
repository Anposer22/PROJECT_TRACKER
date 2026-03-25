import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { CustomerProjectPanel } from './components/sidebar/CustomerProjectPanel'
import { TimelinePanel } from './components/timeline/TimelinePanel'
import { TaskDetailsPanel } from './components/details/TaskDetailsPanel'
import { Modal } from './components/common/Modal'
import { todayDateOnly } from '@shared/date'

export default function App(): JSX.Element {
  const filePath = useAppStore((s) => s.filePath)
  const fileError = useAppStore((s) => s.fileError)
  const commandError = useAppStore((s) => s.commandError)
  const setCommandError = useAppStore((s) => s.setCommandError)
  const document = useAppStore((s) => s.document)
  const customerId = useAppStore((s) => s.selectedCustomerId)
  const projectId = useAppStore((s) => s.selectedProjectId)
  const applyCommand = useAppStore((s) => s.applyCommand)
  const selectTask = useAppStore((s) => s.selectTask)

  const [taskModal, setTaskModal] = useState(false)
  const [tTitle, setTTitle] = useState('')
  const [tSummary, setTSummary] = useState('')
  const [tLane, setTLane] = useState('')
  const [tStart, setTStart] = useState(todayDateOnly())

  useEffect(() => {
    const unsub = window.tracker.onDocumentUpdate((p) => {
      useAppStore.getState().setFromPayload(p)
    })
    void window.tracker.getInitial().then((p) => {
      useAppStore.getState().setFromPayload(p)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectTask(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectTask])

  const lanes =
    document && customerId && projectId
      ? (() => {
          const c = document.customers.find((x) => x.id === customerId)
          const p = c?.projects.find((x) => x.id === projectId)
          if (!p) return []
          const out: { id: string; label: string }[] = []
          for (const g of [...p.groups].sort((a, b) => a.order - b.order)) {
            for (const sg of [...g.subGroups].sort((a, b) => a.order - b.order)) {
              out.push({ id: sg.id, label: `${g.name} / ${sg.name}` })
            }
          }
          return out
        })()
      : []

  const createTask = async () => {
    if (!customerId || !projectId || !tLane || !tTitle.trim()) return
    await applyCommand({
      type: 'createTask',
      customerId,
      projectId,
      title: tTitle.trim(),
      summary: tSummary.trim(),
      toLaneId: tLane,
      startDate: tStart
    })
    setTaskModal(false)
    setTTitle('')
    setTSummary('')
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1>Visual Progress Tracker</h1>
        <div className="top-bar-actions">
          {filePath ? <span className="file-path" title={filePath}>{filePath}</span> : null}
          <button type="button" className="btn" onClick={() => void window.tracker.reveal()}>
            Reveal file
          </button>
          <button type="button" className="btn" onClick={() => void window.tracker.open()}>
            Open in editor
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!customerId || !projectId || lanes.length === 0}
            onClick={() => {
              setTStart(todayDateOnly())
              setTLane(lanes[0]?.id ?? '')
              setTaskModal(true)
            }}
          >
            New task
          </button>
        </div>
      </header>
      {fileError ? <div className="banner-error">Data file: {fileError}</div> : null}
      {commandError ? (
        <div className="banner-cmd">
          {commandError}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginLeft: 12 }}
            onClick={() => setCommandError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <div className="main-layout">
        <CustomerProjectPanel />
        <TimelinePanel />
        <TaskDetailsPanel />
      </div>

      {taskModal ? (
        <Modal
          title="New task"
          onClose={() => setTaskModal(false)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setTaskModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void createTask()}>
                Create
              </button>
            </div>
          }
        >
          <div className="modal-field">
            <label>Title</label>
            <input value={tTitle} onChange={(e) => setTTitle(e.target.value)} autoFocus />
          </div>
          <div className="modal-field">
            <label>Summary</label>
            <textarea rows={3} value={tSummary} onChange={(e) => setTSummary(e.target.value)} />
          </div>
          <div className="modal-field">
            <label>Lane</label>
            <select value={tLane} onChange={(e) => setTLane(e.target.value)}>
              {lanes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-field">
            <label>Start date</label>
            <input type="date" value={tStart} onChange={(e) => setTStart(e.target.value)} />
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
