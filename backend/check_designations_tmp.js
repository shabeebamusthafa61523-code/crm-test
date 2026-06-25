import mongoose from 'mongoose';
const MONGO_URI = 'mongodb://127.0.0.1:27017/student_attendance_db';
async function run() {
  await mongoose.connect(MONGO_URI);
  const Designation = mongoose.model('Designation', new mongoose.Schema({ name: String }));
  const list = await Designation.find({});
  console.log(JSON.stringify(list, null, 2));
  await mongoose.connection.close();
}
run();
