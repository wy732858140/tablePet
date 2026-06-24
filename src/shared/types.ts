export type HatchPetState =
  | 'idle'
  | 'running-right'
  | 'running-left'
  | 'waving'
  | 'jumping'
  | 'failed'
  | 'waiting'
  | 'running'
  | 'review'

export type Point = { x: number; y: number }
export type Size = { width: number; height: number }
export type Rect = Point & Size

export type HatchPetManifest = {
  id: string
  displayName?: string
  description?: string
  spritesheetPath: string
  schemaVersion?: string
  cell?: Size
  atlas?: { columns: number; rows: number }
  animations?: Record<string, unknown>
  interactions?: Record<string, unknown>
}

export type AnimationDefinition = {
  state: HatchPetState
  row: number
  frames: number[]
  durationsMs: number[]
  loop: boolean
}

export type LoadedPet = {
  id: string
  displayName: string
  description: string
  packageDir: string
  spritesheetPath: string
}

export type PetLibraryEntry = LoadedPet & {
  sourcePath: string
  importedAt: string
  status: 'ok' | 'error'
}

export type PetLibrary = {
  currentPetId: string | null
  pets: PetLibraryEntry[]
}

export type Settings = {
  petWindow: {
    position: Point | null
    scale: number
    alwaysOnTop: boolean
    visibleOnLaunch: boolean
  }
  behavior: {
    quietMode: boolean
  }
}

export type ImportResult =
  | { ok: true; pet: LoadedPet }
  | { ok: false; code: ImportErrorCode; message: string }

export type ImportErrorCode =
  | 'missing_manifest'
  | 'invalid_manifest_json'
  | 'missing_id'
  | 'missing_spritesheet_path'
  | 'missing_spritesheet'
  | 'invalid_image'
  | 'invalid_atlas_size'
  | 'copy_failed'
