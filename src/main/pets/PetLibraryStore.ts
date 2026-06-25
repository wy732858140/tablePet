import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PetLibrary, PetLibraryEntry } from '../../shared/types.js'

const emptyLibrary = (): PetLibrary => ({ currentPetId: null, pets: [] })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const isStatus = (value: unknown): value is PetLibraryEntry['status'] => value === 'ok' || value === 'error'

const normalizePetEntry = (value: unknown): PetLibraryEntry | null => {
  if (!isRecord(value)) {
    return null
  }

  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.displayName) ||
    typeof value.description !== 'string' ||
    !isNonEmptyString(value.packageDir) ||
    !isNonEmptyString(value.spritesheetPath) ||
    !isNonEmptyString(value.sourcePath) ||
    !isNonEmptyString(value.importedAt) ||
    !isStatus(value.status)
  ) {
    return null
  }

  return {
    id: value.id,
    displayName: value.displayName,
    description: value.description,
    packageDir: value.packageDir,
    spritesheetPath: value.spritesheetPath,
    sourcePath: value.sourcePath,
    importedAt: value.importedAt,
    status: value.status
  }
}

const normalizeLibrary = (value: unknown): PetLibrary | null => {
  if (!isRecord(value) || !Array.isArray(value.pets)) {
    return null
  }

  const currentPetId = value.currentPetId
  if (currentPetId !== null && typeof currentPetId !== 'string') {
    return null
  }

  const pets = value.pets.map(normalizePetEntry)
  if (pets.some((pet) => pet === null)) {
    return null
  }

  const petEntries = pets as PetLibraryEntry[]
  const petIds = new Set(petEntries.map((pet) => pet.id))
  if (petIds.size !== petEntries.length) {
    return null
  }

  if (typeof currentPetId === 'string' && !petIds.has(currentPetId)) {
    return null
  }

  return {
    currentPetId,
    pets: petEntries
  }
}

export const createPetLibraryStore = (appDataDir: string) => {
  const libraryPath = join(appDataDir, 'library.json')

  const save = async (library: PetLibrary): Promise<PetLibrary> => {
    await mkdir(appDataDir, { recursive: true })
    await writeFile(libraryPath, JSON.stringify(library, null, 2))
    return library
  }

  const load = async (): Promise<PetLibrary> => {
    try {
      const library = normalizeLibrary(JSON.parse(await readFile(libraryPath, 'utf8')))
      if (!library) {
        throw new Error('Invalid pet library')
      }
      return library
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
    const petIndex = library.pets.findIndex((pet) => pet.id === entry.id)
    const pets =
      petIndex === -1
        ? [...library.pets, entry]
        : library.pets.map((pet, index) => (index === petIndex ? entry : pet))
    const next = { currentPetId: entry.id, pets }
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
