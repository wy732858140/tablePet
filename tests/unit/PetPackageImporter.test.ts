import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
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

  it('rejects invalid manifest JSON', async () => {
    const { source, appData } = await makeDirs()
    await writeFile(join(source, 'pet.json'), '{bad json')
    const importer = createPetPackageImporter(appData, async () => ({ width: 1536, height: 1872 }))
    expect(await importer.importFolder(source)).toEqual({
      ok: false,
      code: 'invalid_manifest_json',
      message: 'pet.json is not valid JSON.'
    })
  })

  it.each([
    ['non-object manifest', null],
    ['array manifest', []]
  ])('rejects malformed manifest JSON: %s', async (_caseName, manifest) => {
    const { source, appData } = await makeDirs()
    await writeFile(join(source, 'pet.json'), JSON.stringify(manifest))
    const importer = createPetPackageImporter(appData, async () => ({ width: 1536, height: 1872 }))
    expect(await importer.importFolder(source)).toEqual({
      ok: false,
      code: 'invalid_manifest_json',
      message: 'pet.json is not valid JSON.'
    })
  })

  it.each([
    ['missing id', { spritesheetPath: 'spritesheet.webp' }],
    ['non-string id', { id: 123, spritesheetPath: 'spritesheet.webp' }],
    ['path traversal id', { id: '../../outside', spritesheetPath: 'spritesheet.webp' }]
  ])('rejects unsafe manifest ids: %s', async (_caseName, manifest) => {
    const { source, appData } = await makeDirs()
    await writeFile(join(source, 'pet.json'), JSON.stringify(manifest))
    const inspector = vi.fn(async () => ({ width: 1536, height: 1872 }))
    const importer = createPetPackageImporter(appData, inspector)
    expect(await importer.importFolder(source)).toEqual({
      ok: false,
      code: 'missing_id',
      message: 'pet.json must include an id.'
    })
    expect(inspector).not.toHaveBeenCalled()
  })

  it.each([
    ['missing spritesheetPath', { id: 'momo' }],
    ['non-string spritesheetPath', { id: 'momo', spritesheetPath: 123 }],
    ['path traversal spritesheetPath', { id: 'momo', spritesheetPath: '../spritesheet.webp' }]
  ])('rejects unsafe spritesheet paths: %s', async (_caseName, manifest) => {
    const { source, appData } = await makeDirs()
    await writeFile(join(source, 'pet.json'), JSON.stringify(manifest))
    const inspector = vi.fn(async () => ({ width: 1536, height: 1872 }))
    const importer = createPetPackageImporter(appData, inspector)
    expect(await importer.importFolder(source)).toEqual({
      ok: false,
      code: 'missing_spritesheet_path',
      message: 'pet.json must include spritesheetPath.'
    })
    expect(inspector).not.toHaveBeenCalled()
  })

  it('rejects a missing spritesheet', async () => {
    const { source, appData } = await makeDirs()
    await writeFile(join(source, 'pet.json'), JSON.stringify({ id: 'momo', spritesheetPath: 'spritesheet.webp' }))
    const missing = new Error('missing') as NodeJS.ErrnoException
    missing.code = 'ENOENT'
    const importer = createPetPackageImporter(appData, async () => {
      throw missing
    })
    expect(await importer.importFolder(source)).toEqual({
      ok: false,
      code: 'missing_spritesheet',
      message: 'spritesheet.webp was not found in the selected folder.'
    })
  })

  it('rejects an unreadable image', async () => {
    const { source, appData } = await makeDirs()
    await writeFile(join(source, 'pet.json'), JSON.stringify({ id: 'momo', spritesheetPath: 'spritesheet.webp' }))
    const importer = createPetPackageImporter(appData, async () => {
      throw new Error('not an image')
    })
    expect(await importer.importFolder(source)).toEqual({
      ok: false,
      code: 'invalid_image',
      message: 'spritesheet could not be read as an image.'
    })
  })

  it('returns copy_failed when the package cannot be copied', async () => {
    const { source, appData } = await makeDirs()
    await writeFile(join(source, 'pet.json'), JSON.stringify({ id: 'momo', spritesheetPath: 'spritesheet.webp' }))
    await writeFile(join(source, 'spritesheet.webp'), 'fake-image')
    await writeFile(join(appData, 'pets'), 'not a directory')
    const importer = createPetPackageImporter(appData, async () => ({ width: 1536, height: 1872 }))
    expect(await importer.importFolder(source)).toEqual({
      ok: false,
      code: 'copy_failed',
      message: 'Pet package could not be copied into the local library.'
    })
  })
})
