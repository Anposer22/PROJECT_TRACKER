import { newId } from './ids'
import { collectLaneIds, normalizeDocument } from './normalize'
import type { Command, Customer, Group, Project, Task, TaskEvent, TrackerDocument } from './types'

export type ApplyResult = { ok: true; document: TrackerDocument } | { ok: false; error: string }

function nowIso(): string {
  return new Date().toISOString()
}

function touchMeta(doc: TrackerDocument): TrackerDocument {
  return {
    ...doc,
    meta: { ...doc.meta, updatedAt: nowIso() }
  }
}

function findProject(
  doc: TrackerDocument,
  customerId: string,
  projectId: string
): { customer: Customer; project: Project; cIdx: number; pIdx: number } | null {
  const cIdx = doc.customers.findIndex((c) => c.id === customerId)
  if (cIdx < 0) return null
  const customer = doc.customers[cIdx]
  const pIdx = customer.projects.findIndex((p) => p.id === projectId)
  if (pIdx < 0) return null
  return { customer, project: customer.projects[pIdx], cIdx, pIdx }
}

export function applyCommand(doc: TrackerDocument, cmd: Command): ApplyResult {
  let next: TrackerDocument = structuredClone(doc)

  const fail = (error: string): ApplyResult => ({ ok: false, error })

  switch (cmd.type) {
    case 'addCustomer': {
      const name = cmd.name.trim()
      if (!name) return fail('Customer name required')
      const maxOrder = next.customers.reduce((m, c) => Math.max(m, c.order), -1)
      next.customers.push({
        id: newId('cust'),
        name,
        order: maxOrder + 1,
        projects: []
      })
      break
    }
    case 'renameCustomer': {
      const c = next.customers.find((x) => x.id === cmd.customerId)
      if (!c) return fail('Customer not found')
      const name = cmd.name.trim()
      if (!name) return fail('Name required')
      c.name = name
      break
    }
    case 'deleteCustomer': {
      next.customers = next.customers.filter((c) => c.id !== cmd.customerId)
      break
    }
    case 'reorderCustomers': {
      const map = new Map(next.customers.map((c) => [c.id, c]))
      const ordered: Customer[] = []
      let o = 0
      for (const id of cmd.customerIds) {
        const c = map.get(id)
        if (c) {
          ordered.push({ ...c, order: o++ })
          map.delete(id)
        }
      }
      for (const c of map.values()) ordered.push({ ...c, order: o++ })
      next.customers = ordered
      break
    }
    case 'addProject': {
      const found = next.customers.find((c) => c.id === cmd.customerId)
      if (!found) return fail('Customer not found')
      const name = cmd.name.trim()
      if (!name) return fail('Project name required')
      const maxOrder = found.projects.reduce((m, p) => Math.max(m, p.order), -1)
      found.projects.push({
        id: newId('proj'),
        name,
        order: maxOrder + 1,
        groups: [],
        tasks: []
      })
      break
    }
    case 'renameProject': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const name = cmd.name.trim()
      if (!name) return fail('Name required')
      found.project.name = name
      break
    }
    case 'deleteProject': {
      const c = next.customers.find((x) => x.id === cmd.customerId)
      if (!c) return fail('Customer not found')
      c.projects = c.projects.filter((p) => p.id !== cmd.projectId)
      break
    }
    case 'reorderProjects': {
      const c = next.customers.find((x) => x.id === cmd.customerId)
      if (!c) return fail('Customer not found')
      const map = new Map(c.projects.map((p) => [p.id, p]))
      const ordered: Project[] = []
      let o = 0
      for (const id of cmd.projectIds) {
        const p = map.get(id)
        if (p) {
          ordered.push({ ...p, order: o++ })
          map.delete(id)
        }
      }
      for (const p of map.values()) ordered.push({ ...p, order: o++ })
      c.projects = ordered
      break
    }
    case 'addGroup': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const name = cmd.name.trim()
      if (!name) return fail('Group name required')
      const color = cmd.color.match(/^#[0-9A-Fa-f]{6}$/) ? cmd.color : '#2D6C86'
      const maxOrder = found.project.groups.reduce((m, g) => Math.max(m, g.order), -1)
      const gid = newId('grp')
      found.project.groups.push({
        id: gid,
        name,
        color,
        order: maxOrder + 1,
        subGroups: [
          {
            id: newId('sg'),
            name: 'Main',
            order: 0
          }
        ]
      })
      break
    }
    case 'addSubGroup': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const g = found.project.groups.find((x) => x.id === cmd.groupId)
      if (!g) return fail('Group not found')
      const name = cmd.name.trim()
      if (!name) return fail('Sub-group name required')
      const maxOrder = g.subGroups.reduce((m, sg) => Math.max(m, sg.order), -1)
      g.subGroups.push({ id: newId('sg'), name, order: maxOrder + 1 })
      break
    }
    case 'renameGroup': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const g = found.project.groups.find((x) => x.id === cmd.groupId)
      if (!g) return fail('Group not found')
      const name = cmd.name.trim()
      if (!name) return fail('Name required')
      g.name = name
      break
    }
    case 'renameSubGroup': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const g = found.project.groups.find((x) => x.id === cmd.groupId)
      if (!g) return fail('Group not found')
      const sg = g.subGroups.find((x) => x.id === cmd.subGroupId)
      if (!sg) return fail('Sub-group not found')
      const name = cmd.name.trim()
      if (!name) return fail('Name required')
      sg.name = name
      break
    }
    case 'deleteGroup': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      found.project.groups = found.project.groups.filter((g) => g.id !== cmd.groupId)
      break
    }
    case 'deleteSubGroup': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const g = found.project.groups.find((x) => x.id === cmd.groupId)
      if (!g) return fail('Group not found')
      if (g.subGroups.length <= 1) return fail('Cannot delete the last sub-group')
      g.subGroups = g.subGroups.filter((sg) => sg.id !== cmd.subGroupId)
      break
    }
    case 'reorderGroups': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const map = new Map(found.project.groups.map((g) => [g.id, g]))
      const ordered: Group[] = []
      let o = 0
      for (const id of cmd.groupIds) {
        const g = map.get(id)
        if (g) {
          ordered.push({ ...g, order: o++ })
          map.delete(id)
        }
      }
      for (const g of map.values()) ordered.push({ ...g, order: o++ })
      found.project.groups = ordered
      break
    }
    case 'reorderSubGroups': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const g = found.project.groups.find((x) => x.id === cmd.groupId)
      if (!g) return fail('Group not found')
      const map = new Map(g.subGroups.map((sg) => [sg.id, sg]))
      const ordered: typeof g.subGroups = []
      let o = 0
      for (const id of cmd.subGroupIds) {
        const sg = map.get(id)
        if (sg) {
          ordered.push({ ...sg, order: o++ })
          map.delete(id)
        }
      }
      for (const sg of map.values()) ordered.push({ ...sg, order: o++ })
      g.subGroups = ordered
      break
    }
    case 'setGroupColor': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const g = found.project.groups.find((x) => x.id === cmd.groupId)
      if (!g) return fail('Group not found')
      if (!cmd.color.match(/^#[0-9A-Fa-f]{6}$/)) return fail('Invalid color')
      g.color = cmd.color
      break
    }
    case 'createTask': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const lanes = collectLaneIds(found.project)
      if (!lanes.has(cmd.toLaneId)) return fail('Invalid lane')
      const title = cmd.title.trim()
      if (!title) return fail('Task title required')
      const ev: TaskEvent = {
        id: newId('evt'),
        type: 'created',
        date: cmd.startDate,
        toLaneId: cmd.toLaneId
      }
      found.project.tasks.push({
        id: newId('task'),
        title,
        summary: cmd.summary.trim(),
        events: [ev]
      })
      break
    }
    case 'updateTask': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const t = found.project.tasks.find((x) => x.id === cmd.taskId)
      if (!t) return fail('Task not found')
      if (cmd.title !== undefined) {
        const title = cmd.title.trim()
        if (!title) return fail('Title required')
        t.title = title
      }
      if (cmd.summary !== undefined) t.summary = cmd.summary
      break
    }
    case 'handoffTask': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const lanes = collectLaneIds(found.project)
      if (!lanes.has(cmd.toLaneId)) return fail('Invalid target lane')
      const t = found.project.tasks.find((x) => x.id === cmd.taskId)
      if (!t) return fail('Task not found')
      const st = taskLifecycleState(t)
      if (st.closed) return fail('Task is closed')
      if (!st.currentLane) return fail('No current lane')
      if (st.currentLane === cmd.toLaneId) return fail('Already on that lane')
      const ev: TaskEvent = {
        id: newId('evt'),
        type: 'handoff',
        date: cmd.date,
        fromLaneId: st.currentLane,
        toLaneId: cmd.toLaneId,
        note: cmd.note
      }
      t.events.push(ev)
      break
    }
    case 'closeTask': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const t = found.project.tasks.find((x) => x.id === cmd.taskId)
      if (!t) return fail('Task not found')
      const st = taskLifecycleState(t)
      if (st.closed) return fail('Already closed')
      t.events.push({ id: newId('evt'), type: 'closed', date: cmd.date })
      break
    }
    case 'reopenTask': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const t = found.project.tasks.find((x) => x.id === cmd.taskId)
      if (!t) return fail('Task not found')
      const st = taskLifecycleState(t)
      if (!st.closed) return fail('Task is not closed')
      t.events.push({ id: newId('evt'), type: 'reopened', date: cmd.date })
      break
    }
    case 'addStatusNote': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const t = found.project.tasks.find((x) => x.id === cmd.taskId)
      if (!t) return fail('Task not found')
      const note = cmd.note.trim()
      if (!note) return fail('Note required')
      t.events.push({
        id: newId('evt'),
        type: 'status-note',
        date: cmd.date,
        note
      })
      break
    }
    case 'setCreatedDate': {
      const found = findProject(next, cmd.customerId, cmd.projectId)
      if (!found) return fail('Project not found')
      const t = found.project.tasks.find((x) => x.id === cmd.taskId)
      if (!t) return fail('Task not found')
      const first = t.events[0]
      if (!first || first.type !== 'created') return fail('Invalid task events')
      first.date = cmd.date
      break
    }
    default:
      return fail('Unknown command')
  }

  next = touchMeta(normalizeDocument(next))
  return { ok: true, document: next }
}

function taskLifecycleState(t: Task): { closed: boolean; currentLane: string | null } {
  let currentLane: string | null = null
  let closed = false
  for (const e of t.events) {
    if (e.type === 'created') currentLane = e.toLaneId
    if (e.type === 'handoff') currentLane = e.toLaneId
    if (e.type === 'closed') closed = true
    if (e.type === 'reopened') closed = false
  }
  return { closed, currentLane }
}
