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

  it('plays jumping after double click and returns to idle after animation end', () => {
    const engine = createBehaviorEngine()
    engine.doubleClick()
    expect(engine.currentAnimation()).toBe('jumping')
    engine.animationEnded()
    expect(engine.currentAnimation()).toBe('idle')
  })

  it('enters waiting from idle and lets direct interaction replace it', () => {
    const engine = createBehaviorEngine()
    engine.wait()
    expect(engine.currentAnimation()).toBe('waiting')
    engine.click()
    expect(engine.currentAnimation()).toBe('waving')
  })

  it('uses review as an interruptible processing animation', () => {
    const engine = createBehaviorEngine()
    engine.reviewStart()
    expect(engine.currentAnimation()).toBe('review')
    engine.click()
    expect(engine.currentAnimation()).toBe('waving')
  })

  it('uses running for typing activity and returns to idle when typing stops', () => {
    const engine = createBehaviorEngine()
    engine.typingStart()
    expect(engine.currentAnimation()).toBe('running')
    engine.typingEnd()
    expect(engine.currentAnimation()).toBe('idle')
  })

  it('does not let typing activity interrupt gestures, dragging, or failures', () => {
    const engine = createBehaviorEngine()

    engine.click()
    engine.typingStart()
    expect(engine.currentAnimation()).toBe('waving')
    engine.animationEnded()

    engine.dragStart({ x: 10, y: 10 })
    engine.typingStart()
    expect(engine.currentAnimation()).toBe('running-right')
    engine.dragEnd()

    engine.fail()
    engine.typingStart()
    expect(engine.currentAnimation()).toBe('failed')
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
