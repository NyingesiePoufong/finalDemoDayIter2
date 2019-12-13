const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CourseSchema = new Schema({
  shortName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  instructors: [{
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  }],
  students: [{
    type: Schema.Types.ObjectId,
    ref: 'Student',
  }],
  quizzes: [{
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  }]
})

const Course = mongoose.model('Course', CourseSchema)

module.exports = Course
