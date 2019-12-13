const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StudentSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Parent'
  },
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  picture: {
    type: String,
  },
  course: {
    type: Array,
  },
  grade: {
    type: String,
  },
  quizzResults: {
    type: Array,
  },
  surveyResults: {
    type: Array,
  },
  completedAssignments: {
    type: Array,
  }
})

const Student = mongoose.model('Student', StudentSchema)

module.exports = Student
