const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SurveySchema = new Schema({
  SurveyName: {
    type: String,
    required: true
  },
  quizName: {
    type:String,
    required:true
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

const Survey = mongoose.model('Survey', AssignnmentSchema, 'surveys')

module.exports = Survey
