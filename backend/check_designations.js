import mongoose from 'mongoose';
import User from './src/models/user.model.js';

const MONGO_URI = 'mongodb://127.0.0.1:27017/student_attendance_db';

async function run() {
  await mongoose.connect(MONGO_URI);
  const list = await User.find({});
  console.log(JSON.stringify(list, null, 2));
  await mongoose.connection.close();
}

run();
