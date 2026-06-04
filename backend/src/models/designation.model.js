import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

designationSchema.index({ name: 1 });

const Designation = mongoose.model('Designation', designationSchema);
export default Designation;
