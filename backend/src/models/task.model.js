// ── src/models/task.model.js ──
import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  file_url: {
    type: String
  },
  file_public_id: {
    type: String
  },
  designation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      if (ret.created_by) {
        ret.user_id = ret.created_by.toString();
      }
      if (ret.file_url) {
        ret.file = ret.file_url;
        ret.image = ret.file_url;
      }
      delete ret._id;
      delete ret.file_public_id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      if (ret.created_by) {
        ret.user_id = ret.created_by.toString();
      }
      if (ret.file_url) {
        ret.file = ret.file_url;
        ret.image = ret.file_url;
      }
      delete ret._id;
      delete ret.file_public_id;
      delete ret.__v;
      return ret;
    }
  }
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
