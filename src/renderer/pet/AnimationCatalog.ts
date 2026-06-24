import { HATCH_PET_V1_ANIMATIONS, HATCH_PET_V1_ATLAS, HATCH_PET_V1_CELL } from '@shared/hatchPetV1'
import type { AnimationDefinition, HatchPetState } from '@shared/types'

export const HATCH_PET_V1 = {
  atlas: HATCH_PET_V1_ATLAS,
  cell: HATCH_PET_V1_CELL
} as const

export const getAnimationDefinition = (state: HatchPetState): AnimationDefinition | undefined => {
  return HATCH_PET_V1_ANIMATIONS[state]
}

export const getFrameSourceRect = (definition: AnimationDefinition, frameIndex: number) => {
  const column = definition.frames[frameIndex]
  if (column === undefined) {
    throw new RangeError(`Frame index ${frameIndex} is out of bounds for ${definition.state}`)
  }
  return {
    x: column * HATCH_PET_V1_CELL.width,
    y: definition.row * HATCH_PET_V1_CELL.height,
    width: HATCH_PET_V1_CELL.width,
    height: HATCH_PET_V1_CELL.height
  }
}
