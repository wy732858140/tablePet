import { describe, expect, it } from 'vitest'
import { createBehaviorEngine } from '../../src/renderer/pet/BehaviorEngine'

describe('BehaviorEngine', () => {
  it('starts idle', () => {
    const engine = createBehaviorEngine()
    expect(engine.currentAnimation()).toBe('idle')
  })

  it('plays waving after click and returns to idle after animation end', () => {
    const engine = createBehaviorEngine()
    engine.click()
    expect(engine.currentAnimation()).toBe('waving')
    engine.animationEnded()
    expect(engine.currentAnimation()).toBe('idle')
  })

  it('uses directional running while dragging', () => {
    const engine = createBehaviorEngine()
    engine.dragStart({ x: 10, y: 10 })
    engine.dragMove({ x: 30, y: 10 })
    expect(engine.currentAnimation()).toBe('running-right')
    engine.dragMove({ x: 12, y: 10 })
    expect(engine.currentAnimation()).toBe('running-left')
    engine.dragEnd()
    expect(engine.currentAnimation()).toBe('idle')
  })

  it('failed state has priority until recovery', () => {
    const engine = createBehaviorEngine()
    engine.fail()
    engine.click()
    expect(engine.currentAnimation()).toBe('failed')
    engine.recover()
    expect(engine.currentAnimation()).toBe('idle')
  })
})
