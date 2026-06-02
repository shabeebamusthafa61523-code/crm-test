// src/models/userDepartment.model.js

import mongoose from 'mongoose';

const userDepartmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department ID is required']
  },
  roleInDepartment: {
    type: String,
    trim: true,
    default: 'member'
  },
  isPrimary: {
    type: Boolean,
    default: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'userDepartments' // Match the existing collection name exactly!
});

// Avoid duplicate user assignments to the same department
userDepartmentSchema.index({ userId: 1, departmentId: 1 }, { unique: true });

const UserDepartment = mongoose.model('UserDepartment', userDepartmentSchema);

export default UserDepartment;
