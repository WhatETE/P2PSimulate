const _ = require('underscore')
const SortedArraySet = require("collections/sorted-array-set")
const Heap = require("collections/heap")

//配置
const ClientNum = 100
const ConnectNum = 5
const Minimum_PlayNum = 30
const CacheSize = 150
const RoomSize = 1000
const Rate = 20000

var DeviceList = null
var ConnectMatrix = null
var SendEventQueue = null
var CurrentTime = 0

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
            if (DeviceList[i].CachedBlocks.length == 0)
                continue
            if (DeviceList[i].CachedBlocks[0] > DeviceList[i].Progress) {
                DeviceList[i].LostBlocks += DeviceList[i].CachedBlocks[0] - DeviceList[i].Progress
                DeviceList[i].Progress = DeviceList[i].CachedBlocks[0]
            }
            let Consecutive = true
            let Index = DeviceList[i].CachedBlocks.indexOf(DeviceList[i].Progress)
            if (Index + Minimum_PlayNum <= DeviceList[i].CachedBlocks.length) {
                let t = DeviceList[i].CachedBlocks.slice(Index).toArray()
                for (let j = 1; j < t.length; j++) {
                    if (t[j] != t[j - 1] + 1) {
                        Consecutive = false
                        break
                    }
                }
                if (Consecutive) {
                    DeviceList[i].PlayTime += 1
                    DeviceList[i].Progress += Minimum_PlayNum
                }
            }
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
            DeviceList[i].Request()
        }
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
                    SendEventQueue.push(new SendEvent(CurrentTime + 1 + parseInt(RequestedCount / this.ConnectSpeed[i]), this.ID, j))
                    RequestedCount += 1
                }
            });
        }
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

function initial(){
    //全局设备列表
    DeviceList = new Array(ClientNum + 1)
    //连接设备矩阵
    ConnectMatrix = new Array(ClientNum + 1)
    for (let i = 0; i < ClientNum + 1; i++) {
        ConnectMatrix[i] = []
    }
    //发送事件队列，用最小堆实现
    SendEventQueue = Heap([], null, function (a, b) { return b - a })
    //全局时间
    CurrentTime = 0
    //创建服务器，客户机并连接
    new Server().RandomConnect()
    for (let i = 1; i < ClientNum + 1; i++)
        new Client(i).RandomConnect()
    for (let i = 1; i < ClientNum + 1; i++)
        DeviceList[i].SpeedCompute()
    module.exports.DeviceList = DeviceList
    module.exports.ConnectMatrix = ConnectMatrix
}

function run(){
    //运行框架
    while (true) {
        new GenerateEvent(CurrentTime).run()
        while (SendEventQueue.length > 0 && SendEventQueue.peek().time <= CurrentTime)
            SendEventQueue.pop().run()
        new PlayEvent(CurrentTime).run()
        new RequestEvent(CurrentTime).run()
        CurrentTime += 1
        module.exports.DeviceList = DeviceList
        module.exports.ConnectMatrix = ConnectMatrix
        module.exports.CurrentTime = CurrentTime
    }
}

function print(){
    for (let i = 1; i < DeviceList.length; i++)
        console.log('播放比：' + String(DeviceList[i].PlayTime / CurrentTime) + ' 丢包数' + String(DeviceList[i].LostBlocks))
    
}

module.exports.initial = initial
module.exports.run = run
module.exports.print = print
module.exports.DeviceList = DeviceList
module.exports.ConnectMatrix = ConnectMatrix
module.exports.CurrentTime = CurrentTime