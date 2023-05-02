const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const _ = require('underscore')
const SortedArraySet = require("collections/sorted-array-set")
const Heap = require("collections/heap")

//配置
const ClientNum = 100
const ConnectNum = 5
const MinimumPlayNum = 30
const CacheSize = 60
const RoomSize = 1000
const Rate = 20000

var DeviceList = null
var ConnectMatrix = null
var EventQueue = null
var CurrentTime = 0
var JudgeModified = false

var mainWindow = null

//事件类
class Event {
  constructor(time) {
    this.time = time
  }
  //自定义比较器
  valueOf() {
    return this.time
  }
}

//发送事件类
class SendEvent extends Event {
  constructor(time, target, data) {
    super(time)
    this.target = target
    this.data = data
  }
  run() {
    if (DeviceList[this.target] == null)
        return
    if (DeviceList[this.target].CachedBlocks.length == CacheSize) {
      DeviceList[this.target].CachedBlocks.shift()
    }
    DeviceList[this.target].CachedBlocks.push(this.data)
  }
}

//数据生成事件类
class GenerateEvent extends Event {
  constructor(time) {
    super(time)
  }
  run() {
    DeviceList[0].GenerateBlocks()
  }
}

//播放事件类
class PlayEvent extends Event {
  constructor(time) {
    super(time)
  }
  run() {
    for (let i = 1; i < DeviceList.length; i++) {
      if (DeviceList[i] != null)
        DeviceList[i].Play()
    }
  }
}

//请求事件类
class RequestEvent extends Event {
  constructor(time) {
    super(time)
  }
  run() {
    for (let i = 1; i < DeviceList.length; i++) {
      if (DeviceList[i] != null)
        DeviceList[i].Request()
    }
  }
}

class ExitEvent extends Event {
  constructor(time, ID) {
    super(time)
    this.ID = ID
  }
  run() {
    if (DeviceList[this.ID] != null)
      JudgeModified = true
      DeviceList[this.ID].Exit()
  }
}

class DisconnectEvent extends Event {
  constructor(time, sourceID, targetID) {
    super(time)
    this.sourceID = sourceID
    this.targetID = targetID
  }
  run() {
    if (DeviceList[this.targetID] != null)
      JudgeModified = true
      DeviceList[this.targetID].Disconnect(this.sourceID)
  }
}

//客户机类
class Client {
  constructor(ID, pos = null) {
    this.ID = ID
    //创建时加入设备列表
    DeviceList[ID] = this
    //随机生成位置
    if (pos == null)
      this.pos = [Math.random() * RoomSize, Math.random() * RoomSize]
    this.ConnectSpeed = {}
    this.CachedBlocks = SortedArraySet()
    this.PlayTime = 0
    this.Progress = 0
    this.LostBlocks = 0
    this.Delay = -1
  }
  //随机连接设备
  RandomConnect() {
    let t = new Array(ClientNum)
    let j = 0
    for (let i = 0; i < ClientNum; i++) {
      if (j == this.ID)
        j++
      t[i] = j++
    }
    ConnectMatrix[this.ID] = _.sample(t, ConnectNum)
  }

  SpeedCompute() {
    for (let i of ConnectMatrix[this.ID]) {
      let speed = parseInt(Rate / Math.sqrt((this.pos[0] - DeviceList[i].pos[0]) ** 2 + (this.pos[1] - DeviceList[i].pos[1]) ** 2))
      speed = Math.max(speed, 20)
      speed = Math.min(speed, 100)
      this.ConnectSpeed[i] = speed
    }
  }
  //向已连接的设备请求数据
  Request() {
    for (let i of ConnectMatrix[this.ID]) {
      let RequestedCount = 0
      DeviceList[i].CachedBlocks.forEach(j => {
        if (this.CachedBlocks.length == 0 || ((!this.CachedBlocks.has(j)) && (j > this.CachedBlocks.min()))) {
          EventQueue.push(new SendEvent(CurrentTime + 1 + parseInt(RequestedCount / this.ConnectSpeed[i]), this.ID, j))
          RequestedCount += 1
        }
      })
    }
  }
  //播放视频
  Play() {
    //缓存为空则跳过
    if (this.CachedBlocks.length == 0)
      return
    //进度落后则已缺失数据块
    if (this.CachedBlocks[0] > this.Progress) {
      this.LostBlocks += this.CachedBlocks[0] - this.Progress
      this.Progress = this.CachedBlocks[0]
    }
    let Consecutive = true
    let Index = this.CachedBlocks.indexOf(this.Progress)
    if (Index + 2 * MinimumPlayNum <= this.CachedBlocks.length) {
      let t = this.CachedBlocks.slice(Index).toArray()
      for (let j = 1; j < t.length; j++) {
        if (t[j] != t[j - 1] + 1) {
          Consecutive = false
          break
        }
      }
      if (Consecutive) {
        if (this.Delay == -1)
        this.Delay == 0
        this.Delay = (this.Delay * this.PlayTime + (CurrentTime - this.Progress / 30) + (this.Progress % 30 / 30)) / (this.PlayTime + 1)
        this.PlayTime += 1
        this.Progress += MinimumPlayNum
      }
    }
  }
  Exit() {
    for (let i = 0; i < ConnectMatrix.length; i++) {
      ConnectMatrix[i].delete(this.ID)
    }
    ConnectMatrix[this.ID] = []
    DeviceList[this.ID] = null
  }
  Disconnect(ID) {
    ConnectMatrix[this.ID].delete(ID)
  }
}

