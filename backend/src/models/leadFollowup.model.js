import mongoose from 'mongoose';

const leadFollowupSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  remarks: {
    type: String,
    trim: true
  },
  nextFollowUpDate: {
    type: Date
  },
  callSummary: {
    type: String,
    trim: true
  },
  meetingNotes: {
    type: String,
    trim: true
  },
  statusChangedTo: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  },
  toObject: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

const LeadFollowup = mongoose.model('LeadFollowup', leadFollowupSchema);
export default LeadFollowup;
