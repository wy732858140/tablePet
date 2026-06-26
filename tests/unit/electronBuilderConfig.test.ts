import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type ElectronBuilderConfig = {
  directories?: {
    buildResources?: string
  }
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
})
