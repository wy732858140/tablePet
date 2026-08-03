import { dialog, ipcMain } from 'electron'
import type { createPetLibraryStore } from '../pets/PetLibraryStore.js'
import type { createPetPackageImporter } from '../pets/PetPackageImporter.js'
import type { createSettingsStore } from '../settings/SettingsStore.js'
import type { WindowController } from '../window/WindowController.js'
import { clampPetScale, toPetWindowSize } from '../../shared/petWindowScale.js'
import type { Point, Size } from '../../shared/types.js'

type AppLifecycle = {
  quit: () => void
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export const toPoint = (value: unknown): Point => {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    throw new Error('Invalid pet position.')
  }
  return { x: value.x, y: value.y }
}

export const toWindowSize = (value: unknown): Size => {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height) ||
    value.width <= 0 ||
    value.height <= 0
  ) {
    throw new Error('Invalid window size.')
  }
  return { width: value.width, height: value.height }
}

export const toClickThroughOptions = (
  enabled: unknown,
  forward: unknown = true
): { enabled: boolean; forward: boolean } => {
  if (typeof enabled !== 'boolean' || typeof forward !== 'boolean') {
    throw new Error('Invalid click-through options.')
  }
  return { enabled, forward }
}

export const toPetId = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new Error('Invalid pet id.')
  }
  const id = value.trim()
  if (id.length === 0) {
    throw new Error('Invalid pet id.')
  }
  return id
}

export const toPetScale = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error('Invalid pet scale.')
  }
  return clampPetScale(value)
}

export const registerIpcHandlers = (
  windowController: WindowController,
  importer: ReturnType<typeof createPetPackageImporter>,
  libraryStore: ReturnType<typeof createPetLibraryStore>,
  settingsStore: ReturnType<typeof createSettingsStore>,
  appLifecycle: AppLifecycle
) => {
  ipcMain.handle('pet:list', () => libraryStore.load())
  ipcMain.handle('pet:set-current', (_event, id: unknown) => libraryStore.setCurrentPet(toPetId(id)))
  ipcMain.handle('pet:delete', (_event, id: unknown) => libraryStore.remove(toPetId(id)))
  ipcMain.handle('settings:get', () => settingsStore.load())
  ipcMain.handle('settings:set-pet-scale', async (_event, scale: unknown) => {
    const petScale = toPetScale(scale)
    const settings = await settingsStore.load()
    const nextSettings = {
      ...settings,
      petWindow: {
        ...settings.petWindow,
        scale: petScale
      }
    }
    const saved = await settingsStore.save(nextSettings)
    windowController.setSize(toPetWindowSize(saved.petWindow.scale))
    return saved
  })
  ipcMain.handle('window:set-click-through', (_event, enabled: unknown, forward?: unknown) => {
    const options = toClickThroughOptions(enabled, forward)
    windowController.setClickThrough(options.enabled, options.forward)
  })
  ipcMain.handle('window:set-position', (_event, point: unknown) => {
    windowController.setPosition(toPoint(point))
  })
  ipcMain.handle('window:set-size', (_event, size: unknown) => {
    windowController.setSize(toWindowSize(size))
  })
  ipcMain.handle('window:close', () => {
    appLifecycle.quit()
  })
  ipcMain.handle('pet:import-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, code: 'copy_failed', message: 'No folder was selected.' }
    }
    const imported = await importer.importFolder(result.filePaths[0])
    if (imported.ok) {
      const libraryEntry = {
        ...imported.pet,
        sourcePath: result.filePaths[0],
        importedAt: new Date().toISOString(),
        status: 'ok' as const
      }
      await libraryStore.upsert(libraryEntry)
    }
    return imported
  })
}
