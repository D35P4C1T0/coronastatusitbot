function getGrafico(cronologiaLink, ctx) {
  axios
    .get(dataSourceLink)
    .then((response) => {
      // console.log(response.data)
      Papa.parse(response.data, {
        complete: function (results) {
          console.log('CSV fetch done!')
          let dailyChecks = []
          let countryIndex = -1

          for (let index = 0; index < results.data.length; index++) {
            if (results.data[index].includes(country)) {
              countryIndex = index
            }
          }

          // index=4 since the array is like this:
          // the dates start at the 4th place in the array

          // data: [
          //         [
          //           'Province/State', 'Country/Region', 'Lat',
          //           'Long',           '1/22/20',        '1/23/20',
          //           '1/24/20',        '1/25/20',        '1/26/20'
          //         ]
          // ]

          for (let index = 4; index < results.data[0].length; index++) {
            // not relevant numbers are going to be ignored
            if (results.data[countryIndex][index] > 0) {
              let dailyCheckDate = new Date(results.data[0][index])
              const dtf = new Intl.DateTimeFormat('en', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
              })
              const [
                { value: mo },
                ,
                { value: da },
                ,
                { value: ye },
              ] = dtf.formatToParts(dailyCheckDate)
              dailyCheckDate = `${da}-${mo}-${ye}`

              let infectedCount = results.data[countryIndex][index]

              dailyChecks.push({ date: dailyCheckDate, cases: infectedCount })
            }
          }

          // console.log(dailyChecks)

          const width = 1000
          const height = 900
          const chartCallback = (ChartJS) => {
            // Global config example: https://www.chartjs.org/docs/latest/configuration/
            ChartJS.defaults.global.elements.rectangle.borderWidth = 2
            // Global plugin example: https://www.chartjs.org/docs/latest/developers/plugins.html
            ChartJS.plugins.register({
              // plugin implementation
            })
            // New chart type example: https://www.chartjs.org/docs/latest/developers/charts.html
            ChartJS.controllers.MyType = ChartJS.DatasetController.extend({
              // chart implementation
            })
          }
          const canvasRenderService = new CanvasRenderService(
            width,
            height,
            chartCallback
          )

          let days = []
          let cases = []

          Object.values(dailyChecks).forEach((element) => {
            // console.log(element)
            days.push(element.date)
            cases.push(element.cases)
          })
          ;(async () => {
            const configuration = {
              type: 'line',
              data: {
                labels: days,
                datasets: [
                  {
                    label: '# of Confirmed Cases in ' + country,
                    data: cases,
                    // backgroundColor: [
                    //   "rgba(255, 99, 132, 0.2)",
                    //   "rgba(54, 162, 235, 0.2)",
                    //   "rgba(255, 206, 86, 0.2)",
                    //   "rgba(75, 192, 192, 0.2)",
                    //   "rgba(153, 102, 255, 0.2)",
                    //   "rgba(255, 159, 64, 0.2)"
                    // ],
                    // borderColor: [
                    //   "rgba(255,99,132,1)",
                    //   "rgba(54, 162, 235, 1)",
                    //   "rgba(255, 206, 86, 1)",
                    //   "rgba(75, 192, 192, 1)",
                    //   "rgba(153, 102, 255, 1)",
                    //   "rgba(255, 159, 64, 1)"
                    // ],
                    borderWidth: 1,
                  },
                ],
              },
              options: {
                scales: {
                  yAxes: [
                    {
                      ticks: {
                        beginAtZero: true,
                        callback: (value) => value,
                      },
                    },
                  ],
                },
              },
            }
            const graphImage = await canvasRenderService.renderToBuffer(
              configuration
            )
            // const dataUrl = await canvasRenderService.renderToDataURL(
            //   configuration
            // )
            // const stream = canvasRenderService.renderToStream(configuration)

            ctx.replyWithMediaGroup([
              {
                media: { source: graphImage },
                caption: days[days.length - 1],
                type: 'photo',
              },
            ])
          })()
        },
      })
    })
    .catch((error) => {
      console.log(error)
    })
}

function growth(known_y, known_x, new_x, use_const) {
  // default values for optional parameters:
  if (typeof known_x == 'undefined') {
    known_x = []
    for (var i = 1; i <= known_y.length; i++) known_x.push(i)
  }
  if (typeof new_x == 'undefined') {
    new_x = []
    for (var i = 1; i <= known_y.length; i++) new_x.push(i)
  }
  if (typeof use_const == 'undefined') use_const = true

  // calculate sums over the data:
  var n = known_y.length
  var avg_x = 0
  var avg_y = 0
  var avg_xy = 0
  var avg_xx = 0
  for (var i = 0; i < n; i++) {
    var x = known_x[i]
    var y = Math.log(known_y[i])
    avg_x += x
    avg_y += y
    avg_xy += x * y
    avg_xx += x * x
  }
  avg_x /= n
  avg_y /= n
  avg_xy /= n
  avg_xx /= n

  // compute linear regression coefficients:
  if (use_const) {
    var beta = (avg_xy - avg_x * avg_y) / (avg_xx - avg_x * avg_x)
    var alpha = avg_y - beta * avg_x
  } else {
    var beta = avg_xy / avg_xx
    var alpha = 0
  }
  // console.log("alpha = " + alpha + ", beta = " +  beta);

  // compute and return result array:
  var new_y = []
  for (var i = 0; i < new_x.length; i++) {
    new_y.push(Math.exp(alpha + beta * new_x[i]))
  }
  return new_y
}
