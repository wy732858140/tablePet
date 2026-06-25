import type { Point, Rect } from '@shared/types'

export const scaleRect = (rect: Rect, scale: number): Rect => ({
  x: rect.x * scale,
  y: rect.y * scale,
  width: rect.width * scale,
  height: rect.height * scale
})

export const containsPoint = (rect: Rect, point: Point): boolean => {
  return (
    point.x >= rect.x &&
    point.x < rect.x + rect.width &&
    point.y >= rect.y &&
    point.y < rect.y + rect.height
  )
}

export const fallbackFrameBounds = (): Rect => ({
  x: 0,
  y: 0,
  width: 192,
  height: 208
})
