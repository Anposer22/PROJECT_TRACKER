import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import { dirname } from 'path'

export async function readUtf8File(path: string): Promise<string> {
  return readFile(path, 'utf-8')
}

export async function writeUtf8FileAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.${process.pid}.tmp`
  await writeFile(tmp, content, 'utf-8')
  await rename(tmp, path)
}
