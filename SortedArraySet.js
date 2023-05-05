class SortedArraySet {
    constructor(data = []) {
        this.data = data
        this.data.sort()
    }
    get length() {
        return this.data.length
    }
    get(index) {
        return this.data[index]
    }
    toArray() {
        return this.data
    }
    push(value) {
        let left = 0;
        let right = this.data.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (this.data[mid] === value) {
                return
            }
            else if (this.data[mid] > value) {
                right = mid - 1
            }
            else {
                left = mid + 1
            }
        }
        this.data.splice(left, 0, value)
    }
    indexOf(value) {
        let left = 0;
        let right = this.data.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (this.data[mid] === value) {
                return mid
            }
            else if (this.data[mid] > value) {
                right = mid - 1
            }
            else {
                left = mid + 1
            }
        }
        return -1
    }
    slice(start, end) {
        return this.data.slice(start, end)
    }
    splice(start, deleteCount, ...items) {
        let result = this.data.splice(start, deleteCount, ...items)
        if (items.length > 0) {
            this.data.sort()
        }
    }
    union(array) {
        if (typeof array !== 'SortedArraySet') {
            array.sort()
        }
        let result = new SortedArraySet()
        let i = 0
        let j = 0
        while (i < this.data.length && j < array.length) {
            if (this.data[i] === array[j]) {
                result.push(this.data[i])
                i++
                j++
            }
            else if (this.data[i] < array[j]) {
                result.push(this.data[i])
                i++
            }
            else {
                result.push(array[j])
                j++
            }
        }
        while (i < this.data.length) {
            result.push(this.data[i])
            i++
        }
        while (j < array.length) {
            result.push(array[j])
            j++
        }
        return result
    }
    min() {
        return this.data[0]
    }
    max() {
        return this.data[this.data.length - 1]
    }
    has(value) {
        let left = 0;
        let right = this.data.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (this.data[mid] === value) {
                return true
            }
            else if (this.data[mid] > value) {
                right = mid - 1
            }
            else {
                left = mid + 1
            }
        }
        return false
    }
    forEach(callback) {
        for (let i = 0; i < this.data.length; i++) {
            callback(this.data[i], i, this);
        }
    }
}

module.exports = {
    SortedArraySet: SortedArraySet
}