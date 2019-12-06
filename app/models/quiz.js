const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QuizSchema = new Schema({
  quizName: {
    type: String,
    required: true
  },
  course: {
    type: String,
  },
  section: {
    type: String,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
  },
  questions: {
    type: Array,
    required: true
  }
})

const Quiz = mongoose.model('Quiz', QuizSchema)

module.exports = Quiz
