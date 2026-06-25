import type { ImportResult, PetLibrary, Point, Settings } from '@shared/types'

declare global {
  interface Window {
    desktopPet: {
      listPets(): Promise<PetLibrary>
      importPetPackage(): Promise<ImportResult>
      getSettings(): Promise<Settings>
      setClickThrough(enabled: boolean, forward?: boolean): Promise<void>
      setPetPosition(point: Point): Promise<void>
      onImportPetRequested(callback: () => void): () => void
    }
  }
}

export {}
