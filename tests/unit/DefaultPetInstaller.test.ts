import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { installDefaultPets } from '../../src/main/pets/DefaultPetInstaller'
import type { ImportResult, PetLibrary, PetLibraryEntry } from '../../src/shared/types'

const makeDefaultPetsDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'default-pets-'))
  await mkdir(join(dir, 'fubao'))
  await mkdir(join(dir, 'kun-like'))
  await writeFile(join(dir, '.DS_Store'), '')
  return dir
}

const makePet = (id: string): PetLibraryEntry => ({
  id,
  displayName: id,
  description: '',
  packageDir: `/appdata/pets/${id}`,
  spritesheetPath: `/appdata/pets/${id}/spritesheet.webp`,
  sourcePath: `/defaults/${id}`,
  importedAt: '2026-06-25T00:00:00.000Z',
  status: 'ok'
})

const makeStore = (library: PetLibrary) => ({
  load: vi.fn(async () => library),
  save: vi.fn(async (next: PetLibrary) => {
    library = next
    return library
  }),
  upsert: vi.fn(async (entry: PetLibraryEntry) => {
    library.pets = [...library.pets.filter((pet) => pet.id !== entry.id), entry]
    library.currentPetId = entry.id
    return library
  }),
  setCurrentPet: vi.fn(async (id: string) => {
    library.currentPetId = id
    return library
  })
})

const makeImporter = () => ({
  importFolder: vi.fn(async (folder: string): Promise<ImportResult> => {
    const id = basename(folder)
    return { ok: true, pet: makePet(id) }
  })
})

describe('installDefaultPets', () => {
  it('imports bundled pet directories in stable order without auto-selecting a default pet', async () => {
    const defaultPetsDir = await makeDefaultPetsDir()
    const importer = makeImporter()
    const store = makeStore({ currentPetId: null, pets: [] })

    const result = await installDefaultPets(defaultPetsDir, importer, store)

    expect(importer.importFolder.mock.calls.map(([folder]) => basename(folder))).toEqual(['fubao', 'kun-like'])
    expect(store.upsert.mock.calls.map(([entry]) => entry.id)).toEqual(['fubao', 'kun-like'])
    expect(store.setCurrentPet).not.toHaveBeenCalled()
    const savedLibrary = store.save.mock.calls[0]?.[0]
    expect(savedLibrary?.currentPetId).toBeNull()
    expect(savedLibrary?.pets.map((pet) => pet.id)).toEqual(['fubao', 'kun-like'])
    expect(result).toEqual({ imported: ['fubao', 'kun-like'], failed: [] })
  })

  it('restores the existing current pet after installing bundled pets', async () => {
    const defaultPetsDir = await makeDefaultPetsDir()
    const importer = makeImporter()
    const store = makeStore({ currentPetId: 'custom', pets: [makePet('custom')] })

    await installDefaultPets(defaultPetsDir, importer, store)

    expect(store.setCurrentPet).toHaveBeenCalledWith('custom')
  })
})
