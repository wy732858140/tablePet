import { describe, expect, it } from 'vitest'
import { getDraggedWindowPosition } from '../../src/renderer/window/windowDrag'

describe('getDraggedWindowPosition', () => {
  it('keeps the original pointer offset while moving the window', () => {
    expect(
      getDraggedWindowPosition({
        screenX: 420,
        screenY: 260,
        offsetX: 32,
        offsetY: 18
      })
    ).toEqual({ x: 388, y: 242 })
  })
})
