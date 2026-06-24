import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PetLibrary, PetLibraryEntry } from '../../shared/types.js'

const emptyLibrary = (): PetLibrary => ({ currentPetId: null, pets: [] })

export const createPetLibraryStore = (appDataDir: string) => {
  const libraryPath = join(appDataDir, 'library.json')

  const save = async (library: PetLibrary): Promise<PetLibrary> => {
    await mkdir(appDataDir, { recursive: true })
    await writeFile(libraryPath, JSON.stringify(library, null, 2))
    return library
  }

  const load = async (): Promise<PetLibrary> => {
    try {
      return JSON.parse(await readFile(libraryPath, 'utf8')) as PetLibrary
    } catch (error) {
      const library = emptyLibrary()
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        await mkdir(appDataDir, { recursive: true })
        await rename(libraryPath, join(appDataDir, `library.corrupt.${Date.now()}.json`)).catch(() => undefined)
      }
      return save(library)
    }
  }

  const upsert = async (entry: PetLibraryEntry): Promise<PetLibrary> => {
    const library = await load()
    const pets = library.pets.filter((pet) => pet.id !== entry.id)
    const next = { currentPetId: entry.id, pets: [...pets, entry] }
    return save(next)
  }

  const setCurrentPet = async (id: string): Promise<PetLibrary> => {
    const library = await load()
    if (!library.pets.some((pet) => pet.id === id)) {
      throw new Error(`Pet not found: ${id}`)
    }
    return save({ ...library, currentPetId: id })
  }

  return { load, save, upsert, setCurrentPet }
}
