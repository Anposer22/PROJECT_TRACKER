import chokidar from 'chokidar'

export class FileWatchService {
  private watcher: chokidar.FSWatcher | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly debounceMs: number

  constructor(
    private readonly filePath: string,
    private readonly onStableChange: () => void,
    debounceMs = 280
  ) {
    this.debounceMs = debounceMs
  }

  start(): void {
    this.stop()
    this.watcher = chokidar.watch(this.filePath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }
    })
    this.watcher.on('all', () => this.schedule())
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    void this.watcher?.close()
    this.watcher = null
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.onStableChange()
    }, this.debounceMs)
  }
}
