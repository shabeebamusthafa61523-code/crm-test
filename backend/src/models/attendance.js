const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  student_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  date: { 
    type: String, // YYYY-MM-DD string format matching frontend state
    required: true 
  },
  status: { 
    type: String, 
    enum: ['present', 'absent'], 
    required: true 
  },
  check_in_time: { 
    type: String 
  },
  check_out_time: { 
    type: String 
  }
}, { timestamps: true });

// Ensure a single record per student per day
AttendanceSchema.index({ student_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);