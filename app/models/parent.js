const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ParentSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  picture: {
    type: String,
  },
  students: [{
    type: Schema.Types.ObjectId,
    ref: 'Student'
  }]
})

const Parent = mongoose.model('Parent', ParentSchema)

module.exports = Parent
