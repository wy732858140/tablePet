import type { Point } from '@shared/types'

export type WindowDragInput = {
  screenX: number
  screenY: number
  offsetX: number
  offsetY: number
}

export const getDraggedWindowPosition = ({ screenX, screenY, offsetX, offsetY }: WindowDragInput): Point => ({
  x: screenX - offsetX,
  y: screenY - offsetY
})
