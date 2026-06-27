// fixUsers.js — Run with: node fixUsers.js
// Uses the real User model to properly hash and fix all user passwords

import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_attendance_db';

// ─── Real User Schema (matches user.model.js exactly) ────────────────────────
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  role: { type: String, default: 'employee' },
  role_id: { type: String, default: '3' },
  designation: { type: String },
  designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  department: { type: String },
  reportingManager: { type: String },
  joining_date: { type: Date },
  salary: { type: Number, default: 0 },
  address: { type: String },
  identityType: { type: String },
  identityNumber: { type: String },
  profile_image: { type: String },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  employeeId: { type: String, unique: true, sparse: true },
  avatar: { type: String },
  password: { type: String },
  passwordHash: { type: String },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
  lastLogin: { type: Date },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const usersToFix = [
  { email: 'admin@kodbrand.com',      name: 'System Admin',      role: 'admin',    role_id: '2', phone: '9876543210', employeeId: 'KOD-EMP-001' },
  { email: 'hr@kodbrand.com',         name: 'Emma HR Manager',   role: 'hr',       role_id: '1', phone: '9876543240', employeeId: 'KOD-EMP-004', designation: 'HR Manager' },
  { email: 'accountant@kodbrand.com', name: 'Sarah Accountant',  role: 'employee', role_id: '3', phone: '9876543230', employeeId: 'KOD-EMP-003', designation: 'Accountant' },
  { email: 'developer@kodbrand.com',  name: 'John MERN Developer',role: 'employee',role_id: '3', phone: '9876543220', employeeId: 'KOD-EMP-002', designation: 'MERN Stack Developer' },
];

const PASSWORD = 'password123';

mongoose.connect(MONGO_URI).then(async () => {
  console.log('✅ Connected to MongoDB:', MONGO_URI);
  console.log('');

  const newHash = await bcryptjs.hash(PASSWORD, 10);

  // Verify hash is correct
  const verify = await bcryptjs.compare(PASSWORD, newHash);
  console.log(`🔐 Hash verification test: ${verify ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  for (const userData of usersToFix) {
    let user = await User.findOne({ email: userData.email });

    if (user) {
      // Update password using findByIdAndUpdate to bypass middleware issues
      await User.findByIdAndUpdate(user._id, {
        $set: {
          password: newHash,
          passwordHash: newHash,
          isActive: true,
          status: 'active',
          name: userData.name,
          role: userData.role,
          role_id: userData.role_id,
        }
      });

      // Verify the fix
      const updated = await User.findOne({ email: userData.email });
      const passwordMatch = await bcryptjs.compare(PASSWORD, updated.password || '');
      console.log(`${passwordMatch ? '✅' : '❌'} ${userData.email} → password match: ${passwordMatch}`);
    } else {
      // Create user if doesn't exist
      const newUser = new User({
        ...userData,
        password: newHash,
        passwordHash: newHash,
        isActive: true,
        status: 'active',
      });
      await newUser.save();
      console.log(`🆕 Created: ${userData.email}`);
    }
  }

  // Final summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 All users fixed! Login with:');
  console.log('   admin@kodbrand.com       / password123');
  console.log('   hr@kodbrand.com          / password123');
  console.log('   accountant@kodbrand.com  / password123');
  console.log('   developer@kodbrand.com   / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
