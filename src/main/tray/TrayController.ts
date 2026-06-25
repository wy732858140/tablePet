import { Menu, Tray, nativeImage } from 'electron'

export const createTrayController = (actions: {
  importPet: () => void
  showPet: () => void
  hidePet: () => void
  quit: () => void
}) => {
  const tray = new Tray(nativeImage.createEmpty())
  const menu = Menu.buildFromTemplate([
    { label: 'Show Pet', click: actions.showPet },
    { label: 'Hide Pet', click: actions.hidePet },
    { type: 'separator' },
    { label: 'Import Pet Package', click: actions.importPet },
    { type: 'separator' },
    { label: 'Quit', click: actions.quit }
  ])
  tray.setToolTip('TablePet')
  tray.setContextMenu(menu)
  return tray
}
