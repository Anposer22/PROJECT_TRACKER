/** Plain document stored in progress-tracker.txt (JSON) */

export type TaskEventType =
  | 'created'
  | 'handoff'
  | 'closed'
  | 'reopened'
  | 'status-note'

export interface TaskEventCreated {
  id: string
  type: 'created'
  date: string
  toLaneId: string
}

export interface TaskEventHandoff {
  id: string
  type: 'handoff'
  date: string
  fromLaneId: string
  toLaneId: string
  note?: string
}

export interface TaskEventClosed {
  id: string
  type: 'closed'
  date: string
}

export interface TaskEventReopened {
  id: string
  type: 'reopened'
  date: string
}

export interface TaskEventStatusNote {
  id: string
  type: 'status-note'
  date: string
  note: string
}

export type TaskEvent =
  | TaskEventCreated
  | TaskEventHandoff
  | TaskEventClosed
  | TaskEventReopened
  | TaskEventStatusNote

export interface Task {
  id: string
  title: string
  summary: string
  events: TaskEvent[]
}

export interface SubGroup {
  id: string
  name: string
  order: number
}

export interface Group {
  id: string
  name: string
  color: string
  order: number
  subGroups: SubGroup[]
}

export interface Project {
  id: string
  name: string
  order: number
  groups: Group[]
  tasks: Task[]
}

export interface Customer {
  id: string
  name: string
  order: number
  projects: Project[]
}

export interface DocumentMeta {
  documentTitle: string
  updatedAt: string
}

export interface TrackerDocument {
  schemaVersion: number
  meta: DocumentMeta
  customers: Customer[]
}

/** IPC command payloads (main applies to latest doc) */
export type Command =
  | { type: 'addCustomer'; name: string }
  | { type: 'renameCustomer'; customerId: string; name: string }
  | { type: 'deleteCustomer'; customerId: string }
  | { type: 'reorderCustomers'; customerIds: string[] }
  | { type: 'addProject'; customerId: string; name: string }
  | { type: 'renameProject'; customerId: string; projectId: string; name: string }
  | { type: 'deleteProject'; customerId: string; projectId: string }
  | { type: 'reorderProjects'; customerId: string; projectIds: string[] }
  | { type: 'addGroup'; customerId: string; projectId: string; name: string; color: string }
  | { type: 'addSubGroup'; customerId: string; projectId: string; groupId: string; name: string }
  | { type: 'renameGroup'; customerId: string; projectId: string; groupId: string; name: string }
  | { type: 'renameSubGroup'; customerId: string; projectId: string; groupId: string; subGroupId: string; name: string }
  | { type: 'deleteGroup'; customerId: string; projectId: string; groupId: string }
  | { type: 'deleteSubGroup'; customerId: string; projectId: string; groupId: string; subGroupId: string }
  | { type: 'reorderGroups'; customerId: string; projectId: string; groupIds: string[] }
  | { type: 'reorderSubGroups'; customerId: string; projectId: string; groupId: string; subGroupIds: string[] }
  | { type: 'setGroupColor'; customerId: string; projectId: string; groupId: string; color: string }
  | {
      type: 'createTask'
      customerId: string
      projectId: string
      title: string
      summary: string
      toLaneId: string
      startDate: string
    }
  | {
      type: 'updateTask'
      customerId: string
      projectId: string
      taskId: string
      title?: string
      summary?: string
    }
  | {
      type: 'handoffTask'
      customerId: string
      projectId: string
      taskId: string
      toLaneId: string
      date: string
      note?: string
    }
  | { type: 'closeTask'; customerId: string; projectId: string; taskId: string; date: string }
  | { type: 'reopenTask'; customerId: string; projectId: string; taskId: string; date: string }
  | {
      type: 'addStatusNote'
      customerId: string
      projectId: string
      taskId: string
      date: string
      note: string
    }
  | {
      type: 'setCreatedDate'
      customerId: string
      projectId: string
      taskId: string
      date: string
    }

export interface LaneRef {
  groupId: string
  subGroupId: string
  laneId: string
  groupName: string
  subGroupName: string
  color: string
}

export interface DerivedTaskState {
  taskId: string
  title: string
  summary: string
  isOpen: boolean
  currentLaneId: string | null
  startDate: string | null
  lastActivityDate: string | null
  color: string
  historyLines: string[]
}

export interface TimelineSegment {
  taskId: string
  laneId: string
  startOrdinal: number
  endOrdinal: number
  color: string
  isOngoing: boolean
}

export interface TimelineConnector {
  taskId: string
  dateOrdinal: number
  fromLaneId: string
  toLaneId: string
  label?: string
}

export interface TimelineModel {
  minOrdinal: number
  maxOrdinal: number
  todayOrdinal: number
  lanes: { laneId: string; groupId: string; label: string; color: string; rowIndex: number }[]
  segments: TimelineSegment[]
  connectors: TimelineConnector[]
}
