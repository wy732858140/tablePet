import { dialog, ipcMain } from 'electron'
import type { createPetLibraryStore } from '../pets/PetLibraryStore.js'
import type { createPetPackageImporter } from '../pets/PetPackageImporter.js'
import type { createSettingsStore } from '../settings/SettingsStore.js'
import type { WindowController } from '../window/WindowController.js'
import type { Point } from '../../shared/types.js'

export const registerIpcHandlers = (
  windowController: WindowController,
  importer: ReturnType<typeof createPetPackageImporter>,
  libraryStore: ReturnType<typeof createPetLibraryStore>,
  settingsStore: ReturnType<typeof createSettingsStore>
) => {
  ipcMain.handle('pet:list', () => libraryStore.load())
  ipcMain.handle('settings:get', () => settingsStore.load())
  ipcMain.handle('window:set-click-through', (_event, enabled: boolean, forward?: boolean) => {
    windowController.setClickThrough(enabled, forward)
  })
  ipcMain.handle('window:set-position', (_event, point: Point) => {
    windowController.setPosition(point)
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
