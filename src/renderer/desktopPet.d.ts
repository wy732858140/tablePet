import type { ImportResult, PetLibrary, Point, Settings, Size } from '@shared/types'

declare global {
  interface Window {
    desktopPet: {
      listPets(): Promise<PetLibrary>
      importPetPackage(): Promise<ImportResult>
      setCurrentPet(id: string): Promise<PetLibrary>
      setPetScale(scale: number): Promise<Settings>
      getSettings(): Promise<Settings>
      setClickThrough(enabled: boolean, forward?: boolean): Promise<void>
      setPetPosition(point: Point): Promise<void>
      setWindowSize(size: Size): Promise<void>
      closeWindow(): Promise<void>
      onImportPetRequested(callback: () => void): () => void
      onTypingActivity(callback: () => void): () => void
    }
  }
}

export {}
