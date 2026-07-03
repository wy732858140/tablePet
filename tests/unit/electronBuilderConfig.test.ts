import { access, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type ExtraResourceConfig = {
  from?: string
  to?: string
  filter?: string[]
}

type ElectronBuilderConfig = {
  directories?: {
    buildResources?: string
  }
  extraResources?: ExtraResourceConfig[]
  mac?: {
    icon?: string
  }
  win?: {
    icon?: string
  }
}

const readConfig = async () =>
  JSON.parse(await readFile(resolve('electron-builder.json'), 'utf8')) as ElectronBuilderConfig

describe('electron-builder config', () => {
  it('uses packaged app icons for macOS and Windows', async () => {
    const config = await readConfig()

    expect(config.directories?.buildResources).toBe('assets')
    expect(config.mac?.icon).toBe('assets/icons/app-icon.icns')
    expect(config.win?.icon).toBe('assets/icons/app-icon.ico')

    await expect(access(resolve(config.mac?.icon ?? ''))).resolves.toBeUndefined()
    await expect(access(resolve(config.win?.icon ?? ''))).resolves.toBeUndefined()
  })

  it('packages bundled pets as extra resources', async () => {
    const config = await readConfig()
    const petDirs = (await readdir(resolve('pets'), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))

    expect(petDirs).toEqual(['bobo', 'carrot-bouncer', 'doge', 'fubao', 'kun-like'])
    expect(config.extraResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'pets',
          to: 'pets',
          filter: expect.arrayContaining(['**/*', '!**/.DS_Store'])
        })
      ])
    )

    await Promise.all(
      petDirs.flatMap((id) => [
        expect(access(resolve('pets', id, 'pet.json'))).resolves.toBeUndefined(),
        expect(access(resolve('pets', id, 'spritesheet.webp'))).resolves.toBeUndefined()
      ])
    )
  })
})
