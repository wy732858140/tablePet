import { BrowserWindow, screen } from 'electron'
import type { Point } from '../../shared/types.js'

export type WindowController = ReturnType<typeof createWindowController>

export const createWindowController = (preloadPath: string, rendererUrl: string) => {
  let petWindow: BrowserWindow | null = null

  const createPetWindow = () => {
    petWindow = new BrowserWindow({
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
    petWindow.setAlwaysOnTop(true, 'floating')
    void petWindow.loadURL(rendererUrl)
    return petWindow
  }

  const setClickThrough = (enabled: boolean, forward = true) => {
    petWindow?.setIgnoreMouseEvents(enabled, { forward })
  }

  const setPosition = (point: Point) => {
    petWindow?.setPosition(Math.round(point.x), Math.round(point.y))
  }

  const ensureVisible = () => {
    if (!petWindow) return
    const bounds = petWindow.getBounds()
    const display = screen.getDisplayMatching(bounds)
    const area = display.workArea
    const x = Math.min(Math.max(bounds.x, area.x), area.x + area.width - bounds.width)
    const y = Math.min(Math.max(bounds.y, area.y), area.y + area.height - bounds.height)
    petWindow.setPosition(x, y)
  }

  return {
    createPetWindow,
    getPetWindow: () => petWindow,
    show: () => petWindow?.show(),
    hide: () => petWindow?.hide(),
    setPosition,
    setClickThrough,
    ensureVisible
  }
}
