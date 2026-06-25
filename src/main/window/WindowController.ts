import { BrowserWindow, screen } from 'electron'
import type { Point } from '../../shared/types.js'

export type WindowController = ReturnType<typeof createWindowController>

export const createWindowController = (preloadPath: string, rendererUrl: string) => {
  let petWindow: BrowserWindow | null = null

  const getLivePetWindow = () => {
    if (petWindow?.isDestroyed()) {
      petWindow = null
    }
    return petWindow
  }

  const createPetWindow = () => {
    const window = new BrowserWindow({
      width: 288,
      height: 312,
      frame: false,
      transparent: true,
      resizable: false,
      hasShadow: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false
      }
    })
    petWindow = window
    window.on('closed', () => {
      if (petWindow === window) {
        petWindow = null
      }
    })
    window.setAlwaysOnTop(true, 'floating')
    void window.loadURL(rendererUrl)
    return window
  }

  const setClickThrough = (enabled: boolean, forward = true) => {
    getLivePetWindow()?.setIgnoreMouseEvents(enabled, { forward })
  }

  const setPosition = (point: Point) => {
    getLivePetWindow()?.setPosition(Math.round(point.x), Math.round(point.y))
  }

  const close = () => {
    getLivePetWindow()?.close()
  }

  const ensureVisible = () => {
    const window = getLivePetWindow()
    if (!window) return
    const bounds = window.getBounds()
    const display = screen.getDisplayMatching(bounds)
    const area = display.workArea
    const x = Math.min(Math.max(bounds.x, area.x), area.x + area.width - bounds.width)
    const y = Math.min(Math.max(bounds.y, area.y), area.y + area.height - bounds.height)
    window.setPosition(x, y)
  }

  return {
    createPetWindow,
    getPetWindow: getLivePetWindow,
    show: () => {
      const window = getLivePetWindow() ?? createPetWindow()
      window.show()
    },
    hide: () => getLivePetWindow()?.hide(),
    close,
    setPosition,
    setClickThrough,
    ensureVisible
  }
}
