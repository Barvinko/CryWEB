const { Schema, model } = require('mongoose')

//модель для зберігання ключів сесії

const schema = new Schema({
    sessionPrivateKey: {
        type: Object,
        require: true
    },
    sessionPublicKey: {
        type: Object,
        require: true
    },
    sessionPublicKeyUser: {
        type: Object,
    },
    sessionKey:{
        type: Object,
    },
    IV:{
        type: Object,
    },
    message:{
        type: Object
    }
})

module.exports = model('Session', schema)