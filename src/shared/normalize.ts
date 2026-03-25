import type { Customer, Group, Project, SubGroup, Task, TrackerDocument } from './types'

function sortByOrder<T extends { order: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.order - b.order)
}

export function normalizeDocument(doc: TrackerDocument): TrackerDocument {
  const customers = sortByOrder(doc.customers).map((c) => ({
    ...c,
    projects: sortByOrder(c.projects).map((p) => normalizeProject(p))
  }))
  return {
    schemaVersion: 1,
    meta: { ...doc.meta },
    customers
  }
}

function normalizeProject(p: Project): Project {
  return {
    ...p,
    groups: sortByOrder(p.groups).map((g) => ({
      ...g,
      subGroups: sortByOrder(g.subGroups)
    })),
    tasks: p.tasks.map((t) => ({ ...t, events: [...t.events] }))
  }
}

export function canonicalStringify(doc: TrackerDocument): string {
  const normalized = normalizeDocument(doc)
  return JSON.stringify(normalized, null, 2) + '\n'
}

/** Collect all lane IDs (sub-group ids) per project */
export function collectLaneIds(project: Project): Set<string> {
  const set = new Set<string>()
  for (const g of project.groups) {
    for (const sg of g.subGroups) {
      set.add(sg.id)
    }
  }
  return set
}

function validateTaskEvents(task: Task, lanes: Set<string>): string | null {
  const evIds = new Set<string>()
  for (const e of task.events) {
    if (evIds.has(e.id)) return `Duplicate event id ${e.id} on task ${task.id}`
    evIds.add(e.id)
  }
  if (task.events.length === 0) return `Task ${task.id} has no events`
  const first = task.events[0]
  if (first.type !== 'created') return `Task ${task.id} must start with a created event`
  if (!lanes.has(first.toLaneId)) return `Task ${task.id}: unknown lane ${first.toLaneId}`
  let currentLane = first.toLaneId
  let closed = false
  for (let i = 0; i < task.events.length; i++) {
    const e = task.events[i]
    if (e.type === 'created') {
      if (i !== 0) return `Task ${task.id}: created only allowed as first event`
      continue
    }
    if (e.type === 'handoff') {
      if (closed) return `Task ${task.id}: handoff after close`
      if (e.fromLaneId !== currentLane) return `Task ${task.id}: handoff fromLane mismatch (expected ${currentLane})`
      if (!lanes.has(e.toLaneId)) return `Task ${task.id}: unknown toLane ${e.toLaneId}`
      currentLane = e.toLaneId
      continue
    }
    if (e.type === 'closed') {
      if (closed) return `Task ${task.id}: duplicate closed`
      closed = true
      continue
    }
    if (e.type === 'reopened') {
      if (!closed) return `Task ${task.id}: reopened while open`
      closed = false
      continue
    }
    if (e.type === 'status-note') {
      continue
    }
  }
  return null
}

export function validateDocumentInvariants(doc: TrackerDocument): string | null {
  const customerIds = new Set<string>()
  for (const c of doc.customers) {
    if (customerIds.has(c.id)) return `Duplicate customer id: ${c.id}`
    customerIds.add(c.id)
    const projectIds = new Set<string>()
    for (const p of c.projects) {
      if (projectIds.has(p.id)) return `Duplicate project id: ${p.id} under customer ${c.id}`
      projectIds.add(p.id)
      const groupIds = new Set<string>()
      const subIds = new Set<string>()
      for (const g of p.groups) {
        if (groupIds.has(g.id)) return `Duplicate group id: ${g.id}`
        groupIds.add(g.id)
        for (const sg of g.subGroups) {
          if (subIds.has(sg.id)) return `Duplicate sub-group id: ${sg.id}`
          subIds.add(sg.id)
        }
      }
      const lanes = collectLaneIds(p)
      const taskIds = new Set<string>()
      for (const t of p.tasks) {
        if (taskIds.has(t.id)) return `Duplicate task id: ${t.id}`
        taskIds.add(t.id)
        const evErr = validateTaskEvents(t, lanes)
        if (evErr) return evErr
      }
    }
  }
  return null
}
