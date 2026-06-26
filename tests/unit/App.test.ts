import { readFile } from 'node:fs/promises'
import { createApp } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/app/App.vue'
import { MENU_WINDOW_SIZE, toPetWindowSize } from '../../src/shared/petWindowScale'
import type { PetLibrary, PetLibraryEntry, Settings } from '../../src/shared/types'

class RejectingImage {
  src = ''

  decode() {
    return Promise.reject(new Error('decode failed'))
  }
}

const settle = async () => {
  for (let index = 0; index < 4; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

const makePet = (id: string, displayName: string): PetLibraryEntry => ({
  id,
  displayName,
  description: '',
  packageDir: `/pets/${id}`,
  spritesheetPath: `/pets/${id}/spritesheet.webp`,
  sourcePath: `/source/${id}`,
  importedAt: '2026-06-25T00:00:00.000Z',
  status: 'ok'
})

const makeSettings = (): Settings => ({
  petWindow: {
    position: null,
    scale: 1,
    alwaysOnTop: true,
    visibleOnLaunch: true
  },
  behavior: {
    quietMode: false
  }
})

const mountApp = async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(App)

  app.mount(host)
  await settle()

  return { app, host }
}

const installDesktopPetMock = (library: PetLibrary, settings = makeSettings()) => {
  window.desktopPet = {
    listPets: vi.fn().mockResolvedValue(library),
    importPetPackage: vi.fn(),
    setCurrentPet: vi.fn(async (id: string) => ({
      ...library,
      currentPetId: id
    })),
    setPetScale: vi.fn(async (nextScale: number) => ({
      ...settings,
      petWindow: {
        ...settings.petWindow,
        scale: nextScale
      }
    })),
    getSettings: vi.fn().mockResolvedValue(settings),
    setClickThrough: vi.fn(),
    setPetPosition: vi.fn(),
    setWindowSize: vi.fn().mockResolvedValue(undefined),
    closeWindow: vi.fn(),
    onImportPetRequested: vi.fn(() => vi.fn())
  }
  return window.desktopPet
}

const clickButton = (host: Element, label: string) => {
  const button = host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
  if (!button) {
    throw new Error(`Missing button: ${label}`)
  }
  button.click()
}

const dispatchPointer = (
  target: EventTarget,
  type: string,
  point: {
    screenX: number
    screenY: number
    clientX?: number
    clientY?: number
    pointerId?: number
    button?: number
    buttons?: number
  }
) => {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent
  Object.assign(event, {
    pointerId: point.pointerId ?? 1,
    button: point.button ?? 0,
    buttons: point.buttons ?? 0,
    screenX: point.screenX,
    screenY: point.screenY,
    clientX: point.clientX ?? point.screenX,
    clientY: point.clientY ?? point.screenY
  })
  target.dispatchEvent(event)
}

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      setTransform: vi.fn()
    } as unknown as CanvasRenderingContext2D)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.replaceChildren()
  })

  it('opens to the pet menu instead of auto-rendering the current pet', async () => {
    const fubao = makePet('fubao', '福宝')
    const kunLike = makePet('kun-like', '鲲鲲')
    const settings = makeSettings()
    settings.petWindow.scale = 0.75
    const api = installDesktopPetMock({ currentPetId: fubao.id, pets: [fubao, kunLike] }, settings)

    const { app, host } = await mountApp()

    expect(host.textContent).toContain('Import Pet Package')
    expect(host.textContent).toContain('福宝')
    expect(host.textContent).toContain('鲲鲲')
    expect(host.querySelector('canvas')).toBeNull()
    expect(api.setWindowSize).toHaveBeenLastCalledWith(MENU_WINDOW_SIZE)

    app.unmount()
  })

  it('renders the cute menu shell and window controls', async () => {
    installDesktopPetMock({ currentPetId: null, pets: [] })

    const { app, host } = await mountApp()

    expect(host.querySelector('[data-window-shell="menu"]')).not.toBeNull()
    expect(host.querySelector('[data-menu-shell="cute-library"]')).not.toBeNull()
    expect(host.querySelector('.sprite-strip')).toBeNull()
    expect(host.querySelector('.menu-mascot')).not.toBeNull()
    expect(host.querySelector('[aria-label="Import Hatch Pet package"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="Quit TablePet"]')).not.toBeNull()
    expect(host.textContent).toContain('Choose your buddy')

    app.unmount()
  })

  it('does not show a default selected frame and keeps every pet action labeled Use', async () => {
    const fubao = makePet('fubao', '福宝')
    const kunLike = makePet('kun-like', '鲲鲲')
    installDesktopPetMock({ currentPetId: fubao.id, pets: [fubao, kunLike] })

    const { app, host } = await mountApp()

    expect(host.querySelector('[aria-current="true"]')).toBeNull()
    const selectButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('.select-button'))
    expect(selectButtons).toHaveLength(2)
    expect(selectButtons.map((button) => button.textContent?.trim())).toEqual(['Use', 'Use'])

    app.unmount()
  })

  it('keeps the pet menu minimal without duplicate status or count labels', async () => {
    const fubao = makePet('fubao', '福宝')
    const kunLike = makePet('kun-like', '鲲鲲')
    installDesktopPetMock({ currentPetId: null, pets: [fubao, kunLike] })

    const { app, host } = await mountApp()

    expect(host.querySelector('.menu-status-pill')).toBeNull()
    expect(host.querySelector('.menu-count')).toBeNull()
    expect(host.textContent).not.toContain('Ready')
    expect(host.textContent).not.toContain('2 pets')
    expect(host.textContent).toContain('Library')

    app.unmount()
  })

  it('does not use the rejected pink menu palette', async () => {
    const source = await Promise.all([
      readFile('src/renderer/app/App.vue', 'utf8'),
      readFile('src/renderer/app/PetLibraryView.vue', 'utf8')
    ])

    expect(source.join('\n')).not.toMatch(/#ff7aa2|#fff6fb|#ffe6ef|#f76896|#d64f78|255,\s*122|255,\s*229/)
  })

  it('selects a pet from the menu before rendering the desktop pet', async () => {
    const fubao = makePet('fubao', '福宝')
    const api = installDesktopPetMock({ currentPetId: null, pets: [fubao] })

    const { app, host } = await mountApp()
    clickButton(host, 'Select 福宝')
    await settle()

    expect(api.setCurrentPet).toHaveBeenCalledWith('fubao')
    expect(host.querySelector('canvas')).not.toBeNull()
    expect(host.textContent).not.toContain('Import Pet Package')
    expect(api.setWindowSize).toHaveBeenLastCalledWith(toPetWindowSize(1))

    app.unmount()
  })

  it('returns to the pet menu from the window bar', async () => {
    const fubao = makePet('fubao', '福宝')
    installDesktopPetMock({ currentPetId: null, pets: [fubao] })

    const { app, host } = await mountApp()
    clickButton(host, 'Select 福宝')
    await settle()
    clickButton(host, 'Open pet library')
    await settle()

    expect(host.textContent).toContain('Import Pet Package')
    expect(host.querySelector('canvas')).toBeNull()
    expect(window.desktopPet.setWindowSize).toHaveBeenLastCalledWith(MENU_WINDOW_SIZE)

    app.unmount()
  })

  it('resizes the selected pet from the bottom-right handle within scale bounds', async () => {
    const fubao = makePet('fubao', '福宝')
    const api = installDesktopPetMock({ currentPetId: null, pets: [fubao] }, makeSettings())

    const { app, host } = await mountApp()
    clickButton(host, 'Select 福宝')
    await settle()

    const handle = host.querySelector<HTMLElement>('[aria-label="Resize pet"]')
    if (!handle) {
      throw new Error('Missing resize handle.')
    }
    expect(handle.dataset.control).toBe('resize')
    expect(handle.querySelectorAll('.resize-arrow')).toHaveLength(4)

    dispatchPointer(handle, 'pointerdown', { screenX: 100, screenY: 100, buttons: 1 })
    dispatchPointer(handle, 'pointermove', { screenX: 500, screenY: 500, buttons: 1 })
    await settle()
    expect(api.setPetScale).toHaveBeenLastCalledWith(2.25)

    dispatchPointer(handle, 'pointermove', { screenX: -500, screenY: -500, buttons: 1 })
    await settle()
    expect(api.setPetScale).toHaveBeenLastCalledWith(0.75)

    dispatchPointer(handle, 'pointerup', { screenX: -500, screenY: -500 })

    app.unmount()
  })

  it('does not resize when the pointer moves over the handle without the primary button held', async () => {
    const fubao = makePet('fubao', '福宝')
    const api = installDesktopPetMock({ currentPetId: null, pets: [fubao] }, makeSettings())

    const { app, host } = await mountApp()
    clickButton(host, 'Select 福宝')
    await settle()

    const handle = host.querySelector<HTMLElement>('[aria-label="Resize pet"]')
    if (!handle) {
      throw new Error('Missing resize handle.')
    }

    dispatchPointer(handle, 'pointerdown', { screenX: 100, screenY: 100, buttons: 1 })
    dispatchPointer(handle, 'pointermove', { screenX: 180, screenY: 180, buttons: 0 })
    await settle()

    expect(api.setPetScale).not.toHaveBeenCalled()

    app.unmount()
  })

  it('keeps the pet canvas mounted when a selected pet reports a load error', async () => {
    vi.stubGlobal('Image', RejectingImage)

    const pet = makePet('loaded-pet', 'Loaded Pet')
    installDesktopPetMock({ currentPetId: null, pets: [pet] })

    const { app, host } = await mountApp()
    clickButton(host, 'Select Loaded Pet')
    await settle()

    expect(host.querySelector('canvas')).not.toBeNull()
    expect(host.textContent).toContain('Unable to load pet spritesheet.')
    expect(host.textContent).not.toContain('Import Pet Package')

    app.unmount()
  })

  it('calls the desktop API when the close button is clicked', async () => {
    installDesktopPetMock({ currentPetId: null, pets: [] })

    const { app, host } = await mountApp()
    host.querySelector<HTMLButtonElement>('[aria-label="Quit TablePet"]')?.click()

    expect(window.desktopPet.closeWindow).toHaveBeenCalled()

    app.unmount()
  })
})
