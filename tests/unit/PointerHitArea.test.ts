import { describe, expect, it } from 'vitest'
import { containsPoint, scaleRect } from '../../src/renderer/pet/PointerHitArea'

describe('PointerHitArea', () => {
  it('scales frame bounds', () => {
    expect(scaleRect({ x: 10, y: 20, width: 30, height: 40 }, 2)).toEqual({
      x: 20,
      y: 40,
      width: 60,
      height: 80
    })
  })

  it('detects points inside and outside a rect', () => {
    const rect = { x: 20, y: 40, width: 60, height: 80 }
    expect(containsPoint(rect, { x: 21, y: 41 })).toBe(true)
    expect(containsPoint(rect, { x: 100, y: 41 })).toBe(false)
  })
})
