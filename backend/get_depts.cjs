const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: String,
  status: Boolean,
});
const Department = mongoose.model('Department', departmentSchema);

async function run() {
  await mongoose.connect('mongodb+srv://shabeeba:9995982324@cluster0.i23tzbf.mongodb.net/crm?appName=Cluster0');
  const depts = await Department.find({});
  console.log(JSON.stringify(depts, null, 2));
  process.exit(0);
}
run().catch(console.error);
