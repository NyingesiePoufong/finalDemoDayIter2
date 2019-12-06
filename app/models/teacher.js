const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TeacherSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  picture: {
    type: String,
  },
  course: {
    type: Array,
  },
  students: {
    type: Array,
  },
  quizzes: {
    type: Array
  }
})

const Teacher = mongoose.model('Teacher', TeacherSchema)

module.exports = Teacher
