const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
    },
  })
  win.webContents.openDevTools()
  win.loadFile('./index.html')
  win.webContents.send('api',_,SortedArraySet,Heap)
}
app.whenReady().then(createWindow)