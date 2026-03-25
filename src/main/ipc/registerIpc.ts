import { ipcMain, shell } from 'electron'
import type { Command } from '../../shared/types'
import type { DocumentController } from '../services/DocumentController'

export function registerIpc(controller: DocumentController): void {
  ipcMain.handle('document:getPath', () => controller.getFilePath())

  ipcMain.handle('document:getInitial', async () => controller.getSnapshot())

  ipcMain.handle('document:applyCommand', async (_e, cmd: Command) => {
    return controller.apply(cmd)
  })

  ipcMain.handle('document:reveal', async () => {
    await shell.showItemInFolder(controller.getFilePath())
  })

  ipcMain.handle('document:open', async () => {
    const err = await shell.openPath(controller.getFilePath())
    return err || null
  })
}
