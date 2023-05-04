class DistanceMatrix {
    constructor(size) {
      this.size = size
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
      return Math.sqrt(Math.pow(locations[i][0] - pos[0], 2) + Math.pow(locations[i][1] - pos[1], 2))
    }
    block(i) {
      for (let j = 0; j < this.size; j++) {
        this.set(i, j, null)
      }
    }
    findclosest(i) {
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
}

module.exports = DistanceMatrix