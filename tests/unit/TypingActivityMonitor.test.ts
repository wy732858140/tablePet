import { describe, expect, it, vi } from 'vitest'
import { createTypingActivityMonitor, type KeyboardActivityHook } from '../../src/main/typing/TypingActivityMonitor'

const makeHook = () => {
  const handlers = new Map<string, (event?: unknown) => void>()
  const hook: KeyboardActivityHook = {
    on: vi.fn((eventName, callback) => {
      handlers.set(eventName, callback)
    }),
    start: vi.fn(),
    stop: vi.fn()
  }

  return {
    hook,
    emitKeydown: (event: unknown) => handlers.get('keydown')?.(event)
  }
}

describe('TypingActivityMonitor', () => {
  it('emits typing activity without exposing key payloads', async () => {
    const { hook, emitKeydown } = makeHook()
    const emitTypingActivity = vi.fn()
    const monitor = createTypingActivityMonitor(emitTypingActivity, async () => hook, async () => true)

    await expect(monitor.start()).resolves.toBe(true)
    emitKeydown({ keycode: 30, rawcode: 65, shiftKey: true })

    expect(hook.on).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(hook.start).toHaveBeenCalled()
    expect(emitTypingActivity).toHaveBeenCalledWith()
  })

  it('stops the hook after it has started', async () => {
    const { hook } = makeHook()
    const monitor = createTypingActivityMonitor(vi.fn(), async () => hook, async () => true)

    await monitor.start()
    monitor.stop()

    expect(hook.stop).toHaveBeenCalled()
  })

  it('degrades gracefully when the native hook cannot start', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const hook = makeHook().hook
    vi.mocked(hook.start).mockImplementation(() => {
      throw new Error('missing accessibility permission')
    })
    const monitor = createTypingActivityMonitor(vi.fn(), async () => hook, async () => true)

    await expect(monitor.start()).resolves.toBe(false)
    expect(warn).toHaveBeenCalledWith('Global typing activity monitor is unavailable.', expect.any(Error))
    expect(() => monitor.stop()).not.toThrow()
  })

  it('does not load the native hook when the access guard denies monitoring', async () => {
    const { hook } = makeHook()
    const loadHook = vi.fn(async () => hook)
    const monitor = createTypingActivityMonitor(vi.fn(), loadHook, async () => false)

    await expect(monitor.start()).resolves.toBe(false)
    expect(loadHook).not.toHaveBeenCalled()
    expect(hook.start).not.toHaveBeenCalled()
  })
})
