require('dotenv').config()
const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')

// Utils
const TelegrafInlineMenu = require('telegraf-inline-menu')
const axios = require('axios')
// const Papa = require("papaparse")
const { CanvasRenderService } = require('chartjs-node-canvas')

const PORT = process.env.PORT || 3000

const http = require('http')
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Esempio server HTTP\n')
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
  ', questo bot ti permette di controllare il numero di casi di contagio in Italia, ed è ancora in fase sperimentale.\n'

// let dataSourceLink =
//   "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv"

let cronologiaLink =
  'https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json'

let latestLink =
  'https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale-latest.json'

////////////////////////////////////////////////////////////

const welcomeMenu = new TelegrafInlineMenu(
  (ctx) => `Benvenuto ${ctx.from.first_name}` + welcomeMessage
)
welcomeMenu.simpleButton('Controlla i contagi 🔍', 'a', {
  doFunc: (ctx) => fetchLatest(latestLink, ctx),
})
welcomeMenu.simpleButton('Ottieni un grafico 📊', 'b', {
  doFunc: (ctx) => getGrafico(cronologiaLink, ctx),
})

welcomeMenu.setCommand('start')

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.use(welcomeMenu.init())
// bot.start(ctx => ctx.reply("Welcome"))
bot.help((ctx) => ctx.reply('TODO'))
// bot.on("sticker", ctx => ctx.reply("👍"))
// bot.hears("hi", ctx => ctx.reply("Hey there"))
bot.launch()

function fetchLatest(latestLink, ctx) {
  axios.get(latestLink).then((response) => {
    let report = response.data[0]
    let returnMessage =
      'Attualmente in Italia sono state infettate ' +
      report.totale_casi +
      ' persone.' +
      '\n' +
      'Ultimo controllo: ' +
      report.data

    let faqLink =
      'http://www.salute.gov.it/portale/nuovocoronavirus/dettaglioFaqNuovoCoronavirus.jsp?lingua=italiano&id=228'

    ctx.reply(
      returnMessage,
      Markup.inlineKeyboard([
        Markup.urlButton('Covid-19 - Domande e Risposte 🌍', faqLink, false),
      ]).extra()
    )
  })
}

function getGrafico(cronologiaLink, ctx) {
  axios
    .get(cronologiaLink)
    .then((response) => {
      let history = []
      response.data.forEach((element) => {
        let giorno = new Date(element.data)
        giorno = giorno.toLocaleDateString('it-IT', { timeZone: 'UTC' })
        history.push({ date: giorno, cases: element.totale_casi })
      })

      // chart here
      const width = 900 //px
      const height = 1000 //px
      const chartCallback = (ChartJS) => {
        ChartJS.defaults.global.elements.rectangle.borderWidth = 2
        ChartJS.plugins.register({})
        ChartJS.controllers.MyType = ChartJS.DatasetController.extend({})
      }
      const canvasRenderService = new CanvasRenderService(
        width,
        height,
        chartCallback
      )

      let days = []
      let cases = []
      Object.values(history).forEach((element) => {
        days.push(element.date)
        cases.push(element.cases)
      })
      async function draw() {
        const configuration = {
          type: 'line',
          data: {
            labels: days,
            datasets: [
              {
                label: '# of Confirmed Cases in Italy',
                data: cases,
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
        const image = await canvasRenderService.renderToBuffer(configuration)
        ctx.replyWithMediaGroup([
          {
            media: { source: image },
            caption:
              'Grafico del ' +
              days[days.length - 1] +
              ' \nby @coronastatusitbot',
            type: 'photo',
          },
        ])
      }
      draw()
    })
    .catch((error) => {
      console.log(error)
    })
}

Object.size = function (obj) {
  var size = 0,
    key
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++
  }
  return size
}
