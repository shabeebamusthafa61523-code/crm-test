import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_attendance_db';

async function checkDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');
    
    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    const dbs = await admin.listDatabases();
    console.log('--- DATABASES ---');
    console.log(dbs.databases.map(d => d.name));
    
    console.log('--- CURRENT DB COLLECTIONS ---');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(collections.map(c => c.name));
    
    if (collections.some(c => c.name === 'users')) {
      const users = await mongoose.connection.db.collection('users').find({}).toArray();
      console.log(`--- USERS COUNT: ${users.length} ---`);
      users.forEach(u => {
        console.log(`Name: ${u.name} | Email: ${u.email} | Dept: ${u.departmentId}`);
      });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkDB();
