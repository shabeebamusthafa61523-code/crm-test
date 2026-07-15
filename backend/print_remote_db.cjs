const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27017/student_attendance_db';
const ATLAS_URI = 'mongodb://shabeeba:9995982324@cluster0.i23tzbf.mongodb.net/crm?appName=Cluster0';

const DepartmentSchema = new mongoose.Schema({}, { strict: false, collection: 'departments' });
const DesignationSchema = new mongoose.Schema({}, { strict: false, collection: 'designations' });

const Department = mongoose.model('Department', DepartmentSchema);
const Designation = mongoose.model('Designation', DesignationSchema);

async function run() {
    console.log("Connecting to Atlas...");
    await mongoose.connect(ATLAS_URI);
    const depts = await Department.find({});
    const desigs = await Designation.find({});
    console.log("DEPARTMENTS:");
    console.log(JSON.stringify(depts, null, 2));
    console.log("DESIGNATIONS:");
    console.log(JSON.stringify(desigs, null, 2));
    process.exit(0);
}

run().catch(console.error);
