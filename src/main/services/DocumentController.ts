import { createHash } from 'node:crypto'
import { existsSync } from 'fs'
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { applyCommand } from '../../shared/commands'
import type { Command, TrackerDocument } from '../../shared/types'
import { canonicalStringify, normalizeDocument } from '../../shared/normalize'
import { parseDocumentText } from '../../shared/parseDocument'
import { DEFAULT_DOCUMENT } from '../../shared/defaultDocument'
import { readUtf8File, writeUtf8FileAtomic } from './DataFileService'
import { backupBeforeOverwrite } from './BackupService'
import { FileWatchService } from './FileWatchService'

export interface DocumentBroadcast {
  document: TrackerDocument
  filePath: string
  fileError: string | null
  lastWriteHash: string | null
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf-8').digest('hex')
}

export class DocumentController {
  private lastGood: TrackerDocument
  private lastSerialized: string
  private lastHash: string
  private lastFileError: string | null = null
  private watcher: FileWatchService | null = null
  private ignoreNextRead = false
  readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
    const initial = normalizeDocument(structuredClone(DEFAULT_DOCUMENT))
    this.lastSerialized = canonicalStringify(initial)
    this.lastHash = sha256(this.lastSerialized)
    this.lastGood = initial
  }

  getDocument(): TrackerDocument {
    return this.lastGood
  }

  getFilePath(): string {
    return this.filePath
  }

  getSnapshot(): DocumentBroadcast {
    return {
      document: this.lastGood,
      filePath: this.filePath,
      fileError: this.lastFileError,
      lastWriteHash: this.lastHash
    }
  }

  async bootstrap(): Promise<DocumentBroadcast> {
    await this.ensureFileExists()
    const result = await this.readAndApply()
    this.startWatch()
    return result
  }

  private async ensureFileExists(): Promise<void> {
    if (!existsSync(this.filePath)) {
      const doc = normalizeDocument(structuredClone(DEFAULT_DOCUMENT))
      const text = canonicalStringify(doc)
      await writeUtf8FileAtomic(this.filePath, text)
    }
  }

  private startWatch(): void {
    this.watcher?.stop()
    this.watcher = new FileWatchService(this.filePath, () => {
      void this.onExternalChange()
    })
    this.watcher.start()
  }

  stopWatch(): void {
    this.watcher?.stop()
    this.watcher = null
  }

  private async onExternalChange(): Promise<void> {
    if (this.ignoreNextRead) {
      this.ignoreNextRead = false
      return
    }
    await this.readAndApply()
  }

  private async readAndApply(): Promise<DocumentBroadcast> {
    let text: string
    try {
      text = await readUtf8File(this.filePath)
    } catch (e) {
      const msg = `Could not read file: ${e instanceof Error ? e.message : String(e)}`
      this.lastFileError = msg
      this.broadcast({
        document: this.lastGood,
        filePath: this.filePath,
        fileError: msg,
        lastWriteHash: this.lastHash
      })
      return {
        document: this.lastGood,
        filePath: this.filePath,
        fileError: msg,
        lastWriteHash: this.lastHash
      }
    }
    const h = sha256(text)
    if (h === this.lastHash) {
      this.lastFileError = null
      this.broadcast({
        document: this.lastGood,
        filePath: this.filePath,
        fileError: null,
        lastWriteHash: this.lastHash
      })
      return {
        document: this.lastGood,
        filePath: this.filePath,
        fileError: null,
        lastWriteHash: this.lastHash
      }
    }
    const parsed = parseDocumentText(text)
    if (!parsed.ok) {
      this.lastFileError = parsed.error
      this.broadcast({
        document: this.lastGood,
        filePath: this.filePath,
        fileError: parsed.error,
        lastWriteHash: this.lastHash
      })
      return {
        document: this.lastGood,
        filePath: this.filePath,
        fileError: parsed.error,
        lastWriteHash: this.lastHash
      }
    }
    const normalized = normalizeDocument(parsed.document)
    const serialized = canonicalStringify(normalized)
    const nh = sha256(serialized)
    this.lastGood = normalized
    this.lastSerialized = serialized
    this.lastHash = nh
    this.lastFileError = null
    this.broadcast({
      document: this.lastGood,
      filePath: this.filePath,
      fileError: null,
      lastWriteHash: this.lastHash
    })
    return {
      document: this.lastGood,
      filePath: this.filePath,
      fileError: null,
      lastWriteHash: this.lastHash
    }
  }

  async apply(cmd: Command): Promise<DocumentBroadcast> {
    const applied = applyCommand(this.lastGood, cmd)
    if (!applied.ok) {
      return {
        document: this.lastGood,
        filePath: this.filePath,
        fileError: applied.error,
        lastWriteHash: this.lastHash
      }
    }
    return this.saveAndBroadcast(applied.document)
  }

  private async saveAndBroadcast(doc: TrackerDocument): Promise<DocumentBroadcast> {
    const normalized = normalizeDocument(doc)
    const text = canonicalStringify(normalized)
    const h = sha256(text)
    try {
      await backupBeforeOverwrite(this.filePath)
      this.ignoreNextRead = true
      await writeUtf8FileAtomic(this.filePath, text)
    } catch (e) {
      this.ignoreNextRead = false
      const msg = `Save failed: ${e instanceof Error ? e.message : String(e)}`
      this.lastFileError = msg
      this.broadcast({
        document: this.lastGood,
        filePath: this.filePath,
        fileError: msg,
        lastWriteHash: this.lastHash
      })
      return {
        document: this.lastGood,
        filePath: this.filePath,
        fileError: msg,
        lastWriteHash: this.lastHash
      }
    }
    this.lastGood = normalized
    this.lastSerialized = text
    this.lastHash = h
    this.lastFileError = null
    this.broadcast({
      document: this.lastGood,
      filePath: this.filePath,
      fileError: null,
      lastWriteHash: this.lastHash
    })
    return {
      document: this.lastGood,
      filePath: this.filePath,
      fileError: null,
      lastWriteHash: this.lastHash
    }
  }

  private broadcast(payload: DocumentBroadcast): void {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('document:update', payload)
    }
  }
}

export function defaultDataFilePath(): string {
  const base = app.getPath('documents')
  return join(base, 'Project Tracker', 'progress-tracker.txt')
}
