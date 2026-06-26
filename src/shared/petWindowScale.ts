import { HATCH_PET_V1_CELL } from './hatchPetV1.js'
import type { Size } from './types.js'

export const PET_SCALE_MIN = 0.75
export const PET_SCALE_MAX = 2.25
export const PET_SCALE_DEFAULT = 1.5
export const MENU_WINDOW_SIZE: Size = { width: 420, height: 540 }

export const clampPetScale = (scale: number): number =>
  Math.min(Math.max(scale, PET_SCALE_MIN), PET_SCALE_MAX)

export const toPetWindowSize = (scale: number): Size => {
  const clamped = clampPetScale(scale)
  return {
    width: Math.round(HATCH_PET_V1_CELL.width * clamped),
    height: Math.round(HATCH_PET_V1_CELL.height * clamped)
  }
}
