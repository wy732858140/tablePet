import { readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join } from 'node:path'
import type { ImportErrorCode, LoadedPet, PetLibraryEntry } from '../../shared/types.js'
import type { createPetLibraryStore } from './PetLibraryStore.js'
import type { createPetPackageImporter } from './PetPackageImporter.js'

type PetImporter = ReturnType<typeof createPetPackageImporter>
type PetLibraryStore = ReturnType<typeof createPetLibraryStore>

export type DefaultPetInstallResult = {
  imported: string[]
  failed: Array<{ sourcePath: string; code: ImportErrorCode; message: string }>
}

const toLibraryEntry = (pet: LoadedPet, sourcePath: string): PetLibraryEntry => ({
  ...pet,
  sourcePath,
  importedAt: new Date().toISOString(),
  status: 'ok'
})

export const installDefaultPets = async (
  defaultPetsDir: string,
  importer: PetImporter,
  libraryStore: PetLibraryStore
): Promise<DefaultPetInstallResult> => {
  const library = await libraryStore.load()
  const previousCurrentPetId = library.currentPetId
  const removedPetIds = new Set(library.removedPetIds ?? [])
  const imported: string[] = []
  const failed: DefaultPetInstallResult['failed'] = []

  let entries: Dirent[]
  try {
    entries = await readdir(defaultPetsDir, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { imported, failed }
    }
    throw error
  }

  const defaultPetDirs = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !removedPetIds.has(entry.name))
    .map((entry) => join(defaultPetsDir, entry.name))
    .sort((a, b) => a.localeCompare(b))

  for (const defaultPetDir of defaultPetDirs) {
    const result = await importer.importFolder(defaultPetDir)
    if (!result.ok) {
      failed.push({ sourcePath: defaultPetDir, code: result.code, message: result.message })
      continue
    }

    imported.push(result.pet.id)
    await libraryStore.upsert(toLibraryEntry(result.pet, defaultPetDir))
  }

  if (previousCurrentPetId) {
    await libraryStore.setCurrentPet(previousCurrentPetId).catch(() => undefined)
  } else if (imported.length > 0) {
    const installedLibrary = await libraryStore.load()
    await libraryStore.save({ ...installedLibrary, currentPetId: null })
  }

  return { imported, failed }
}
