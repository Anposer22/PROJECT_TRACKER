import { create } from 'zustand'
import type { Command, TrackerDocument } from '@shared/types'

export interface AppState {
  document: TrackerDocument | null
  filePath: string | null
  fileError: string | null
  selectedCustomerId: string | null
  selectedProjectId: string | null
  selectedTaskId: string | null
  commandError: string | null
  setFromPayload: (p: {
    document: TrackerDocument
    filePath: string
    fileError: string | null
  }) => void
  setSelection: (c: string | null, p: string | null) => void
  selectTask: (id: string | null) => void
  setCommandError: (e: string | null) => void
  applyCommand: (cmd: Command) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  document: null,
  filePath: null,
  fileError: null,
  selectedCustomerId: null,
  selectedProjectId: null,
  selectedTaskId: null,
  commandError: null,

  setFromPayload: (p) => {
    const doc = p.document
    let { selectedCustomerId, selectedProjectId } = get()
    if (!selectedCustomerId || !doc.customers.some((c) => c.id === selectedCustomerId)) {
      selectedCustomerId = doc.customers[0]?.id ?? null
    }
    const cust = doc.customers.find((c) => c.id === selectedCustomerId)
    if (!selectedProjectId || !cust?.projects.some((pr) => pr.id === selectedProjectId)) {
      selectedProjectId = cust?.projects[0]?.id ?? null
    }
    const proj = cust?.projects.find((pr) => pr.id === selectedProjectId)
    let { selectedTaskId } = get()
    if (selectedTaskId && (!proj || !proj.tasks.some((t) => t.id === selectedTaskId))) {
      selectedTaskId = null
    }
    set({
      document: doc,
      filePath: p.filePath,
      fileError: p.fileError,
      selectedCustomerId,
      selectedProjectId,
      selectedTaskId
    })
  },

  setSelection: (customerId, projectId) =>
    set({ selectedCustomerId: customerId, selectedProjectId: projectId, selectedTaskId: null }),

  selectTask: (id) => set({ selectedTaskId: id }),

  setCommandError: (e) => set({ commandError: e }),

  applyCommand: async (cmd) => {
    const res = await window.tracker.applyCommand(cmd)
    if (res.fileError) {
      set({ commandError: res.fileError })
      return
    }
    get().setFromPayload({
      document: res.document,
      filePath: res.filePath,
      fileError: res.fileError
    })
    set({ commandError: null })
  }
}))
