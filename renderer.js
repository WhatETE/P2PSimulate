var setter = $('.setter').toArray()
var subdiv = document.getElementById("subdiv")

document.getElementById("stop").onclick = function () {
    document.getElementById("stop").disabled = "true"
    document.getElementById("continue").disabled = ""
    electronAPI.stop()
}

document.getElementById("continue").onclick = function () {
    document.getElementById("continue").disabled = "true"
    document.getElementById("stop").disabled = ""
    electronAPI.continue()
    electronAPI.run()
}

document.getElementById("restart").onclick = function () {
    document.getElementById("continue").disabled = "true"
    document.getElementById("stop").disabled = ""
    let args = []
    for (let i = 0; i < 6; i++) {
        args.push(setter[i].value)
    }
    args.push(setter[6].checked ? true : false)
    args.push(setter[7].checked ? true : false)
    args.push(setter[8].options[setter[8].selectedIndex].value)
    args.push(setter[9].value)
    args.push(setter[10].value)
    electronAPI.restart(args)
}

for (let i = 0; i < 5; i++) {
    setter[i].oninput = () => {setter[i].value = setter[i].value.replace(/[^0-9]/g,'')}
}
setter[5].oninput = () => { setter[5].value = setter[5].value.replace(/[^\0-9\.]/g, '') }
setter[8].onchange = () => {
    if (setter[8].selectedIndex == 1) {
        subdiv.style.display = "block"
        subdiv.children[1].style.display = "block"
    }
    else if (setter[8].selectedIndex == 2) {
        subdiv.style.display = "block"
        subdiv.children[1].style.display = "none"
    }
    else {
        subdiv.style.display = "none"
    }
}
for (let i = 9; i < 11; i++) {
    setter[i].oninput = () => {setter[i].value = setter[i].value.replace(/[^0-9]/g,'')}
}

var graphDom = document.getElementById('graph')
var myGraph = echarts.init(graphDom, null, {})
var rateDom = document.getElementById('rate')
var myRate = echarts.init(rateDom, null, {})
var delayDom = document.getElementById('delay')
var myDelay = echarts.init(delayDom, null, {})

var data = []
var links = []
var rateData = []
var delayData = []
var Clients = []
var exitCommand = []
var disconnectCommand = []

var option = {
    title: {
        text: 'Basic Graph'
    },
    animationDurationUpdate: 0,
    tooltip: {
        formatter: (params) => {
            if (params.dataType === 'node') {
                //从节点数据中取出坐标
                return '位置:(' + params.data.x.toFixed(2) + ', ' + params.data.y.toFixed(2) + '),播放比:' + params.data.Rate + ',延迟:' + params.data.Delay
            }
            else if (params.dataType === 'edge') {
                //从边数据中取出两端节点的id
                return params.data.source + '->' + params.data.target
            }
        }
    },
    series: [
        {
            type: 'graph',
            layout: 'none',
            symbolSize: 15,
            roam: true,
            edgeSymbol: ['circle', 'arrow'],
            edgeSymbolSize: [4, 8],
            edgeLabel: {
                fontSize: 20
            },
            data: data,
            links: links,
            lineStyle: {
                opacity: 1,
                width: 0.7,
                curveness: 0
            },
            label:{
                show: true
            },
            emphasis: {
                itemStyle: {
                    color: '#FFA500'
                }
            }
        }
    ]
}

var rateOption = {
    tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        },
        formatter: '{b}:{c}'
    },
    animationDurationUpdate: 0.2,
    legend: {},
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: Clients },
    series: [{
        type: 'bar',
        data: rateData,
        emphasis: {
            itemStyle: {
                color: '#FFA500'
            }
        }
    }]
}

var delayOption = {
    tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        },
        formatter: '{b}:{c}'
    },
    animationDurationUpdate: 0.2,
    legend: {},
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: Clients },
    series: [{
        type: 'bar',
        data: delayData,
        emphasis: {
            itemStyle: {
                color: '#FFA500'
            }
        }
    }]
}

myGraph.on('dblclick', function (params) {
    if (params.dataType === 'node') {
        exitCommand.push(parseInt(params.data.name))
    }
    else if (params.dataType === 'edge') {
        disconnectCommand.push([parseInt(params.data.source), parseInt(params.data.target)])
    }
})

myRate.on('dblclick', function (params) {
    if (params.componentType === 'series' && params.componentSubType === 'bar') {
        exitCommand.push(parseInt(params.data[0]))
    }
})

myDelay.on('dblclick', function (params) {
    if (params.componentType === 'series' && params.componentSubType === 'bar') {
        exitCommand.push(parseInt(params.data[0]))
    }
})

electronAPI.on_print_full((event, value) => {
    data = value[0]
    links = value[1]
    rateData = value[2]
    delayData = value[3]
    Clients = value[4]
    option.series[0].data = data
    option.series[0].links = links
    rateOption.series[0].data = rateData
    rateOption.yAxis.data = Clients
    delayOption.series[0].data = delayData
    delayOption.yAxis.data = Clients
    rateDom.style.height = (1000 * data.length / 100).toString() + 'px'
    delayDom.style.height = (1000 * data.length / 100).toString() + 'px'
    myRate.resize()
    myDelay.resize()
    myGraph.setOption(option)
    myRate.setOption(rateOption)
    myDelay.setOption(delayOption)
    electronAPI.run()
})

electronAPI.on_print_tags((event, tooltips) => {
    for (let i = 0; i < tooltips.length; i++) {
        if (i < tooltips.length - 1) {
            data[i].Rate = tooltips[i][0]
            data[i].Delay = tooltips[i][1]
            rateData[i] = tooltips[i][0]
            delayData[i] = tooltips[i][1]
        }
        else {
            rateData[i].value = tooltips[i][0]
            delayData[i].value = tooltips[i][1]
        }
    }
    option.series[0].data = data
    rateOption.series[0].data = rateData
    delayOption.series[0].data = delayData
    myGraph.setOption(option)
    myRate.setOption(rateOption)
    myDelay.setOption(delayOption)
    if (exitCommand.length > 0) {
        electronAPI.clientExit(exitCommand)
    }
    if (disconnectCommand.length > 0) {
        electronAPI.clientDisconnect(disconnectCommand)
    }
    exitCommand = []
    disconnectCommand = []
    electronAPI.run()
})