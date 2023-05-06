const _ = require('underscore')
const Heap = require("collections/heap")
const { SortedArraySet } = require("./SortedArraySet.js")
const { DistanceMatrix } = require('./DistanceMatrix.js')
const { KMeanspp } = require('./KMeans++.js')
const { AgglomerativeClustering } = require('./Agglomerative.js')

//事件类
class Event {
    constructor(p2p, time) {
        this.p2p = p2p
        this.time = time
    }
    //自定义比较器
    valueOf() {
        return this.time
    }
}

//发送事件类
class SendEvent extends Event {
    constructor(p2p, time, target, data) {
        super(p2p, time)
        this.target = target
        this.data = data
    }
    run() {
        if (this.p2p.DeviceList[this.target] == null)
            return
        this.p2p.DeviceList[this.target].CachedBlocks = this.p2p.DeviceList[this.target].CachedBlocks.union(this.data)
        //保证缓存区大小
        let start = this.p2p.DeviceList[this.target].CachedBlocks.length - this.p2p.CacheSize
        if (start > 0)
            this.p2p.DeviceList[this.target].CachedBlocks.splice(0, start)
    }
}

//数据生成事件类
class GenerateEvent extends Event {
    constructor(p2p, time) {
        super(p2p, time)
    }
    run() {
        this.p2p.DeviceList[0].GenerateBlocks()
    }
}

//播放事件类
class PlayEvent extends Event {
    constructor(p2p, time) {
        super(p2p, time)
    }
    run() {
        for (let i = 1; i < this.p2p.DeviceList.length; i++) {
            if (this.p2p.DeviceList[i] != null)
                this.p2p.DeviceList[i].Play()
        }
    }
}

//请求事件类
class RequestEvent extends Event {
    constructor(p2p, time) {
        super(p2p, time)
    }
    run() {
        for (let i = 1; i < this.p2p.DeviceList.length; i++) {
            if (this.p2p.DeviceList[i] != null)
                this.p2p.DeviceList[i].Request()
        }
    }
}

//退出事件类
class ExitEvent extends Event {
    constructor(p2p, time, ID) {
        super(p2p, time)
        this.ID = ID
    }
    run() {
        if (this.p2p.DeviceList[this.ID] == null)
            return
        this.p2p.JudgeModified = true
        this.p2p.DeviceList[this.ID].Exit()
    }
}

//断开连接事件类
class DisconnectEvent extends Event {
    constructor(p2p, time, sourceID, targetID) {
        super(p2p, time)
        this.sourceID = sourceID
        this.targetID = targetID
    }
    run() {
        if (this.p2p.DeviceList[this.targetID] == null)
            return
        this.p2p.JudgeModified = true
        this.p2p.DeviceList[this.targetID].Disconnect(this.sourceID)
    }
}

