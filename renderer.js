var chartDom = document.getElementById('main')
var myChart = echarts.init(chartDom, null, {
    width: 1600,
    height: 900
})
var option
var data = []
var links = []

option = {
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

var button = document.getElementById("but")

electronAPI.on_print_full((event, value) => {
    data = value[0]
    links = value[1]
    option.series[0].data = data
    option.series[0].links = links
    myChart.setOption(option)
    electronAPI.continue()
})

electronAPI.on_print_tags((event, value) => {
    for (let i = 0; i < value.length; i++) {
        data[i].tooltip.formatter = value[i]
    }
    option.series[0].data = data
    myChart.setOption(option)
    electronAPI.continue()
})