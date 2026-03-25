import { contextBridge, ipcRenderer } from 'electron'
import type { Command, TrackerDocument } from '../shared/types'

export interface DocumentPayload {
  document: TrackerDocument
  filePath: string
  fileError: string | null
  lastWriteHash: string | null
}

const api = {
  getPath: (): Promise<string> => ipcRenderer.invoke('document:getPath'),
  getInitial: (): Promise<DocumentPayload> => ipcRenderer.invoke('document:getInitial'),
  applyCommand: (cmd: Command): Promise<DocumentPayload> => ipcRenderer.invoke('document:applyCommand', cmd),
  reveal: (): Promise<void> => ipcRenderer.invoke('document:reveal'),
  open: (): Promise<string | null> => ipcRenderer.invoke('document:open'),
  onDocumentUpdate: (cb: (p: DocumentPayload) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, p: DocumentPayload) => cb(p)
    ipcRenderer.on('document:update', handler)
    return () => ipcRenderer.removeListener('document:update', handler)
  }
}

contextBridge.exposeInMainWorld('tracker', api)
