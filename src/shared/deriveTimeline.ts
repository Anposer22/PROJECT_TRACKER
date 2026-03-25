import { compareDateOnly, dateOnlyToOrdinal, maxDateOnly, todayDateOnly } from './date'
import type { Project, Task, TimelineConnector, TimelineModel, TimelineSegment } from './types'

export function buildLaneList(project: Project): {
  laneId: string
  groupId: string
  label: string
  color: string
  rowIndex: number
}[] {
  const out: { laneId: string; groupId: string; label: string; color: string; rowIndex: number }[] = []
  const sortedGroups = [...project.groups].sort((a, b) => a.order - b.order)
  let row = 0
  for (const g of sortedGroups) {
    const subs = [...g.subGroups].sort((a, b) => a.order - b.order)
    for (const sg of subs) {
      out.push({
        laneId: sg.id,
        groupId: g.id,
        label: `${g.name} · ${sg.name}`,
        color: g.color,
        rowIndex: row++
      })
    }
  }
  return out
}

function laneColor(project: Project, laneId: string): string {
  for (const g of project.groups) {
    for (const sg of g.subGroups) {
      if (sg.id === laneId) return g.color
    }
  }
  return '#888888'
}

export function deriveTaskSegments(
  task: Task,
  project: Project,
  today: string
): { segments: TimelineSegment[]; connectors: TimelineConnector[] } {
  const segments: TimelineSegment[] = []
  const connectors: TimelineConnector[] = []
  const color = (laneId: string) => laneColor(project, laneId)

  let currentLane: string | null = null
  let segmentStart: string | null = null
  let closed = false

  const pushSeg = (laneId: string, start: string, end: string, ongoing: boolean) => {
    if (compareDateOnly(start, end) > 0) return
    segments.push({
      taskId: task.id,
      laneId,
      startOrdinal: dateOnlyToOrdinal(start),
      endOrdinal: dateOnlyToOrdinal(end),
      color: color(laneId),
      isOngoing: ongoing
    })
  }

  for (const e of task.events) {
    if (e.type === 'created') {
      currentLane = e.toLaneId
      segmentStart = e.date
      continue
    }
    if (e.type === 'status-note') continue

    if (e.type === 'handoff') {
      if (closed || !currentLane || !segmentStart) continue
      pushSeg(currentLane, segmentStart, e.date, false)
      connectors.push({
        taskId: task.id,
        dateOrdinal: dateOnlyToOrdinal(e.date),
        fromLaneId: e.fromLaneId,
        toLaneId: e.toLaneId,
        label: task.title
      })
      currentLane = e.toLaneId
      segmentStart = e.date
      continue
    }

    if (e.type === 'closed') {
      if (!currentLane || !segmentStart) continue
      pushSeg(currentLane, segmentStart, e.date, false)
      closed = true
      segmentStart = null
      continue
    }

    if (e.type === 'reopened') {
      closed = false
      segmentStart = e.date
      continue
    }
  }

  if (!closed && currentLane && segmentStart) {
    const end = maxDateOnly(segmentStart, today)
    pushSeg(currentLane, segmentStart, end, true)
  }

  return { segments, connectors }
}

export function buildTimelineModel(project: Project, today?: string): TimelineModel {
  const t = today ?? todayDateOnly()
  const lanes = buildLaneList(project)
  const segments: TimelineSegment[] = []
  const connectors: TimelineConnector[] = []

  for (const task of project.tasks) {
    if (task.events.length === 0) continue
    const { segments: segs, connectors: conns } = deriveTaskSegments(task, project, t)
    segments.push(...segs)
    connectors.push(...conns)
  }

  let minOrd = dateOnlyToOrdinal(t)
  let maxOrd = dateOnlyToOrdinal(t)
  for (const s of segments) {
    minOrd = Math.min(minOrd, s.startOrdinal)
    maxOrd = Math.max(maxOrd, s.endOrdinal)
  }
  if (segments.length === 0) {
    minOrd = dateOnlyToOrdinal(t) - 7
    maxOrd = dateOnlyToOrdinal(t) + 21
  } else {
    minOrd -= 2
    maxOrd += 2
  }

  return {
    minOrdinal: minOrd,
    maxOrdinal: maxOrd,
    todayOrdinal: dateOnlyToOrdinal(t),
    lanes,
    segments,
    connectors
  }
}

export function deriveTaskState(task: Task, project: Project, today: string): {
  isOpen: boolean
  currentLaneId: string | null
  startDate: string | null
  lastActivityDate: string | null
  color: string
  historyLines: string[]
} {
  let currentLane: string | null = null
  let closed = false
  let startDate: string | null = null
  let lastActivity: string | null = null
  const lines: string[] = []

  const note = (s: string) => lines.push(s)

  for (const e of task.events) {
    lastActivity = e.date
    if (e.type === 'created') {
      currentLane = e.toLaneId
      startDate = e.date
      note(`${e.date}: Created → ${laneLabel(project, e.toLaneId)}`)
      continue
    }
    if (e.type === 'handoff') {
      currentLane = e.toLaneId
      note(
        `${e.date}: Handoff ${laneLabel(project, e.fromLaneId)} → ${laneLabel(project, e.toLaneId)}${e.note ? ` — ${e.note}` : ''}`
      )
      continue
    }
    if (e.type === 'closed') {
      closed = true
      note(`${e.date}: Closed`)
      continue
    }
    if (e.type === 'reopened') {
      closed = false
      note(`${e.date}: Re-opened`)
      continue
    }
    if (e.type === 'status-note') {
      note(`${e.date}: ${e.note}`)
    }
  }

  const color = currentLane ? laneColor(project, currentLane) : '#888888'
  return {
    isOpen: !closed,
    currentLaneId: currentLane,
    startDate,
    lastActivityDate: lastActivity,
    color,
    historyLines: lines
  }
}

function laneLabel(project: Project, laneId: string): string {
  for (const g of project.groups) {
    for (const sg of g.subGroups) {
      if (sg.id === laneId) return `${g.name} / ${sg.name}`
    }
  }
  return laneId
}