//客户机类
class Client {
    constructor(p2p, ID, clusterID = -1, pos = null) {
        this.p2p = p2p
        this.ID = ID
        //创建时加入设备列表
        this.p2p.DeviceList[ID] = this
        this.clusterID = clusterID
        //随机生成位置
        if (pos == null)
            this.pos = [Math.random() * this.p2p.RoomSize, Math.random() * this.p2p.RoomSize]
        this.ConnectSpeed = {}
        this.CachedBlocks = new SortedArraySet()
        this.PlayTime = 0
        this.Progress = 0
        this.LostBlocks = 0
        this.Delay = 0
    }
    //随机连接设备
    RandomConnect() {
        let t = new Array()
        for (let i = 0; i < this.p2p.DeviceList.length; i++) {
            if (this.p2p.DeviceList[i] == null || i == this.ID)
                continue
            t.push(i)
        }
        this.p2p.ConnectMatrix[this.ID] = _.sample(t, this.p2p.ConnectNum)
    }
    //计算连接速度，存储于字典
    SpeedCompute() {
        for (let i of this.p2p.ConnectMatrix[this.ID]) {
            let speed = Math.floor(this.p2p.SpeedRate / this.p2p.Distance.get(this.ID, i))
            speed = Math.max(speed, 20)
            speed = Math.min(speed, 100)
            this.ConnectSpeed[i] = speed
        }
    }
    //向已连接的设备请求数据
    Request() {
        for (let i of this.p2p.ConnectMatrix[this.ID]) {
            let AppendTime = 1
            let Pack = []
            this.p2p.DeviceList[i].CachedBlocks.forEach(j => {
                if (this.CachedBlocks.length == 0 || ((!this.CachedBlocks.has(j)) && (j > this.CachedBlocks.min()))) {
                    Pack.push(j)
                    if (Pack.length == this.ConnectSpeed[i]) {
                        this.p2p.EventQueue.push(new SendEvent(this.p2p, this.p2p.CurrentTime + AppendTime, this.ID, Pack))
                        Pack = []
                        AppendTime += 1
                    }
                }
            })
            if (Pack.length != 0) {
                this.p2p.EventQueue.push(new SendEvent(this.p2p, this.p2p.CurrentTime + AppendTime, this.ID, Pack))
            }
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
        if (Index + 2 * this.p2p.MinimumPlayNum <= this.CachedBlocks.length) {
            let t = this.CachedBlocks.slice(Index).toArray()
            for (let j = 1; j < t.length; j++) {
                if (t[j] != t[j - 1] + 1) {
                    Consecutive = false
                    break
                }
            }
            if (Consecutive) {
                this.Delay = (this.Delay * this.PlayTime + (this.p2p.CurrentTime - this.Progress / 30) + (this.Progress % 30 / 30)) / (this.PlayTime + 1)
                this.PlayTime += 1
                this.Progress += this.p2p.MinimumPlayNum
            }
        }
    }
    //节点退出
    Exit() {
        this.p2p.Distance.del(this.ID)
        this.p2p.ConnectMatrix[this.ID] = null
        this.p2p.DeviceList[this.ID] = null
        if (this.clusterID != -1) {
            this.p2p.Clusters[this.clusterID].delete(this.ID)
            if (this.p2p.SuperNode[this.clusterID] == this.ID && this.p2p.Clusters[this.clusterID].length > 0) {
                this.p2p.SuperNodeInitial(this.clusterID)
            }
        }
        for (let i = 0; i < this.p2p.ConnectMatrix.length; i++) {
            if (this.p2p.ConnectMatrix[i] == null)
                continue
            else if (this.p2p.ConnectMatrix[i].has(this.ID))
                this.p2p.DeviceList[i].Disconnect(this.ID)
        }
    }
    //断开特定连接
    Disconnect(ID) {
        this.p2p.ConnectMatrix[this.ID].delete(ID)
        delete this.ConnectSpeed[ID]
        if (this.p2p.ExitStrategy) {
            if (this.clusterID == -1) {
                let temp = this.p2p.Distance.GetSortedDistance(this.ID)
                let t = 0
                for (t = 0; t < temp.length; t++) {
                    if (!this.p2p.ConnectMatrix[this.ID].has(temp[t][0]))
                        break
                }
                this.Connect(temp[t][0])
            }
            else if (this.p2p.SuperNode[this.clusterID] == this.ID) {
                if (ID == 0)
                    this.Connect(0)
            }
            else {
                this.Connect(this.p2p.SuperNode[this.clusterID])
            }
        }
    }
    Connect(ID) {
        this.p2p.ConnectMatrix[this.ID].push(ID)
        let speed = Math.floor(this.p2p.SpeedRate / this.p2p.Distance.get(this.ID, ID))
        speed = Math.max(speed, 20)
        speed = Math.min(speed, 100)
        this.ConnectSpeed[ID] = speed
    }
    clear() {
        this.ConnectSpeed = {}
        this.CachedBlocks = new SortedArraySet()
        this.PlayTime = 0
        this.Progress = 0
        this.LostBlocks = 0
        this.Delay = 0
        this.clusterID = -1
    }
}

//服务器类
class Server extends Client {
    constructor(p2p) {
        super(p2p, 0)
    }
    GenerateBlocks() {
        for (let i = this.p2p.CurrentTime * 30; i < (this.p2p.CurrentTime + 1) * 30; i++) {
            this.CachedBlocks.push(i)
        }
        if (this.CachedBlocks.length > this.p2p.CacheSize)
            this.CachedBlocks.splice(0, this.CachedBlocks.length - this.p2p.CacheSize)
    }
}

class p2p {
    constructor() {
        this.ClientNum = 100
        this.ConnectNum = 5
        this.MinimumPlayNum = 30
        this.CacheSize = 60
        this.RoomSize = 1000
        this.SpeedRate = 20000

        this.ClusterNum = 10
        this.IterNum = 10

        this.ExitStrategy = true
        this.Fixed = false
        this.NetworkType = 0

        this.DeviceList = null
        this.ConnectMatrix = null
        this.Distance = null
        this.EventQueue = null
        this.CurrentTime = 0
        this.JudgeModified = false
        this.Clusters = null
        this.SuperNode = null
    }

