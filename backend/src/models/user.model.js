import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  role: { type: String, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  employeeId: { type: String, required: true, unique: true },
  avatar: { type: String },
  passwordHash: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true });

// Case-insensitive index searching support for the controller search features
userSchema.index({ name: 'text', email: 'text', employeeId: 'text' });

const User = mongoose.model('User', userSchema);
export default User;