class TempChart {
    constructor() {
        this.chart = undefined;
    }

    refreshData(user, data) { // On met à jour les données et le titre
        this.chart.series[0].update({name: user, data: this.formatData(data)});
        this.chart.setTitle({text: 'Températures: ' + user});
    }

    formatData(data) { // On formate les données pour qu'elles soient lisibles par HighCharts
        let dataArray = [];
        data.forEach((el) => {
            dataArray.push([new Date(el.date).getTime(), parseFloat(el.value)]);
        })
        return dataArray;
    }

    getChart() {
        return this.chart;
    }

    initNewTempChart(data, name) { // Initialisation de la charte
        let formattedData = this.formatData(data);
        Highcharts.setOptions({
            global: {
                useUTC: false,
                type: 'spline'
            },
            time: {timezone: 'Europe/Paris'}
        });
        this.chart = new Highcharts.chart('chart', {
            legend: {enabled: true},
            credits: false,
            xAxis: {title: {text: 'Heure locale'}, type: 'datetime'},
            yAxis: {title: {text: 'Temperature (Deg C)'}},
            series: [{name: name, data: formattedData}],
            colors: ['blue'],
            plotOptions: {
                line: {
                    dataLabels: {enabled: true},
                    color: "red",
                    enableMouseTracking: true
                }
            }
        });
        this.chart.setTitle({text: 'Températures: ' + name});
    }
}