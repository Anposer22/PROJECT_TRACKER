import { useState } from 'react'
import { Modal } from '../common/Modal'
import { useAppStore } from '../../store/useAppStore'
import type { Customer, Project } from '@shared/types'

export function CustomerProjectPanel(): JSX.Element {
  const document = useAppStore((s) => s.document)
  const selectedCustomerId = useAppStore((s) => s.selectedCustomerId)
  const selectedProjectId = useAppStore((s) => s.selectedProjectId)
  const setSelection = useAppStore((s) => s.setSelection)
  const applyCommand = useAppStore((s) => s.applyCommand)

  const [modal, setModal] = useState<
    | null
    | { type: 'addCustomer' }
    | { type: 'renameCustomer'; c: Customer }
    | { type: 'addProject'; customerId: string }
    | { type: 'renameProject'; c: Customer; p: Project }
  >(null)
  const [nameInput, setNameInput] = useState('')

  if (!document) {
    return (
      <div className="panel sidebar">
        <div className="panel-header">Navigate</div>
        <div className="empty-hint">Loading…</div>
      </div>
    )
  }

  const customers = [...document.customers].sort((a, b) => a.order - b.order)

  const openAddCustomer = () => {
    setNameInput('')
    setModal({ type: 'addCustomer' })
  }

  const submitModal = async () => {
    const name = nameInput.trim()
    if (!name) return
    if (!modal) return
    if (modal.type === 'addCustomer') {
      await applyCommand({ type: 'addCustomer', name })
    } else if (modal.type === 'renameCustomer') {
      await applyCommand({ type: 'renameCustomer', customerId: modal.c.id, name })
    } else if (modal.type === 'addProject') {
      await applyCommand({ type: 'addProject', customerId: modal.customerId, name })
    } else if (modal.type === 'renameProject') {
      await applyCommand({
        type: 'renameProject',
        customerId: modal.c.id,
        projectId: modal.p.id,
        name
      })
    }
    setModal(null)
  }

  const moveCustomer = async (id: string, dir: -1 | 1) => {
    const idx = customers.findIndex((c) => c.id === id)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= customers.length) return
    const ids = customers.map((c) => c.id)
    const t = ids[idx]
    ids[idx] = ids[j]
    ids[j] = t
    await applyCommand({ type: 'reorderCustomers', customerIds: ids })
  }

  const moveProject = async (customerId: string, projectId: string, dir: -1 | 1) => {
    const c = customers.find((x) => x.id === customerId)
    if (!c) return
    const projects = [...c.projects].sort((a, b) => a.order - b.order)
    const idx = projects.findIndex((p) => p.id === projectId)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= projects.length) return
    const ids = projects.map((p) => p.id)
    const t = ids[idx]
    ids[idx] = ids[j]
    ids[j] = t
    await applyCommand({ type: 'reorderProjects', customerId, projectIds: ids })
  }

  return (
    <div className="panel sidebar">
      <div className="panel-header">Customers &amp; projects</div>
      <div className="list-section">
        <div className="list-label">Customers</div>
        {customers.length === 0 ? (
          <div className="empty-hint" style={{ padding: '12px 8px' }}>
            No customers yet.
          </div>
        ) : null}
        {customers.map((c) => (
          <div key={c.id}>
            <div
              className={`row ${c.id === selectedCustomerId ? 'active' : ''}`}
              onClick={() => setSelection(c.id, c.projects[0]?.id ?? null)}
            >
              <span className="row-name">{c.name}</span>
              <span className="row-actions">
                <button
                  type="button"
                  className="icon-btn"
                  title="Move up"
                  onClick={(e) => {
                    e.stopPropagation()
                    void moveCustomer(c.id, -1)
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Move down"
                  onClick={(e) => {
                    e.stopPropagation()
                    void moveCustomer(c.id, 1)
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation()
                    setNameInput(c.name)
                    setModal({ type: 'renameCustomer', c })
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="icon-btn btn-danger"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete customer “${c.name}” and all projects?`)) {
                      void applyCommand({ type: 'deleteCustomer', customerId: c.id })
                    }
                  }}
                >
                  ×
                </button>
              </span>
            </div>
            {c.id === selectedCustomerId ? (
              <>
                <div className="list-label">Projects</div>
                {[...c.projects].sort((a, b) => a.order - b.order).map((p) => (
                  <div
                    key={p.id}
                    className={`row ${p.id === selectedProjectId ? 'active' : ''}`}
                    style={{ marginLeft: 8 }}
                    onClick={() => setSelection(c.id, p.id)}
                  >
                    <span className="row-name">{p.name}</span>
                    <span className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Move up"
                        onClick={(e) => {
                          e.stopPropagation()
                          void moveProject(c.id, p.id, -1)
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Move down"
                        onClick={(e) => {
                          e.stopPropagation()
                          void moveProject(c.id, p.id, 1)
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Rename"
                        onClick={(e) => {
                          e.stopPropagation()
                          setNameInput(p.name)
                          setModal({ type: 'renameProject', c, p })
                        }}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="icon-btn btn-danger"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`Delete project “${p.name}”?`)) {
                            void applyCommand({
                              type: 'deleteProject',
                              customerId: c.id,
                              projectId: p.id
                            })
                          }
                        }}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ margin: '6px 8px', width: 'calc(100% - 16px)' }}
                  onClick={() => {
                    setNameInput('')
                    setModal({ type: 'addProject', customerId: c.id })
                  }}
                >
                  + Add project
                </button>
              </>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-primary"
          style={{ margin: '10px 8px', width: 'calc(100% - 16px)' }}
          onClick={openAddCustomer}
        >
          + Add customer
        </button>
      </div>

      {modal ? (
        <Modal
          title={
            modal.type === 'addCustomer'
              ? 'New customer'
              : modal.type === 'renameCustomer'
                ? 'Rename customer'
                : modal.type === 'addProject'
                  ? 'New project'
                  : 'Rename project'
          }
          onClose={() => setModal(null)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void submitModal()}>
                Save
              </button>
            </div>
          }
        >
          <div className="modal-field">
            <label htmlFor="modal-name">Name</label>
            <input
              id="modal-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submitModal()}
              autoFocus
            />
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
