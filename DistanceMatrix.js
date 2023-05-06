class DistanceMatrix {
  constructor(size) {
    this.size = size
    this.length = size
    this.data = new Array(size)
    this.locations = new Array(size)
    for (let i = 0; i < size; i++) {
      this.data[i] = new Array(size - i - 1)
    }
  }
  get(i, j) {
    if (i == j)
      return null
    else if (i < j)
      return this.data[i][j]
    else
      return this.data[j][i]
  }
  set(i, j, ipos, jpos) {
    if (i == j)
      return
    this.locations[i] = ipos
    this.locations[j] = jpos
    if (i < j)
      this.data[i][j] = Math.sqrt(Math.pow(ipos[0] - jpos[0], 2) + Math.pow(ipos[1] - jpos[1], 2))
    else
      this.data[j][i] = Math.sqrt(Math.pow(ipos[0] - jpos[0], 2) + Math.pow(ipos[1] - jpos[1], 2))
  }
  locate(i) {
    return this.locations[i]
  }
  calculate(i, pos) {
    return Math.sqrt(Math.pow(this.locations[i][0] - pos[0], 2) + Math.pow(this.locations[i][1] - pos[1], 2))
  }
  del(i) {
    this.length--
    this.locations[i] = null
    for (let j = 0; j < this.size; j++) {
      if (i < j)
        this.data[i][j] = null
      else
        this.data[j][i] = null
    }
  }
  FindClosestTo(i) {
    let min = Infinity
    let minj = -1
    for (let j = 0; j < this.size; j++) {
      if (this.get(i, j) != null && this.get(i, j) < min) {
        min = this.get(i, j)
        minj = j
      }
    }
    return minj
  }
  FindTwoClosest() {
    let min = Infinity
    let mini = -1
    let minj = -1
    for (let i = 0; i < this.size; i++) {
      for (let j = i + 1; j < this.size; j++) {
        if (this.get(i, j) != null && this.get(i, j) < min) {
          min = this.get(i, j)
          mini = i
          minj = j
        }
      }
    }
    return [mini, minj]
  }
  GetSortedDistance(i) {
    let temp = new Array(this.length)
    let j = 0
    for (let k = 0; k < this.size; k++) {
      if (this.get(i, k) == null)
        continue
      temp[j++] = [k, this.get(i, k)]
    }
    temp.sort((a, b) => a[1] - b[1])
    return temp
  } 
}

module.exports = {
  DistanceMatrix: DistanceMatrix
}