    print() {
        //节点或连接改变时全局更新
        if (this.CurrentTime == 0 || this.JudgeModified) {
            this.JudgeModified = false
            let data = []
            let links = []
            let rateData = []
            let delayData = []
            let rateAverage = 0
            let delayAverage = 0
            let Clients = []
            for (let i = 0; i < this.DeviceList.length; i++) {
                if (this.DeviceList[i] == null)
                    continue
                data.push({
                    name: String(i),
                    x: this.DeviceList[i].pos[0],
                    y: this.DeviceList[i].pos[1],
                    Rate: (this.DeviceList[i].PlayTime / this.CurrentTime).toFixed(2),
                    Delay: this.DeviceList[i].Delay.toFixed(2)
                })
                if (i > 0) {
                    if (this.NetworkType != 0 && this.SuperNode[this.DeviceList[i].clusterID] == i) {
                        data[data.length - 1].itemStyle = { color: '#FF00FF' }
                    }
                    Clients.push(i.toString())
                    rateData.push((this.DeviceList[i].PlayTime / this.CurrentTime).toFixed(2))
                    delayData.push(this.DeviceList[i].Delay.toFixed(2))
                    rateAverage += (this.DeviceList[i].PlayTime / this.CurrentTime)
                    delayAverage += this.DeviceList[i].Delay
                }
                for (let j = 0; j < this.ConnectMatrix[i].length; j++) {
                    links.push({
                        source: String(this.ConnectMatrix[i][j]),
                        target: String(i),
                    })
                }
            }
            Clients.push("平均")
            rateAverage /= rateData.length - 1
            delayAverage /= delayData.length - 1
            rateData.push(rateAverage.toFixed(2))
            delayData.push(delayAverage.toFixed(2))
            data[0].itemStyle = { color: '#FF0000' }
            rateData[rateData.length - 1] = { value: rateData[rateData.length - 1], itemStyle: { color: '#FF0000' } }
            delayData[delayData.length - 1] = { value: delayData[delayData.length - 1], itemStyle: { color: '#FF0000' } }
            return ['print_full', [data, links, rateData, delayData, Clients]]
        }
        //节点或连接未改变时只更新进度
        else {
            let tooltips = []
            let rateAverage = 0
            let delayAverage = 0
            for (let i = 1; i < this.DeviceList.length; i++) {
                if (this.DeviceList[i] == null)
                    continue
                tooltips.push([(this.DeviceList[i].PlayTime / this.CurrentTime).toFixed(2), this.DeviceList[i].Delay.toFixed(2)])
                rateAverage += (this.DeviceList[i].PlayTime / this.CurrentTime)
                delayAverage += this.DeviceList[i].Delay
            }
            rateAverage /= tooltips.length
            delayAverage /= tooltips.length
            tooltips.push([rateAverage.toFixed(2), delayAverage.toFixed(2)])
            return ['print_tags', tooltips]
        }
    }

