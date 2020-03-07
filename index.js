const Telegraf = require("telegraf")
const Markup = require("telegraf/markup")
const Extra = require("telegraf/extra")

// Utils
const TelegrafInlineMenu = require("telegraf-inline-menu")
const axios = require("axios")
const Papa = require("papaparse")
require("dotenv").config()

let welcomeMessage =
  ", questo bot ti permette di controllare il numero di casi di contagio in Italia, ed è ancora in fase sperimentale.\n➡ Premi il tasto Controlla per controllare l'ultimo conteggio ufficiale"

const welcomeMenu = new TelegrafInlineMenu(
  ctx => `Benvenuto ${ctx.from.first_name}` + welcomeMessage
)
welcomeMenu.simpleButton("Controlla 📊", "a", {
  doFunc: ctx => fetchLatest("Italy", ctx)
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
  let sourceLink =
    "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv"

  axios
    .get(sourceLink)
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

Object.size = function(obj) {
  var size = 0,
    key
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++
  }
  return size
}
