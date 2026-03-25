import type { TrackerDocument } from './types'

export const DEFAULT_DOCUMENT: TrackerDocument = {
  schemaVersion: 1,
  meta: {
    documentTitle: 'Project Tracker',
    updatedAt: new Date().toISOString()
  },
  customers: []
}
