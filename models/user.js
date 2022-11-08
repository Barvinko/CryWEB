const { Schema, model } = require('mongoose')

//модель для базы даних

const schema = new Schema({
    login: {
        type: String,
        require: true
    },
    password: {
        type: Number,
        require: true
    },
    messages: {
        type: Object,
        require: true
    }
})

module.exports = model('User', schema)