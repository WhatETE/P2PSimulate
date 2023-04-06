function draw() {

    var graph = data2Graph([[0, 1, 10], [1, 0, 1], [1, 2, 5], [2, 0, 5]]);

    drawGraph(graph);

}

function data2Graph(data) {
    var graph = {}
    var vertices = {}
    var links = [];
    for (var i = 0; i < data.length; i++) {
        var s = String(data[i][0]);
        var t = String(data[i][1]);
        var v = data[i][2];
        vertices[s] = s;
        vertices[t] = t;
        links.push({ 'source': s, 'target': t, 'value': v });
    }
    var nodes = [];
    $.each(vertices, function (k, v) {
        nodes.push({ 'name': v, 'value': v });
    });
    graph['links'] = links;
    graph['data'] = nodes;
    return graph;
}

function drawGraph(graph) {
    var myChart = echarts.init(document.getElementById('main'), null, {
        width: 1920,
        height: 1080
    });
    var option = {
        tooltip: {},
        series: [
            {
                type: 'graph',
                layout: 'force',
                symbolSize: 30,
                edgeSymbol: ['none', 'arrow'],
                data: graph.data,
                links: graph.links,
                roam: true,
                label: {
                    normal: {
                        show: true,
                        formatter: function (e) {
                            return e['data']['value'];
                        }
                    }
                },
                edgeLabel: {
                    normal: {
                        show: true,
                        position: 'middle'
                    }
                },
                force: {
                    repulsion: 1000,
                    edgeLength: 200
                }
            }
        ]
    };
    myChart.setOption(option);
}

$(function () {
    draw();
});