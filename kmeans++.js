const weightedRandom = require('weighted-random')

//初始化中心点
function getCentroids(data, distanceMatrix, k) {
    let centroids = []
    //随机选择第一个中心点
    let first = data[Math.floor(Math.random() * data.length)]
    centroids.push(first)
    while (centroids.length < k) {
        let distances = []
        let sum = 0
        data.forEach((element) => {
            let distancesToCentroids = []
            centroids.forEach((centroid) => {
                distancesToCentroids.push(distanceMatrix.get(element, centroid))
            })
            //每个点到已有中心点的最短距离
            let minDistance = Math.min(...distancesToCentroids)
            distances.push(minDistance)
            //最短距离的累计
            sum += minDistance
        })
        //计算权重=最短距离的平方/累计距离
        let weights = distances.map((distance) => Math.pow(distance, 2) / sum)
        //根据权重随机选择下一个中心点
        let index = weightedRandom(weights)
        centroids.push(data[index])
    }
    return centroids
}

function KMeanspp(data, distanceMatrix, k, times) {
    let centroidpos = getCentroids(data, distanceMatrix, k).map((centroid) => distanceMatrix.locate(centroid))
    let clusters = null
    for (let i = 0; i < times; i++){
        clusters = new Array(k)
        for (let j = 0; j < k; j++) {
            clusters[j] = []
        }
        data.forEach((element) => {
            let minDistance = Infinity
            let clusterIndex = null
            for (let j = 0; j < k; j++){
                let distance = distanceMatrix.calculate(element, centroidpos[j])
                if (distance < minDistance) {
                    minDistance = distance
                    clusterIndex = j
                }
            }
            clusters[clusterIndex].push(element)
        })
        if (i < times - 1) {
            for (let j = 0; j < k; j++) {
                let sumpos = [0, 0]
                clusters[j].forEach((element) => {
                    let pos = distanceMatrix.locate(element)
                    sumpos[0] += pos[0]
                    sumpos[1] += pos[1]
                })
                centroidpos[j] = [sumpos[0] / clusters[j].length, sumpos[1] / clusters[j].length]
            }
        }
    }
    return clusters
}

module.exports = {
    KMeanspp: KMeanspp
}