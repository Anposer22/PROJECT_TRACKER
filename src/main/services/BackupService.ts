import { copyFile, mkdir, readdir, rm, stat } from 'fs/promises'
import { basename, dirname, join } from 'path'

const MAX_BACKUPS = 25

export async function backupBeforeOverwrite(dataFilePath: string): Promise<void> {
  const dir = join(dirname(dataFilePath), 'data-backups')
  await mkdir(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = join(dir, `${basename(dataFilePath)}.${stamp}.bak`)
  try {
    await stat(dataFilePath)
  } catch {
    return
  }
  await copyFile(dataFilePath, dest)
  await pruneOldBackups(dir, MAX_BACKUPS)
}

async function pruneOldBackups(dir: string, keep: number): Promise<void> {
  const names = await readdir(dir)
  const files = names.filter((n) => n.endsWith('.bak'))
  if (files.length <= keep) return
  const withStat = await Promise.all(
    files.map(async (name) => {
      const p = join(dir, name)
      const s = await stat(p)
      return { p, mtime: s.mtimeMs }
    })
  )
  withStat.sort((a, b) => b.mtime - a.mtime)
  const toRemove = withStat.slice(keep)
  for (const f of toRemove) {
    await rm(f.p, { force: true })
  }
}
