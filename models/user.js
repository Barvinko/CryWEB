const { Schema, model } = require('mongoose')

//модель для базы даних

const schema = new Schema({
    login: {
        type: String,
        require: true
    },
    password: {
        type: String,
        require: true
    },
    publicKey:{
        type: Object,
        require: true
    },
    messages: {
        type: Array,
        require: true
    }
})

module.exports = model('User', schema)