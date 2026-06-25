import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Settings } from '../../shared/types.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const normalizePosition = (value: unknown): Settings['petWindow']['position'] => {
  if (value === null) {
    return null
  }
  if (isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y)) {
    return { x: value.x, y: value.y }
  }
  return null
}

const normalizeScale = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) && value > 0 ? value : fallback

const normalizeBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

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

const normalizeSettings = (value: unknown): Settings => {
  const defaults = defaultSettings()
  if (!isRecord(value)) {
    return defaults
  }

  const petWindow = isRecord(value.petWindow) ? (value.petWindow as Partial<Settings['petWindow']>) : {}
  const behavior = isRecord(value.behavior) ? (value.behavior as Partial<Settings['behavior']>) : {}

  return {
    petWindow: {
      position: normalizePosition(petWindow.position),
      scale: normalizeScale(petWindow.scale, defaults.petWindow.scale),
      alwaysOnTop: normalizeBoolean(petWindow.alwaysOnTop, defaults.petWindow.alwaysOnTop),
      visibleOnLaunch: normalizeBoolean(petWindow.visibleOnLaunch, defaults.petWindow.visibleOnLaunch)
    },
    behavior: {
      quietMode: normalizeBoolean(behavior.quietMode, defaults.behavior.quietMode)
    }
  }
}

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
      return normalizeSettings(JSON.parse(raw))
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
