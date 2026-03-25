import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc/registerIpc'
import { defaultDataFilePath, DocumentController } from './services/DocumentController'

let mainWindow: BrowserWindow | null = null
let controller: DocumentController | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'Visual Progress Tracker',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#f5f5f4',
    show: false
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  const path = defaultDataFilePath()
  controller = new DocumentController(path)
  registerIpc(controller)
  await controller.bootstrap()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  controller?.stopWatch()
  if (process.platform !== 'darwin') app.quit()
})
