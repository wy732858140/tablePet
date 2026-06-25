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
    setPosition: vi.fn(),
    setClickThrough: vi.fn(),
    ensureVisible: vi.fn()
  }
  const importer = { importFolder: vi.fn() }
  const libraryStore = { load: vi.fn(), save: vi.fn(), upsert: vi.fn(), setCurrentPet: vi.fn() }
  const settingsStore = { load: vi.fn(), save: vi.fn() }

  registerIpcHandlers(windowController, importer, libraryStore, settingsStore)

  return { windowController }
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

  it.each([null, { x: 1 }, { x: Number.NaN, y: 2 }, { x: 1, y: Number.POSITIVE_INFINITY }])(
    'rejects invalid pet positions: %s',
    (point) => {
      createHandlerContext()
      expect(() => getHandler('window:set-position')(undefined, point)).toThrow('Invalid pet position.')
    }
  )
})
