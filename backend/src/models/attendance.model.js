import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  status: { type: String, default: 'PRESENT' }, // PRESENT, ABSENT
  check_in_time: { type: String, default: null }, // UTC ISO String
  check_out_time: { type: String, default: null }, // UTC ISO String
  working_hours: { type: String, default: '0.00' },
  is_late: { type: Boolean, default: false },
  overtime: { type: String, default: '0.00' }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound unique index to make sure a user only has one log entry per day
attendanceSchema.index({ user_id: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);