const { Schema, model } = require('mongoose')

//модель для базы даних

const schema = new Schema({
  title: {
    type: String,
    //указываеться что без этих даних даная модель не может быть сосздана
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  }
})

module.exports = model('Todo', schema)