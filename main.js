const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { p2p } = require('./p2p.js')

var mainWindow = null
var p2pNetwork = new p2p()
var stop = false

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })
  mainWindow.setMenu(null)
  mainWindow.loadFile('./index.html')
}

app.whenReady().then(() => {
  ipcMain.handle('stop', () => { stop = true })
  ipcMain.handle('continue', () => { stop = false })
  ipcMain.handle('run', runp2p)
  //处理节点退出
  ipcMain.handle('clientExit', (event, clients) => p2pNetwork.ClientExit(clients))
  //处理断开连接
  ipcMain.handle('clientDisconnect', (event, connections) => p2pNetwork.ClientDisconnect(connections))
  //处理重启
  ipcMain.handle('restart', (event, args) => p2pNetwork.restart(args))
  createWindow()
})

function runp2p() {
  if (stop)
    return
  let tempargs = p2pNetwork.run()
  mainWindow.webContents.send(tempargs[0], tempargs[1])
}
p2pNetwork.initial()
setTimeout(runp2p, 1000)