//服务器类
class Server extends Client {
  constructor() {
    super(0)
  }
  GenerateBlocks() {
    for (let i = CurrentTime * 30; i < (CurrentTime + 1) * 30; i++) {
      this.CachedBlocks.add(i)
    }
    if (this.CachedBlocks.length > CacheSize)
      this.CachedBlocks.splice(0, this.CachedBlocks.length - CacheSize)
  }
}

function print(type) {
  if (CurrentTime == 0 || JudgeModified) {
    let data = []
    let links = []
    let rateSource = [['name', 'Rate']]
    let delaySource = [['name', 'Delay']]
    for (let i = 0; i < DeviceList.length; i++) {
      if (DeviceList[i] == null)
        continue
      data.push({
        name: String(i),
        x: DeviceList[i].pos[0],
        y: DeviceList[i].pos[1],
        tooltip: {
          position: 'top',
          formatter: (DeviceList[i].PlayTime / CurrentTime).toFixed(2).toString() + ',' + DeviceList[i].Delay.toFixed(2).toString()
        }
      })
      if (i > 0){
        rateSource.push([String(i), (DeviceList[i].PlayTime / CurrentTime).toFixed(2)])
        delaySource.push([String(i), DeviceList[i].Delay.toFixed(2)])
      }
      for (let j = 0; j < ConnectMatrix[i].length; j++) {
        links.push({
          source: String(ConnectMatrix[i][j]),
          target: String(i),
        })
      }
    }
    mainWindow.webContents.send('print_full', [data, links, rateSource, delaySource])
  }
  else {
    let tooltips = []
    for (let i = 0; i < DeviceList.length; i++) {
      if (DeviceList[i] == null)
        continue
      tooltips.push([(DeviceList[i].PlayTime / CurrentTime).toFixed(2), DeviceList[i].Delay.toFixed(2)])
    }
    mainWindow.webContents.send('print_tags', tooltips)
  }
  JudgeModified = false
}

function initial() {
  //全局设备列表
  DeviceList = new Array(ClientNum + 1)
  //连接设备矩阵
  ConnectMatrix = new Array(ClientNum + 1)
  for (let i = 0; i < ClientNum + 1; i++) {
    ConnectMatrix[i] = []
  }
  //发送事件队列，用最小堆实现
  EventQueue = Heap([], null, function (a, b) { return b - a })
  //全局时间
  CurrentTime = 0
  //创建服务器，客户机并连接
  new Server().RandomConnect()
  for (let i = 1; i < ClientNum + 1; i++)
    new Client(i).RandomConnect()
  for (let i = 1; i < ClientNum + 1; i++)
    DeviceList[i].SpeedCompute()
}

function run() {
  //运行框架
  new GenerateEvent(CurrentTime).run()
  while (EventQueue.length > 0 && EventQueue.peek().time <= CurrentTime)
    EventQueue.pop().run()
  new PlayEvent(CurrentTime).run()
  new RequestEvent(CurrentTime).run()
  print()
  CurrentTime += 1
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })
  mainWindow.webContents.openDevTools()
  mainWindow.loadFile('./index.html')
}

app.whenReady().then(() => {
  ipcMain.handle('clientExit', function (event, clients) {
    for (let i = 0; i < clients.length; i++)
      EventQueue.push(new ExitEvent(CurrentTime, clients[i]))
  })
  ipcMain.handle('clientDisconnect', function (event, connections) {
    for (let i = 0; i < connections.length; i++)
      EventQueue.push(new DisconnectEvent(CurrentTime, connections[i][0], connections[i][1]))
  })
  ipcMain.handle('continue', run)
  createWindow()
})

initial()
setTimeout(run, 1000)