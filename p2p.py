import heapq
import random
import math
from sortedcontainers import SortedSet as sset

#配置
ClientNum = 100
ConnectNum = 5
Minimum_PlayNum = 30
CacheSize = 150
RoomSize = 1000
Rate = 20*(RoomSize)

#事件类
class Event:
    def __init__(self, time):
        self.time = time
    #自定义比较器
    def __lt__(self, other):
        return self.time < other.time

#发送事件类
class SendEvent(Event):
    def __init__(self, time, target, data):
        super().__init__(time)
        self.target = target
        self.data = data
    def run(self):
        if len(DeviceList[self.target].CachedBlocks) == CacheSize:
            DeviceList[self.target].CachedBlocks.pop(0)
        DeviceList[self.target].CachedBlocks.add(self.data)

#数据生成事件类
class GenerateEvent(Event):
    def __init__(self, time):
        super().__init__(time)
    def run(self):
        DeviceList[0].GenerateBlocks()

#播放事件类
class PlayEvent(Event):
    def __init__(self, time):
        super().__init__(time)
    def run(self):
        for i in DeviceList[1:]:
            if len(i.CachedBlocks) == 0:
                continue
            if i.CachedBlocks[0] > i.Progress:
                i.LostBlocks += i.CachedBlocks[0]-i.Progress
                i.Progress = i.CachedBlocks[0]
            Consecutive = True
            Index = i.CachedBlocks.index(i.Progress)
            if Index+Minimum_PlayNum <= len(i.CachedBlocks):
                for j in range(Index+1,Index+Minimum_PlayNum):
                    if i.CachedBlocks[j] != i.CachedBlocks[j-1]+1:
                        Consecutive = False
                        break
                if Consecutive:
                    i.PlayTime += 1
                    i.Progress += Minimum_PlayNum

#请求事件类
class RequestEvent(Event):
    def __init__(self, time):
        super().__init__(time)
    def run(self):
        for i in DeviceList[1:]:
            i.Request()

#客户机类
class Client:

    def __init__(self, ID, pos = None):
        self.ID = ID
        #创建时加入设备列表
        DeviceList[ID] = self
        #随机生成位置
        if pos == None:
            self.pos = (random.random()*RoomSize, random.random()*RoomSize)
        self.ConnectSpeed = {}
        self.CachedBlocks = sset()
        self.PlayTime = 0
        self.Progress = 0
        self.LostBlocks = 0
    #随机连接设备
    def RandomConnect(self):
        t=list(range(ClientNum+1))
        t.remove(self.ID)
        ConnectMatrix[self.ID]=random.sample(t,ConnectNum)
    def SpeedCompute(self):
        for i in ConnectMatrix[self.ID]:
            speed = int(Rate/math.sqrt((self.pos[0]-DeviceList[i].pos[0])**2+(self.pos[1]-DeviceList[i].pos[1])**2))
            speed = max(speed, 20)
            speed = min(speed, 100)
            self.ConnectSpeed[i] = speed
    #向已连接的设备请求数据
    def Request(self):
        for i in ConnectMatrix[self.ID]:
            RequestedCount = 0
            for j in DeviceList[i].CachedBlocks:
                if (len(self.CachedBlocks) == 0) or ((j not in self.CachedBlocks) and (j > min(self.CachedBlocks))):
                    heapq.heappush(SendEventQueue, SendEvent(CurrentTime+1+int(RequestedCount/self.ConnectSpeed[i]), self.ID, j))
                    RequestedCount += 1
    
    def ConnectTo(self, target):
        pass
    
    def Send(self, target, data):
        pass

#服务器类
class Server(Client):

    def __init__(self):
        super().__init__(0)

    def GenerateBlocks(self):
        for i in range(CurrentTime*30,(CurrentTime+1)*30):
            self.CachedBlocks.add(i)
        if len(self.CachedBlocks) > CacheSize:
            del self.CachedBlocks[:len(self.CachedBlocks)-CacheSize]

#全局设备列表
DeviceList = [None for i in range(ClientNum + 1)]
#连接设备矩阵
ConnectMatrix = [[] for i in range(ClientNum + 1)]
#发送事件队列，用最小堆实现
SendEventQueue = []
#全局时间
CurrentTime = 0
#记录上次循环遗留的事件
TempEvent = None
#创建服务器，客户机并连接
Server().RandomConnect()
for i in range(1, ClientNum + 1):
    Client(i).RandomConnect()
for i in range(1, ClientNum + 1):
    DeviceList[i].SpeedCompute()

#运行框架
while CurrentTime < 100:
    GenerateEvent(CurrentTime).run()
    while(len(SendEventQueue) > 0 and SendEventQueue[0].time <= CurrentTime):
        heapq.heappop(SendEventQueue).run()
    PlayEvent(CurrentTime).run()
    RequestEvent(CurrentTime).run()
    print(CurrentTime)
    CurrentTime += 1
for i in DeviceList[1:]:
    print('播放比：'+str(i.PlayTime/CurrentTime)+' 丢包数:'+str(i.LostBlocks))