# Visual Progress Tracker

Local-first Windows desktop app: **Electron**, **React**, **TypeScript**, **Vite**, **Zustand**, **Zod**. All data lives in one UTF-8 **JSON `.txt`** file with automatic reload when the file changes externally, atomic saves, and rotating backups.

## Requirements

- Node.js 20+ and npm

## Commands

```bash
npm install
npm run dev
```

Development runs `electron-vite` with hot reload for the renderer.

### Production build (Windows installer)

```bash
npm run build
npm run build:win
```

Output: `release/` (NSIS installer and unpacked app).

## Data file

- Default path: `Documents/Project Tracker/progress-tracker.txt`
- Backups: `Documents/Project Tracker/data-backups/*.bak` (last 25 kept)
- Use **Reveal file** / **Open in editor** in the app header to open the folder or file.
- You can replace the file contents with the sample in [`sample-data/progress-tracker.txt`](sample-data/progress-tracker.txt) (valid JSON). If the file is malformed, the app keeps the last good in-memory state and shows an error banner.

## Keyboard

- **Escape** — clear task selection

## Project layout

- `src/main` — Electron main process, file I/O, watcher, IPC
- `src/preload` — `contextBridge` API
- `src/renderer` — React UI
- `src/shared` — schema, parsing, commands, timeline derivation
