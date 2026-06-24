import { describe, expect, it } from 'vitest'
import { HATCH_PET_V1, getAnimationDefinition } from '../../src/renderer/pet/AnimationCatalog'

describe('AnimationCatalog', () => {
  it('exposes the Hatch Pet v1 atlas geometry', () => {
    expect(HATCH_PET_V1.cell).toEqual({ width: 192, height: 208 })
    expect(HATCH_PET_V1.atlas).toEqual({ width: 1536, height: 1872, columns: 8, rows: 9 })
  })

  it('returns the default idle animation', () => {
    expect(getAnimationDefinition('idle')).toEqual({
      state: 'idle',
      row: 0,
      frames: [0, 1, 2, 3, 4, 5],
      durationsMs: [280, 110, 110, 140, 140, 320],
      loop: true
    })
  })

  it('returns failed as an 8-frame looping animation', () => {
    expect(getAnimationDefinition('failed')?.frames).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(getAnimationDefinition('failed')?.durationsMs).toEqual([140, 140, 140, 140, 140, 140, 140, 240])
  })
})
