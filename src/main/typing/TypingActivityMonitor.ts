export type KeyboardActivityHook = {
  on(eventName: 'keydown', callback: (event?: unknown) => void): void
  start(): void
  stop(): void
}

type HookLoader = () => Promise<KeyboardActivityHook>
type AccessGuard = () => boolean | Promise<boolean>

const loadUiohook: HookLoader = async () => {
  const module = (await import('uiohook-napi')) as { uIOhook: KeyboardActivityHook }
  return module.uIOhook
}

const canStartNativeHook: AccessGuard = async () => {
  if (process.platform !== 'darwin') {
    return true
  }
  const { systemPreferences } = await import('electron')
  return systemPreferences.isTrustedAccessibilityClient(false)
}

export const createTypingActivityMonitor = (
  emitTypingActivity: () => void,
  loadHook: HookLoader = loadUiohook,
  canStart: AccessGuard = canStartNativeHook
) => {
  let hook: KeyboardActivityHook | null = null
  let started = false

  const start = async (): Promise<boolean> => {
    if (started) return true

    try {
      if (!(await canStart())) {
        return false
      }
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
    if (!started || !hook) return
    hook.stop()
    hook = null
    started = false
  }

  return { start, stop }
}
