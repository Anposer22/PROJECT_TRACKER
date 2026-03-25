import { useState } from 'react'
import { Modal } from '../common/Modal'
import { useAppStore } from '../../store/useAppStore'
import type { Group, Project } from '@shared/types'

export function LaneTreeColumn({
  customerId,
  project
}: {
  customerId: string
  project: Project
}): JSX.Element {
  const applyCommand = useAppStore((s) => s.applyCommand)
  const [modal, setModal] = useState<
    | null
    | { type: 'addGroup' }
    | { type: 'addSub'; group: Group }
    | { type: 'renameGroup'; g: Group }
    | { type: 'renameSub'; g: Group; subId: string; subName: string }
  >(null)
  const [text, setText] = useState('')
  const [color, setColor] = useState('#2D6C86')

  const groups = [...project.groups].sort((a, b) => a.order - b.order)

  const submit = async () => {
    if (!modal) return
    const name = text.trim()
    if (modal.type === 'addGroup') {
      await applyCommand({
        type: 'addGroup',
        customerId,
        projectId: project.id,
        name,
        color
      })
    } else if (modal.type === 'addSub') {
      if (!name) return
      await applyCommand({
        type: 'addSubGroup',
        customerId,
        projectId: project.id,
        groupId: modal.group.id,
        name
      })
    } else if (modal.type === 'renameGroup') {
      if (!name) return
      await applyCommand({
        type: 'renameGroup',
        customerId,
        projectId: project.id,
        groupId: modal.g.id,
        name
      })
    } else if (modal.type === 'renameSub') {
      if (!name) return
      await applyCommand({
        type: 'renameSubGroup',
        customerId,
        projectId: project.id,
        groupId: modal.g.id,
        subGroupId: modal.subId,
        name
      })
    }
    setModal(null)
  }

  const moveGroup = async (gid: string, dir: -1 | 1) => {
    const idx = groups.findIndex((g) => g.id === gid)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= groups.length) return
    const ids = groups.map((g) => g.id)
    const t = ids[idx]
    ids[idx] = ids[j]
    ids[j] = t
    await applyCommand({ type: 'reorderGroups', customerId, projectId: project.id, groupIds: ids })
  }

  const moveSub = async (g: Group, subId: string, dir: -1 | 1) => {
    const subs = [...g.subGroups].sort((a, b) => a.order - b.order)
    const idx = subs.findIndex((s) => s.id === subId)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= subs.length) return
    const ids = subs.map((s) => s.id)
    const t = ids[idx]
    ids[idx] = ids[j]
    ids[j] = t
    await applyCommand({
      type: 'reorderSubGroups',
      customerId,
      projectId: project.id,
      groupId: g.id,
      subGroupIds: ids
    })
  }

  return (
    <div className="lane-col">
      {groups.length === 0 ? (
        <div className="empty-hint" style={{ fontSize: 12, padding: 16 }}>
          Add a group to start lanes.
        </div>
      ) : null}
      {groups.map((g) => (
        <div key={g.id} className="lane-group">
          <div className="lane-group-title">
            <input
              type="color"
              value={g.color}
              title="Group color"
              onChange={(e) =>
                void applyCommand({
                  type: 'setGroupColor',
                  customerId,
                  projectId: project.id,
                  groupId: g.id,
                  color: e.target.value
                })
              }
              style={{
                width: 22,
                height: 22,
                padding: 0,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'transparent'
              }}
            />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {g.name}
            </span>
            <button
              type="button"
              className="icon-btn"
              title="Move up"
              onClick={() => void moveGroup(g.id, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Move down"
              onClick={() => void moveGroup(g.id, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Rename"
              onClick={() => {
                setText(g.name)
                setModal({ type: 'renameGroup', g })
              }}
            >
              ✎
            </button>
            <button
              type="button"
              className="icon-btn btn-danger"
              title="Delete group"
              onClick={() => {
                if (confirm(`Delete group “${g.name}” and its sub-groups?`)) {
                  void applyCommand({
                    type: 'deleteGroup',
                    customerId,
                    projectId: project.id,
                    groupId: g.id
                  })
                }
              }}
            >
              ×
            </button>
          </div>
          {[...g.subGroups].sort((a, b) => a.order - b.order).map((sg) => (
            <div key={sg.id} className="lane-sub">
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {sg.name}
              </span>
              <button
                type="button"
                className="icon-btn"
                title="Move up"
                onClick={() => void moveSub(g, sg.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Move down"
                onClick={() => void moveSub(g, sg.id, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Rename"
                onClick={() => {
                  setText(sg.name)
                  setModal({ type: 'renameSub', g, subId: sg.id, subName: sg.name })
                }}
              >
                ✎
              </button>
              <button
                type="button"
                className="icon-btn btn-danger"
                title="Delete sub-group"
                onClick={() => {
                  if (confirm(`Delete “${sg.name}”?`)) {
                    void applyCommand({
                      type: 'deleteSubGroup',
                      customerId,
                      projectId: project.id,
                      groupId: g.id,
                      subGroupId: sg.id
                    })
                  }
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginLeft: 16, marginTop: 4, fontSize: 12 }}
            onClick={() => {
              setText('')
              setModal({ type: 'addSub', group: g })
            }}
          >
            + Sub-group
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-primary"
        style={{ margin: 12, width: 'calc(100% - 24px)' }}
        onClick={() => {
          setText('')
          setColor('#2D6C86')
          setModal({ type: 'addGroup' })
        }}
      >
        + Group
      </button>

      {modal ? (
        <Modal
          title={
            modal.type === 'addGroup'
              ? 'New group'
              : modal.type === 'addSub'
                ? 'New sub-group'
                : modal.type === 'renameGroup'
                  ? 'Rename group'
                  : 'Rename sub-group'
          }
          onClose={() => setModal(null)}
          footer={
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void submit()}>
                Save
              </button>
            </div>
          }
        >
          {modal.type === 'addGroup' ? (
            <div className="modal-field">
              <label>Accent color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          ) : null}
          <div className="modal-field">
            <label htmlFor="lane-name">Name</label>
            <input
              id="lane-name"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              autoFocus
            />
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
