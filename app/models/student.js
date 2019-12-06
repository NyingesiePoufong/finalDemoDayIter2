const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StudentSchema = new Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
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
