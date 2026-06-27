// resetPasswords.js — Run once: node resetPasswords.js
// Resets all seeded user passwords to: password123

import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_attendance_db';

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

const emails = [
  'admin@kodbrand.com',
  'hr@kodbrand.com',
  'accountant@kodbrand.com',
  'developer@kodbrand.com'
];

mongoose.connect(MONGO_URI).then(async () => {
  console.log('✅ Connected to MongoDB');

  const newHash = await bcryptjs.hash('password123', 10);

  for (const email of emails) {
    const result = await User.updateOne(
      { email },
      { $set: { password: newHash, passwordHash: newHash, isActive: true, status: 'active' } }
    );
    if (result.matchedCount > 0) {
      console.log(`✅ Reset password for: ${email}`);
    } else {
      console.log(`⚠️  User not found: ${email}`);
    }
  }

  console.log('\n🎉 Done! All users can now login with password: password123');
  console.log('   admin@kodbrand.com     / password123');
  console.log('   hr@kodbrand.com        / password123');
  console.log('   accountant@kodbrand.com/ password123');
  console.log('   developer@kodbrand.com / password123');

  await mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
