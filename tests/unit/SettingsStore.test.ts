import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createSettingsStore } from '../../src/main/settings/SettingsStore'

describe('SettingsStore', () => {
  it('returns defaults when no settings exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'settings-store-'))
    const store = createSettingsStore(dir)
    await expect(store.load()).resolves.toEqual({
      petWindow: {
        position: null,
        scale: 1.5,
        alwaysOnTop: true,
        visibleOnLaunch: true
      },
      behavior: { quietMode: false }
    })
  })

  it('backs up corrupt settings and returns defaults', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'settings-store-'))
    await writeFile(join(dir, 'settings.json'), '{bad json')
    const store = createSettingsStore(dir)
    const settings = await store.load()
    expect(settings.petWindow.scale).toBe(1.5)
    const files = await readFile(join(dir, 'settings.json'), 'utf8')
    expect(JSON.parse(files).petWindow.scale).toBe(1.5)
    const backups = (await readdir(dir)).filter((file) => /^settings\.corrupt\.\d+\.json$/.test(file))
    expect(backups).toHaveLength(1)
  })

  it('fills nested defaults for partial settings', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'settings-store-'))
    await writeFile(join(dir, 'settings.json'), JSON.stringify({ petWindow: { scale: 2 } }))
    const store = createSettingsStore(dir)
    await expect(store.load()).resolves.toEqual({
      petWindow: {
        position: null,
        scale: 2,
        alwaysOnTop: true,
        visibleOnLaunch: true
      },
      behavior: { quietMode: false }
    })
  })

  it('falls back per field for invalid settings values', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'settings-store-'))
    await writeFile(
      join(dir, 'settings.json'),
      JSON.stringify({
        petWindow: {
          position: { x: 10, y: 'bad' },
          scale: 'large',
          alwaysOnTop: 'yes',
          visibleOnLaunch: false
        },
        behavior: {
          quietMode: 'false'
        }
      })
    )
    const store = createSettingsStore(dir)
    await expect(store.load()).resolves.toEqual({
      petWindow: {
        position: null,
        scale: 1.5,
        alwaysOnTop: true,
        visibleOnLaunch: false
      },
      behavior: { quietMode: false }
    })
  })
})