    initial() {
        //全局时间
        this.CurrentTime = 0
        this.JudgeModified = false
        if (this.Fixed) {
            for (let i = 0; i < this.DeviceList.length; i++) {
                if (this.DeviceList[i] == null)
                    continue
                this.DeviceList[i].clear()
                this.ConnectMatrix[i].clear()
            }
            this.EventQueue.clear()
        }
        else {
            //全局设备列表
            this.DeviceList = new Array(this.ClientNum + 1)
            //连接矩阵
            this.ConnectMatrix = new Array(this.ClientNum + 1)
            for (let i = 0; i < this.ClientNum + 1; i++) {
                this.ConnectMatrix[i] = []
            }
            //发送事件队列，用最小堆实现
            this.EventQueue = Heap([], null, (a, b) => { return b - a })
            new Server(this)
            for (let i = 1; i < this.ClientNum + 1; i++)
                new Client(this,i)
            //计算距离矩阵
            this.Distance = new DistanceMatrix(this.ClientNum + 1)
            for (let i = 0; i < this.ClientNum + 1; i++) {
                for (let j = i + 1; j < this.ClientNum + 1; j++) {
                    this.Distance.set(i, j, this.DeviceList[i].pos, this.DeviceList[j].pos)
                }
            }
        }
        //初始化连接
        if (this.NetworkType == 0) {
            //随机连接
            for (let i = 1; i < this.DeviceList.length; i++) {
                if (this.DeviceList[i] == null)
                    continue
                this.DeviceList[i].RandomConnect()
            }
        }
        else {
            //arr记录有效客户端的ID
            let arr = []
            for (let i = 1; i < this.DeviceList.length; i++) {
                if (this.DeviceList[i] == null)
                    continue
                arr.push(i)
            }
            if (this.NetworkType == 1) {
                this.Clusters = KMeanspp(arr, this.Distance, this.ClusterNum, this.IterNum)
            }
            else if (this.NetworkType == 2) {
                this.Clusters = AgglomerativeClustering(arr, this.Distance, this.ClusterNum)
            }
            //SuperNode记录每个簇的超级节点
            this.SuperNode = new Array(this.ClusterNum)
            for (let i = 0; i < this.ClusterNum; i++) {
                this.SuperNodeInitial(i)
                //其他簇内节点连接到超级节点
                for (let j = 0; j < this.Clusters[i].length; j++) {
                    this.DeviceList[this.Clusters[i][j]].clusterID = i
                    if (this.Clusters[i][j] != this.SuperNode[i]) {
                        this.DeviceList[this.Clusters[i][j]].Connect(this.SuperNode[i])
                    }
                }
            }
        }
        //计算连接速度
        for (let i = 1; i < this.DeviceList.length; i++) {
            if (this.DeviceList[i] == null)
                continue
            this.DeviceList[i].SpeedCompute()
        }
    }
    SuperNodeInitial(i) {
        let minDistance = Infinity
        let minID = -1
        //找出每个簇距离服务器最近的节点作为超级节点
        for (let j = 0; j < this.Clusters[i].length; j++) {
            let distance = this.Distance.get(0, this.Clusters[i][j])
            if (distance < minDistance) {
                minDistance = distance
                minID = this.Clusters[i][j]
            }
        }
        this.SuperNode[i] = minID
        //超级节点连接到服务器
        this.DeviceList[minID].Connect(0)
    }
    run() {
        //运行框架
        new GenerateEvent(this, this.CurrentTime).run()
        while (this.EventQueue.length > 0 && this.EventQueue.peek().time <= this.CurrentTime)
            this.EventQueue.pop().run()
        new PlayEvent(this, this.CurrentTime).run()
        new RequestEvent(this, this.CurrentTime).run()
        let print = this.print()
        this.CurrentTime += 1
        return print
    }
    ClientExit(clients) {
        for (let i = 0; i < clients.length; i++) {
            if (clients[i] == 0)
                continue
            this.EventQueue.push(new ExitEvent(this, this.CurrentTime, clients[i]))
        }
    }
    ClientDisconnect(connections) {
        for (let i = 0; i < connections.length; i++)
            this.EventQueue.push(new DisconnectEvent(this, this.CurrentTime, connections[i][0], connections[i][1]))
    }
    restart(args) {
        this.ClientNum = parseInt(args[0])
        this.ConnectNum = parseInt(args[1])
        this.MinimumPlayNum = parseInt(args[2])
        this.CacheSize = parseInt(args[3])
        this.RoomSize = parseInt(args[4])
        this.SpeedRate = parseFloat(args[5])
        this.ExitStrategy = args[6]
        this.Fixed = args[7]
        this.NetworkType = args[8]
        this.ClusterNum = parseInt(args[9])
        this.IterNum = parseInt(args[10])
        this.initial()
    }
}

module.exports = {
    p2p: p2p
}