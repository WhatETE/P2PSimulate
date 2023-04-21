var chartDom = document.getElementById('main');
var myChart = echarts.init(chartDom, null, {
    width: 1600,
    height: 900
});
window.p2p.initial()
window.p2p.run()
window.p2p.print()
var option;
var data = [
    {
        name: 'Node 1',
        x: 300,
        y: 300
    },
    {
        name: 'Node 2',
        x: 800,
        y: 300
    },
    {
        name: 'Node 3',
        x: 550,
        y: 100
    },
    {
        name: 'Node 4',
        x: 550,
        y: 500
    }
];
var links = [
    {
        source: 0,
        target: 1,
        symbolSize: [5, 20],
        label: {
            show: true
        },
        lineStyle: {
            width: 5,
            curveness: 0.2
        }
    },
    {
        source: 'Node 2',
        target: 'Node 1',
        label: {
            show: true
        },
        lineStyle: {
            curveness: 0.2
        }
    },
    {
        source: 'Node 1',
        target: 'Node 3'
    },
    {
        source: 'Node 2',
        target: 'Node 3'
    },
    {
        source: 'Node 2',
        target: 'Node 4'
    },
    {
        source: 'Node 1',
        target: 'Node 4'
    }
];

option = {
    title: {
        text: 'Basic Graph'
    },
    tooltip: {},
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
        {
            type: 'graph',
            layout: 'none',
            symbolSize: 50,
            roam: true,
            label: {
                show: true
            },
            edgeSymbol: ['circle', 'arrow'],
            edgeSymbolSize: [4, 10],
            edgeLabel: {
                fontSize: 20
            },
            data: data,
            links: links,
            lineStyle: {
                opacity: 0.9,
                width: 2,
                curveness: 0
            }
        }
    ]
};

option && myChart.setOption(option);

var button=document.getElementById("but");
button.onclick=function(){
    data[0].name="new node";
    myChart.setOption(option);
}