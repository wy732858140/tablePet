import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { installDefaultPets } from '../../src/main/pets/DefaultPetInstaller'
import type { ImportResult, PetLibrary, PetLibraryEntry } from '../../src/shared/types'

const BUILT_IN_PET_IDS = ['bobo', 'carrot-bouncer', 'doge', 'fubao', 'kun-like']

const makeDefaultPetsDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'default-pets-'))
  await Promise.all(BUILT_IN_PET_IDS.map((id) => mkdir(join(dir, id))))
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
  }),
  remove: vi.fn(async (id: string) => {
    library.pets = library.pets.filter((pet) => pet.id !== id)
    library.currentPetId = library.currentPetId === id ? null : library.currentPetId
    library.removedPetIds = [...new Set([...(library.removedPetIds ?? []), id])]
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

    expect(importer.importFolder.mock.calls.map(([folder]) => basename(folder))).toEqual(BUILT_IN_PET_IDS)
    expect(store.upsert.mock.calls.map(([entry]) => entry.id)).toEqual(BUILT_IN_PET_IDS)
    expect(store.setCurrentPet).not.toHaveBeenCalled()
    const savedLibrary = store.save.mock.calls[0]?.[0]
    expect(savedLibrary?.currentPetId).toBeNull()
    expect(savedLibrary?.pets.map((pet) => pet.id)).toEqual(BUILT_IN_PET_IDS)
    expect(result).toEqual({ imported: BUILT_IN_PET_IDS, failed: [] })
  })

  it('restores the existing current pet after installing bundled pets', async () => {
    const defaultPetsDir = await makeDefaultPetsDir()
    const importer = makeImporter()
    const store = makeStore({ currentPetId: 'custom', pets: [makePet('custom')] })

    await installDefaultPets(defaultPetsDir, importer, store)

    expect(store.setCurrentPet).toHaveBeenCalledWith('custom')
  })

  it('does not reinstall bundled pets that the user removed', async () => {
    const defaultPetsDir = await makeDefaultPetsDir()
    const importer = makeImporter()
    const removedPetIds = ['doge']
    const store = makeStore({ currentPetId: null, pets: [], removedPetIds })

    const result = await installDefaultPets(defaultPetsDir, importer, store)

    const expectedImported = BUILT_IN_PET_IDS.filter((id) => id !== 'doge')
    expect(importer.importFolder.mock.calls.map(([folder]) => basename(folder))).toEqual(expectedImported)
    expect(result.imported).toEqual(expectedImported)
  })
})
