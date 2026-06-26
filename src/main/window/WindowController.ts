import { BrowserWindow, screen } from 'electron'
import type { Point, Size } from '../../shared/types.js'

export type WindowController = ReturnType<typeof createWindowController>

const defaultPetWindowSize = (): Size => ({ width: 288, height: 312 })

export const createWindowController = (
  preloadPath: string,
  rendererUrl: string,
  initialSize: Size = defaultPetWindowSize()
) => {
  let petWindow: BrowserWindow | null = null

  const getLivePetWindow = () => {
    if (petWindow?.isDestroyed()) {
      petWindow = null
    }
    return petWindow
  }

  const createPetWindow = () => {
    const window = new BrowserWindow({
      width: Math.round(initialSize.width),
      height: Math.round(initialSize.height),
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

  const setSize = (size: Size) => {
    const window = getLivePetWindow()
    if (!window) return
    window.setSize(Math.round(size.width), Math.round(size.height))
    ensureVisible()
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
    setSize,
    setPosition,
    setClickThrough,
    ensureVisible
  }
}
