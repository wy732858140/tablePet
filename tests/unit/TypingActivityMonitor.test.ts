import { describe, expect, it, vi } from 'vitest'
import { createTypingActivityMonitor, type KeyboardActivityHook } from '../../src/main/typing/TypingActivityMonitor'

const electronMock = vi.hoisted(() => ({
  isTrustedAccessibilityClient: vi.fn(() => false)
}))

vi.mock('electron', () => ({
  systemPreferences: {
    isTrustedAccessibilityClient: electronMock.isTrustedAccessibilityClient
  }
}))

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
  it('asks macOS to prompt for accessibility access before loading the native hook', async () => {
    const { hook } = makeHook()
    const loadHook = vi.fn(async () => hook)
    const monitor = createTypingActivityMonitor(vi.fn(), loadHook)

    await expect(monitor.start()).resolves.toBe(false)

    if (process.platform === 'darwin') {
      expect(electronMock.isTrustedAccessibilityClient).toHaveBeenCalledWith(true)
      expect(loadHook).not.toHaveBeenCalled()
      expect(hook.start).not.toHaveBeenCalled()
    }

    monitor.stop()
  })

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

    monitor.stop()
  })

  it('requests access before deciding whether the native hook can start', async () => {
    const { hook } = makeHook()
    const requestAccess = vi.fn(async () => true)
    const monitor = createTypingActivityMonitor(vi.fn(), async () => hook, requestAccess)

    await expect(monitor.start()).resolves.toBe(true)

    expect(requestAccess).toHaveBeenCalledWith(true)
    expect(hook.start).toHaveBeenCalledOnce()
  })

  it('quietly retries after the permission prompt so newly granted access starts listening', async () => {
    vi.useFakeTimers()
    const { hook } = makeHook()
    const loadHook = vi.fn(async () => hook)
    const requestAccess = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const monitor = createTypingActivityMonitor(vi.fn(), loadHook, requestAccess)

    await expect(monitor.start()).resolves.toBe(false)
    expect(requestAccess).toHaveBeenNthCalledWith(1, true)
    expect(loadHook).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1_999)
    expect(loadHook).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(requestAccess).toHaveBeenNthCalledWith(2, false)
    expect(loadHook).toHaveBeenCalledOnce()
    expect(hook.start).toHaveBeenCalledOnce()

    monitor.stop()
    vi.useRealTimers()
  })

  it('can retry after access is granted without loading the hook while denied', async () => {
    const { hook } = makeHook()
    const loadHook = vi.fn(async () => hook)
    const requestAccess = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const monitor = createTypingActivityMonitor(vi.fn(), loadHook, requestAccess)

    await expect(monitor.start()).resolves.toBe(false)
    expect(loadHook).not.toHaveBeenCalled()

    await expect(monitor.start()).resolves.toBe(true)
    expect(loadHook).toHaveBeenCalledOnce()
    expect(hook.start).toHaveBeenCalledOnce()
  })
})
