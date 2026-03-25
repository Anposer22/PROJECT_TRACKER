import type { Command, TrackerDocument } from '@shared/types'

export interface DocumentPayload {
  document: TrackerDocument
  filePath: string
  fileError: string | null
  lastWriteHash: string | null
}

declare global {
  interface Window {
    tracker: {
      getPath: () => Promise<string>
      getInitial: () => Promise<DocumentPayload>
      applyCommand: (cmd: Command) => Promise<DocumentPayload>
      reveal: () => Promise<void>
      open: () => Promise<string | null>
      onDocumentUpdate: (cb: (p: DocumentPayload) => void) => () => void
    }
  }
}

export {}
