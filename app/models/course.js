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
  instructors: {
    type: Array,
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
  students: {
    type: Array,
    required: false
  },
  sections: {
    type: Array,
    required: true
  },
  quizzes: {
    type: Array,
    required: true
  }
})

const Course = mongoose.model('Course', CourseSchema)

module.exports = Course
