import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerIpcHandlers } from '../../src/main/ipc/IpcHandlers'

const electronMock = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  return {
    handlers,
    showOpenDialog: vi.fn(),
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler)
    })
  }
})

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: electronMock.showOpenDialog
  },
  ipcMain: {
    handle: electronMock.handle
  }
}))

const createHandlerContext = () => {
  const windowController = {
    createPetWindow: vi.fn(),
    getPetWindow: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    setSize: vi.fn(),
    setPosition: vi.fn(),
    setClickThrough: vi.fn(),
    ensureVisible: vi.fn()
  }
  const importer = { importFolder: vi.fn() }
  const libraryStore = { load: vi.fn(), save: vi.fn(), upsert: vi.fn(), setCurrentPet: vi.fn() }
  const appLifecycle = { quit: vi.fn() }
  const settingsStore = {
    load: vi.fn().mockResolvedValue({
      petWindow: {
        position: null,
        scale: 1,
        alwaysOnTop: true,
        visibleOnLaunch: true
      },
      behavior: { quietMode: false }
    }),
    save: vi.fn(async (settings) => settings)
  }

  registerIpcHandlers(windowController, importer, libraryStore, settingsStore, appLifecycle)

  return { windowController, libraryStore, settingsStore, appLifecycle }
}

const getHandler = (channel: string) => {
  const handler = electronMock.handlers.get(channel)
  if (!handler) {
    throw new Error(`Missing IPC handler: ${channel}`)
  }
  return handler
}

describe('IpcHandlers', () => {
  beforeEach(() => {
    electronMock.handlers.clear()
    electronMock.handle.mockClear()
    electronMock.showOpenDialog.mockReset()
  })

  it('defaults click-through forwarding to true', () => {
    const { windowController } = createHandlerContext()
    getHandler('window:set-click-through')(undefined, true)
    expect(windowController.setClickThrough).toHaveBeenCalledWith(true, true)
  })

  it.each([
    ['enabled', 'yes', true],
    ['forward', true, 'yes']
  ])('rejects invalid click-through %s values', (_field, enabled, forward) => {
    createHandlerContext()
    expect(() => getHandler('window:set-click-through')(undefined, enabled, forward)).toThrow(
      'Invalid click-through options.'
    )
  })

  it('passes finite pet positions through to the window controller', () => {
    const { windowController } = createHandlerContext()
    const point = { x: 10.5, y: -20 }
    getHandler('window:set-position')(undefined, point)
    expect(windowController.setPosition).toHaveBeenCalledWith(point)
  })

  it('passes finite window sizes through to the window controller', () => {
    const { windowController } = createHandlerContext()
    const size = { width: 420, height: 540 }
    getHandler('window:set-size')(undefined, size)
    expect(windowController.setSize).toHaveBeenCalledWith(size)
  })

  it('quits the app through IPC instead of leaving a tray-only process', () => {
    const { appLifecycle, windowController } = createHandlerContext()
    getHandler('window:close')(undefined)
    expect(appLifecycle.quit).toHaveBeenCalled()
    expect(windowController.close).not.toHaveBeenCalled()
  })

  it('sets the current pet through IPC', async () => {
    const { libraryStore } = createHandlerContext()
    libraryStore.setCurrentPet.mockResolvedValue({ currentPetId: 'fubao', pets: [] })

    await expect(getHandler('pet:set-current')(undefined, 'fubao')).resolves.toEqual({
      currentPetId: 'fubao',
      pets: []
    })

    expect(libraryStore.setCurrentPet).toHaveBeenCalledWith('fubao')
  })

  it.each([null, '', '   ', 42])('rejects invalid current pet ids: %s', (id) => {
    createHandlerContext()
    expect(() => getHandler('pet:set-current')(undefined, id)).toThrow('Invalid pet id.')
  })

  it('saves pet scale and resizes the pet window through IPC', async () => {
    const { settingsStore, windowController } = createHandlerContext()

    await expect(getHandler('settings:set-pet-scale')(undefined, 2)).resolves.toEqual({
      petWindow: {
        position: null,
        scale: 2,
        alwaysOnTop: true,
        visibleOnLaunch: true
      },
      behavior: { quietMode: false }
    })

    expect(settingsStore.save).toHaveBeenCalledWith({
      petWindow: {
        position: null,
        scale: 2,
        alwaysOnTop: true,
        visibleOnLaunch: true
      },
      behavior: { quietMode: false }
    })
    expect(windowController.setSize).toHaveBeenCalledWith({ width: 384, height: 416 })
  })

  it.each([null, 'large', 0, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid pet scale values: %s',
    async (scale) => {
      createHandlerContext()
      await expect(getHandler('settings:set-pet-scale')(undefined, scale)).rejects.toThrow('Invalid pet scale.')
    }
  )

  it.each([null, { x: 1 }, { x: Number.NaN, y: 2 }, { x: 1, y: Number.POSITIVE_INFINITY }])(
    'rejects invalid pet positions: %s',
    (point) => {
      createHandlerContext()
      expect(() => getHandler('window:set-position')(undefined, point)).toThrow('Invalid pet position.')
    }
  )

  it.each([null, { width: 1 }, { width: 0, height: 200 }, { width: Number.NaN, height: 2 }])(
    'rejects invalid window sizes: %s',
    (size) => {
      createHandlerContext()
      expect(() => getHandler('window:set-size')(undefined, size)).toThrow('Invalid window size.')
    }
  )
})
