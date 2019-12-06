const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SurveySchema = new Schema({
  surveyName: {
    type: String,
    required: true
  },
  course: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  teacher: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date,
    required: false
  },
  studentName: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: false
  },
  questions: {
    type: Array,
    required: true
  },
  results: {
    type: String,
    required: true
  }
})

const Survey = mongoose.model('Survey', AssignnmentSchema, 'surveys')

module.exports = Survey
