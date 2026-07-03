export type KeyboardActivityHook = {
  on(eventName: 'keydown', callback: (event?: unknown) => void): void
  start(): void
  stop(): void
}

type HookLoader = () => Promise<KeyboardActivityHook>
type AccessGuard = (prompt: boolean) => boolean | Promise<boolean>

const loadUiohook: HookLoader = async () => {
  const module = (await import('uiohook-napi')) as { uIOhook: KeyboardActivityHook }
  return module.uIOhook
}

const canStartNativeHook: AccessGuard = async (prompt) => {
  if (process.platform !== 'darwin') {
    return true
  }
  const { systemPreferences } = await import('electron')
  return systemPreferences.isTrustedAccessibilityClient(prompt)
}

const accessRetryMs = 2_000

export const createTypingActivityMonitor = (
  emitTypingActivity: () => void,
  loadHook: HookLoader = loadUiohook,
  canStart: AccessGuard = canStartNativeHook
) => {
  let hook: KeyboardActivityHook | null = null
  let started = false
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  const clearRetryTimer = () => {
    if (retryTimer === null) return
    clearTimeout(retryTimer)
    retryTimer = null
  }

  const scheduleAccessRetry = () => {
    if (retryTimer !== null) return
    retryTimer = setTimeout(() => {
      retryTimer = null
      void start(false)
    }, accessRetryMs)
  }

  const start = async (promptForAccess = true): Promise<boolean> => {
    if (started) return true

    try {
      if (!(await canStart(promptForAccess))) {
        scheduleAccessRetry()
        return false
      }
      clearRetryTimer()
      hook = await loadHook()
      hook.on('keydown', () => {
        emitTypingActivity()
      })
      hook.start()
      started = true
      return true
    } catch (error) {
      hook = null
      started = false
      console.warn('Global typing activity monitor is unavailable.', error)
      return false
    }
  }

  const stop = () => {
    clearRetryTimer()
    if (!started || !hook) return
    hook.stop()
    hook = null
    started = false
  }

  return { start, stop }
}
