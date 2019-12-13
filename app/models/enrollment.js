const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EnrollmentSchema = new Schema({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student'
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course'
  },
  approved: {
    type: Boolean,
    default: false
  }
})

const Enrollment = mongoose.model('Enrollment', EnrollmentSchema)

module.exports = Enrollment
