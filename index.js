require("dotenv").config()
const Telegraf = require("telegraf")
const Markup = require("telegraf/markup")
const Extra = require("telegraf/extra")

// Utils
const TelegrafInlineMenu = require("telegraf-inline-menu")
const axios = require("axios")
const Papa = require("papaparse")
const { CanvasRenderService } = require("chartjs-node-canvas")
const PORT = process.env.PORT || 3000

const http = require("http")
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" })
  res.end("Esempio server HTTP\n")
})

const callback = () => {
  const address = server.address().address
  const port = server.address().port
  console.log(`
  Server avviato all'indirizzo http://${address}:${port}
  `)
}

server.listen(PORT, callback)

////////////////////////////////////////////////////////////

let welcomeMessage =
  ", questo bot ti permette di controllare il numero di casi di contagio in Italia, ed è ancora in fase sperimentale.\n"

let dataSourceLink =
  "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv"

////////////////////////////////////////////////////////////

const welcomeMenu = new TelegrafInlineMenu(
  ctx => `Benvenuto ${ctx.from.first_name}` + welcomeMessage
)
welcomeMenu.simpleButton("Controlla i contagi 🔍", "a", {
  doFunc: ctx => fetchLatest("Italy", ctx)
})
welcomeMenu.simpleButton("Ottieni un grafico 📊", "b", {
  doFunc: ctx => getGrafico("Italy", ctx)
})

welcomeMenu.setCommand("start")

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.use(welcomeMenu.init())
// bot.start(ctx => ctx.reply("Welcome"))
bot.help(ctx => ctx.reply("TODO"))
// bot.on("sticker", ctx => ctx.reply("👍"))
// bot.hears("hi", ctx => ctx.reply("Hey there"))
bot.launch()

function fetchLatest(country, ctx) {
  axios
    .get(dataSourceLink)
    .then(response => {
      // console.log(response.data)
      Papa.parse(response.data, {
        complete: function(results) {
          console.log("CSV fetch done!")

          // let lastCheck = new Date(
          //   Date.parse(results.data[0][Object.size(results.data[0]) - 1])
          // ).toLocaleString("it-IT", {
          //   weekday: "long",
          //   month: "2-digit",
          //   day: "2-digit",
          //   year: "2-digit"
          // })

          let lastCheck = new Date(
            results.data[0][Object.size(results.data[0]) - 1]
          )

          const dtf = new Intl.DateTimeFormat("en", {
            year: "numeric",
            month: "short",
            day: "2-digit"
          })
          const [
            { value: mo },
            ,
            { value: da },
            ,
            { value: ye }
          ] = dtf.formatToParts(lastCheck)

          // console.log("Last check " + lastCheck)
          console.log(`${da}-${mo}-${ye}`)
          lastCheck = `${da}-${mo}-${ye}`

          let latestInfectedAmount
          results.data.forEach(element => {
            // console.log(element)
            if (element.includes(country)) {
              latestInfectedAmount = element[Object.size(element) - 1]
              console.log(
                latestInfectedAmount + " people infected in " + country
              )
            }
          })

          let returnMessage =
            "Attualmente in " +
            country +
            " sono state infettate " +
            latestInfectedAmount +
            " persone." +
            "\n" +
            "Ultimo controllo: " +
            lastCheck

          let link =
            "http://www.salute.gov.it/portale/nuovocoronavirus/dettaglioFaqNuovoCoronavirus.jsp?lingua=italiano&id=228"

          ctx.reply(
            returnMessage,
            Markup.inlineKeyboard([
              Markup.urlButton("Covid-19 - Domande e Risposte 🌍", link, false)
            ]).extra()
          )
        }
      })
    })
    .catch(error => {
      console.log(error)
    })
}

function getGrafico(country, ctx) {
  axios
    .get(dataSourceLink)
    .then(response => {
      // console.log(response.data)
      Papa.parse(response.data, {
        complete: function(results) {
          console.log("CSV fetch done!")
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
              const dtf = new Intl.DateTimeFormat("en", {
                year: "numeric",
                month: "short",
                day: "2-digit"
              })
              const [
                { value: mo },
                ,
                { value: da },
                ,
                { value: ye }
              ] = dtf.formatToParts(dailyCheckDate)
              dailyCheckDate = `${da}-${mo}-${ye}`

              let infectedCount = results.data[countryIndex][index]

              dailyChecks.push({ date: dailyCheckDate, cases: infectedCount })
            }
          }

          // console.log(dailyChecks)

          const width = 1000
          const height = 900
          const chartCallback = ChartJS => {
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

          Object.values(dailyChecks).forEach(element => {
            // console.log(element)
            days.push(element.date)
            cases.push(element.cases)
          })
          ;(async () => {
            const configuration = {
              type: "line",
              data: {
                labels: days,
                datasets: [
                  {
                    label: "# of Confirmed Cases in " + country,
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
                    borderWidth: 1
                  }
                ]
              },
              options: {
                scales: {
                  yAxes: [
                    {
                      ticks: {
                        beginAtZero: true,
                        callback: value => value
                      }
                    }
                  ]
                }
              }
            }
            const image = await canvasRenderService.renderToBuffer(
              configuration
            )
            // const dataUrl = await canvasRenderService.renderToDataURL(
            //   configuration
            // )
            // const stream = canvasRenderService.renderToStream(configuration)

            // console.log("data plotted " + dataUrl)
            ctx.replyWithPhoto({ source: image })
          })()
        }
      })
    })
    .catch(error => {
      console.log(error)
    })
}

Object.size = function(obj) {
  var size = 0,
    key
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++
  }
  return size
}
