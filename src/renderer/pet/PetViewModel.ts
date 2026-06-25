import type { LoadedPet } from '@shared/types'

export type PetViewState =
  | { kind: 'empty' }
  | { kind: 'loaded'; pet: LoadedPet }
  | { kind: 'error'; message: string }

export const emptyPetView = (): PetViewState => ({ kind: 'empty' })
