import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Settings } from '../../shared/types.js'

const defaultSettings = (): Settings => ({
  petWindow: {
    position: null,
    scale: 1.5,
    alwaysOnTop: true,
    visibleOnLaunch: true
  },
  behavior: {
    quietMode: false
  }
})

export const createSettingsStore = (appDataDir: string) => {
  const settingsPath = join(appDataDir, 'settings.json')

  const save = async (settings: Settings): Promise<Settings> => {
    await mkdir(appDataDir, { recursive: true })
    await writeFile(settingsPath, JSON.stringify(settings, null, 2))
    return settings
  }

  const load = async (): Promise<Settings> => {
    try {
      const raw = await readFile(settingsPath, 'utf8')
      return { ...defaultSettings(), ...JSON.parse(raw) }
    } catch (error) {
      const settings = defaultSettings()
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        await mkdir(appDataDir, { recursive: true })
        await rename(settingsPath, join(appDataDir, `settings.corrupt.${Date.now()}.json`)).catch(() => undefined)
      }
      return save(settings)
    }
  }

  return { load, save }
}
