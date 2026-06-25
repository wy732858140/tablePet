import { contextBridge, ipcRenderer } from 'electron'
import type { ImportResult, PetLibrary, Point, Settings } from '../shared/types.js'

const api = {
  listPets: (): Promise<PetLibrary> => ipcRenderer.invoke('pet:list'),
  importPetPackage: (): Promise<ImportResult> => ipcRenderer.invoke('pet:import-folder'),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setClickThrough: (enabled: boolean, forward = true): Promise<void> =>
    ipcRenderer.invoke('window:set-click-through', enabled, forward),
  setPetPosition: (point: Point): Promise<void> => ipcRenderer.invoke('window:set-position', point),
  onImportPetRequested: (callback: () => void): (() => void) => {
    const listener = () => callback()
    ipcRenderer.on('ui:import-pet', listener)
    return () => ipcRenderer.off('ui:import-pet', listener)
  }
}

contextBridge.exposeInMainWorld('desktopPet', api)

export type DesktopPetApi = typeof api
