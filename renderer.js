var graphDom = document.getElementById('graph')
var myGraph = echarts.init(graphDom, null, {
    width: 1600,
    height: 900
})
var rateDom = document.getElementById('rate')
var myRate = echarts.init(rateDom, null, {
    width: 1600,
    height: 900
})
var delayDom = document.getElementById('delay')
var myDelay = echarts.init(delayDom, null, {
    width: 1600,
    height: 900
})

var data = []
var links = []
var rateSource = []
var delaySource = []
var exitCommand = []
var disconnectCommand = []

var option = {
    title: {
        text: 'Basic Graph'
    },
    animationDurationUpdate: 0,
    tooltip: {},
    series: [
        {
            type: 'graph',
            layout: 'none',
            symbolSize: 10,
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
        formatter: '{c}'
    },
    animationDurationUpdate: 0.5,
    legend: {},
    dataset: {
        source: rateSource,
    },
    xAxis: { type: 'value' },
    yAxis: { type: 'category' },
    series: [{ type: 'bar' }]
}

var delayOption = {
    tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        },
        formatter: '{c}'
    },
    animationDurationUpdate: 0.5,
    legend: {},
    dataset: {
        source: delaySource,
    },
    xAxis: { type: 'value' },
    yAxis: { type: 'category' },
    series: [{ type: 'bar' }]
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

var button = document.getElementById("but")
button.onclick = function () {
    t = parseInt(Math.random() * data.length)
    while (t == 0 || t == 1)
        t = parseInt(Math.random() * data.length)
    exitCommand.push(t)
}

electronAPI.on_print_full((event, value) => {
    data = value[0]
    links = value[1]
    rateSource = value[2]
    delaySource = value[3]
    option.series[0].data = data
    option.series[0].links = links
    rateOption.dataset.source = rateSource
    delayOption.dataset.source = delaySource
    myGraph.setOption(option)
    myRate.setOption(rateOption)
    myDelay.setOption(delayOption)
    electronAPI.continue()
})

electronAPI.on_print_tags((event, tooltips) => {
    for (let i = 0; i < tooltips.length; i++) {
        data[i].tooltip.formatter = tooltips[i][0].toString() + ',' + tooltips[i][1].toString()
        if (i == 0)
            continue
        rateSource[i][1] = tooltips[i][0]
        delaySource[i][1] = tooltips[i][1]
    }
    option.series[0].data = data
    rateOption.dataset.source = rateSource
    delayOption.dataset.source = delaySource
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
    electronAPI.continue()
})