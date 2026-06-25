import { app } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerIpcHandlers } from './ipc/IpcHandlers.js'
import { createPetLibraryStore } from './pets/PetLibraryStore.js'
import { createPetPackageImporter } from './pets/PetPackageImporter.js'
import { createSettingsStore } from './settings/SettingsStore.js'
import { createTrayController } from './tray/TrayController.js'
import { createWindowController } from './window/WindowController.js'

const isDev = !app.isPackaged

let trayController: ReturnType<typeof createTrayController> | null = null

void app.whenReady().then(() => {
  const appDataDir = join(app.getPath('userData'), 'runtime')
  const preloadPath = join(app.getAppPath(), 'dist/preload/desktopPetApi.cjs')
  const rendererUrl = isDev
    ? 'http://127.0.0.1:5173'
    : pathToFileURL(join(app.getAppPath(), 'dist/renderer/index.html')).toString()

  const windowController = createWindowController(preloadPath, rendererUrl)
  const importer = createPetPackageImporter(appDataDir)
  const libraryStore = createPetLibraryStore(appDataDir)
  const settingsStore = createSettingsStore(appDataDir)

  windowController.createPetWindow()
  registerIpcHandlers(windowController, importer, libraryStore, settingsStore)
  trayController = createTrayController({
    importPet: () => windowController.getPetWindow()?.webContents.send('ui:import-pet'),
    showPet: () => windowController.show(),
    hidePet: () => windowController.hide(),
    quit: () => app.quit()
  })
})

app.on('window-all-closed', (event?: { preventDefault: () => void }) => {
  event?.preventDefault()
})
