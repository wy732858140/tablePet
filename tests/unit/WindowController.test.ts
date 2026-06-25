import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWindowController } from '../../src/main/window/WindowController'

const electronMock = vi.hoisted(() => {
  class FakeBrowserWindow {
    static instances: FakeBrowserWindow[] = []

    destroyed = false
    listeners = new Map<string, () => void>()
    setAlwaysOnTop = vi.fn()
    loadURL = vi.fn()
    setIgnoreMouseEvents = vi.fn()
    setPosition = vi.fn()
    getBounds = vi.fn(() => ({ x: 40, y: 40, width: 288, height: 312 }))
    show = vi.fn()
    hide = vi.fn()
    isDestroyed = vi.fn(() => this.destroyed)

    constructor() {
      FakeBrowserWindow.instances.push(this)
    }

    on(eventName: string, listener: () => void) {
      this.listeners.set(eventName, listener)
      return this
    }

    emitClosed() {
      this.listeners.get('closed')?.()
    }
  }

  return {
    BrowserWindow: FakeBrowserWindow,
    getDisplayMatching: vi.fn(() => ({ workArea: { x: 0, y: 0, width: 1024, height: 768 } }))
  }
})

vi.mock('electron', () => ({
  BrowserWindow: electronMock.BrowserWindow,
  screen: {
    getDisplayMatching: electronMock.getDisplayMatching
  }
}))

type FakeBrowserWindow = InstanceType<typeof electronMock.BrowserWindow>

describe('WindowController', () => {
  beforeEach(() => {
    electronMock.BrowserWindow.instances.length = 0
    electronMock.getDisplayMatching.mockClear()
  })

  it('clears the window reference after the pet window closes', () => {
    const controller = createWindowController('/preload.cjs', 'http://127.0.0.1:5173')
    const petWindow = controller.createPetWindow() as unknown as FakeBrowserWindow
    petWindow.emitClosed()
    expect(controller.getPetWindow()).toBeNull()
  })

  it('treats destroyed pet windows as absent before invoking window methods', () => {
    const controller = createWindowController('/preload.cjs', 'http://127.0.0.1:5173')
    const petWindow = controller.createPetWindow() as unknown as FakeBrowserWindow
    petWindow.destroyed = true

    expect(controller.getPetWindow()).toBeNull()

    controller.show()
    controller.hide()
    controller.setPosition({ x: 1.4, y: 2.6 })
    controller.setClickThrough(true)
    controller.ensureVisible()

    expect(petWindow.show).not.toHaveBeenCalled()
    expect(petWindow.hide).not.toHaveBeenCalled()
    expect(petWindow.setPosition).not.toHaveBeenCalled()
    expect(petWindow.setIgnoreMouseEvents).not.toHaveBeenCalled()
    expect(petWindow.getBounds).not.toHaveBeenCalled()
  })
})
