import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createPetPackageImporter } from '../../src/main/pets/PetPackageImporter'

const makeDirs = async () => {
  const source = await mkdtemp(join(tmpdir(), 'pet-source-'))
  const appData = await mkdtemp(join(tmpdir(), 'pet-appdata-'))
  return { source, appData }
}

describe('PetPackageImporter', () => {
  it('imports a valid Hatch Pet package', async () => {
    const { source, appData } = await makeDirs()
    await writeFile(
      join(source, 'pet.json'),
      JSON.stringify({
        id: 'momo',
        displayName: 'Momo',
        description: 'A test pet',
        spritesheetPath: 'spritesheet.webp'
      })
    )
    await writeFile(join(source, 'spritesheet.webp'), 'fake-image')
    const importer = createPetPackageImporter(appData, async () => ({ width: 1536, height: 1872 }))

    const result = await importer.importFolder(source)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.pet.id).toBe('momo')
      expect(await readFile(join(appData, 'pets/momo/pet.json'), 'utf8')).toContain('"id"')
    }
  })

  it('rejects invalid atlas dimensions', async () => {
    const { source, appData } = await makeDirs()
    await writeFile(
      join(source, 'pet.json'),
      JSON.stringify({
        id: 'momo',
        spritesheetPath: 'spritesheet.webp'
      })
    )
    await writeFile(join(source, 'spritesheet.webp'), 'fake-image')
    const importer = createPetPackageImporter(appData, async () => ({ width: 100, height: 100 }))

    const result = await importer.importFolder(source)

    expect(result).toEqual({
      ok: false,
      code: 'invalid_atlas_size',
      message: 'Expected atlas size 1536x1872, received 100x100.'
    })
  })

  it('rejects a missing manifest', async () => {
    const { source, appData } = await makeDirs()
    await mkdir(source, { recursive: true })
    const importer = createPetPackageImporter(appData, async () => ({ width: 1536, height: 1872 }))
    expect(await importer.importFolder(source)).toEqual({
      ok: false,
      code: 'missing_manifest',
      message: 'pet.json was not found in the selected folder.'
    })
  })
})
