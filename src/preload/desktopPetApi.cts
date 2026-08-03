import { contextBridge, ipcRenderer } from 'electron'
import type { ImportResult, PetLibrary, Point, Settings, Size } from '../shared/types.js'

const api = {
  listPets: (): Promise<PetLibrary> => ipcRenderer.invoke('pet:list'),
  importPetPackage: (): Promise<ImportResult> => ipcRenderer.invoke('pet:import-folder'),
  setCurrentPet: (id: string): Promise<PetLibrary> => ipcRenderer.invoke('pet:set-current', id),
  deletePet: (id: string): Promise<PetLibrary> => ipcRenderer.invoke('pet:delete', id),
  setPetScale: (scale: number): Promise<Settings> => ipcRenderer.invoke('settings:set-pet-scale', scale),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setClickThrough: (enabled: boolean, forward = true): Promise<void> =>
    ipcRenderer.invoke('window:set-click-through', enabled, forward),
  setPetPosition: (point: Point): Promise<void> => ipcRenderer.invoke('window:set-position', point),
  setWindowSize: (size: Size): Promise<void> => ipcRenderer.invoke('window:set-size', size),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
  onImportPetRequested: (callback: () => void): (() => void) => {
    const listener = () => callback()
    ipcRenderer.on('ui:import-pet', listener)
    return () => ipcRenderer.off('ui:import-pet', listener)
  },
  onTypingActivity: (callback: () => void): (() => void) => {
    const listener = () => callback()
    ipcRenderer.on('ui:typing-activity', listener)
    return () => ipcRenderer.off('ui:typing-activity', listener)
  }
}

contextBridge.exposeInMainWorld('desktopPet', api)

export type DesktopPetApi = typeof api
