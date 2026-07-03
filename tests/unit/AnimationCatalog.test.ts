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
      frames: [0, 1, 2, 3, 4, 5, 5, 5],
      durationsMs: [420, 170, 170, 210, 210, 220, 220, 220],
      loop: true
    })
  })

  it('returns waiting at a slower ambient tempo', () => {
    expect(getAnimationDefinition('waiting')?.durationsMs).toEqual([230, 230, 230, 230, 230, 390])
  })

  it('returns failed as an 8-frame looping animation', () => {
    expect(getAnimationDefinition('failed')?.frames).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(getAnimationDefinition('failed')?.durationsMs).toEqual([180, 180, 180, 180, 180, 180, 180, 310])
  })

  it('slows movement animations to a calmer desktop-pet tempo', () => {
    expect(getAnimationDefinition('running')?.durationsMs).toEqual([160, 160, 160, 160, 160, 290])
    expect(getAnimationDefinition('running-right')?.durationsMs).toEqual([160, 160, 160, 160, 160, 160, 160, 290])
  })
})
