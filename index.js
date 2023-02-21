const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const exphbs = require('express-handlebars')
const todoRouts = require('./routes/todoes.js')
const { join } = require('path')

const PORT = process.env.PORT || 3000
const urlData = "mongodb+srv://ADMIN:12345@data.esqe6i9.mongodb.net/Users"

//main prosess
const app = express()
const hbs = exphbs.create({
    defaultLayout: "main",
    extname: 'hbs'
})

app.engine('hbs', hbs.engine)
app.set('view engine', 'hbs')
app.set('views','views')

//middelver for reading body in todoes.js
//permission to read the site body
app.use(express.urlencoded({extended:true}))
//way of server to file
app.use(express.static(path.join(__dirname,'public')))

app.use(todoRouts);
async function start() {
    try {
        await mongoose.connect(urlData)
        app.listen(PORT, () => {
            console.log("Server has been started...")
        })
    } catch (e) {
        console.log(e);
    }
}

start()