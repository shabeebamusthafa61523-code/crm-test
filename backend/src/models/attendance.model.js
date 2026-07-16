// ===============================
// BACKEND: attendance.model.js
// ===============================

import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  date: {
    type: String,
    required: true
  },

  // Enforced enum for all valid attendance states
  status: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY'],
    default: 'PRESENT'
  },

  check_in_time: {
    type: Date,
    default: null
  },

  check_out_time: {
    type: Date,
    default: null
  },

  working_hours: {
    type: String,
    default: '0.00'
  },

  is_late: {
    type: Boolean,
    default: false
  },

  overtime: {
    type: String,
    default: '0.00'
  },

  // Break tracking fields
  break_start: {
    type: Date,
    default: null
  },

  break_end: {
    type: Date,
    default: null
  },

  break_duration: {
    type: Number,
    default: 0  // in minutes
  },

  // Shift identifier
  shift: {
    type: String,
    enum: ['morning', 'evening', 'night', 'flexible'],
    default: 'morning'
  },

  // Shift start time threshold for late calculation (HH:MM in IST)
  shift_start: {
    type: String,
    default: '09:00'
  },

  // Admin override notes
  notes: {
    type: String,
    default: ''
  },

  // Who performed last admin override
  overridden_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }

}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

attendanceSchema.index(
  { user_id: 1, date: 1 },
  { unique: true }
);

attendanceSchema.index({ date: 1 });
attendanceSchema.index({ user_id: 1, status: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;