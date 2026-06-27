import mongoose from 'mongoose';

const aiReportCacheSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true // 'daily' or 'monthly'
  },
  departmentId: {
    type: String,
    default: 'all'
  },
  report: {
    type: String,
    required: true
  },
  stats: {
    type: Object,
    required: true
  },
  lastGenerated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('AiReportCache', aiReportCacheSchema);
