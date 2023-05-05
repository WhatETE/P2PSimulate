const { DistanceMatrix } = require('./DistanceMatrix.js')

function AgglomerativeClustering(data, GlobalDistance, ClusterNum) {
    //初始化簇和距离矩阵
    let Clusters = new Array(data.length)
    for (let i = 0; i < data.length; i++) {
        Clusters[i] = [data[i]]
    }
    let Distance = new DistanceMatrix(data.length)
    for (let i = 0; i < data.length; i++) {
        for (let j = i + 1; j < data.length; j++) {
            Distance.set(i, j, GlobalDistance.locate(data[i]), GlobalDistance.locate(data[j]))
        }
    }
    //重复迭代，直到簇的数目为ClusterNum
    while (Distance.length > ClusterNum) {
        //找到最小距离的两个簇
        let minClusters = Distance.FindTwoClosest()
        //合并簇
        let posA = Distance.locate(minClusters[0]), lenA = Clusters[minClusters[0]].length
        let posB = Distance.locate(minClusters[1]), lenB = Clusters[minClusters[1]].length
        let newPos = [(posA[0] * lenA + posB[0] * lenB) / (lenA + lenB),
       (posA[1] * lenA + posB[1] * lenB) / (lenA + lenB)]
        Clusters[minClusters[0]] = Clusters[minClusters[0]].concat(Clusters[minClusters[1]])
        Clusters[minClusters[1]] = null
        //更新距离矩阵
        Distance.del(minClusters[1])
        for (let i = 0; i < data.length; i++) {
            if (Clusters[i] == null)
                continue
            Distance.set(minClusters[0], i, newPos, Distance.locate(i))
        }
    }
    let Result = []
    for (let i = 0; i < data.length; i++) {
        if (Clusters[i] != null) {
            Result.push(Clusters[i])
        }
    }
    return Result
}

module.exports = {
    AgglomerativeClustering: AgglomerativeClustering
}