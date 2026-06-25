// backend/verify_registration.js
import mongoose from 'mongoose';
import User from './src/models/user.model.js';

const MONGO_URI = 'mongodb://127.0.0.1:27017/student_attendance_db';
const BASE_URL = 'http://localhost:5000/api';

const runVerification = async () => {
  try {
    console.log('Connecting to database directly to verify...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Clean up old verification test user
    const testEmail = 'verify_accountant_reg@kodbrand.com';
    await User.deleteMany({ email: testEmail });

    console.log('1. Posting signup request as a new Accountant...');
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Reg Test Accountant',
        email: testEmail,
        password: 'password123',
        phone: '9876543299',
        role_id: '3', // Employee
        designation_id: '6a2f915e2df21dc234018cac', // Accountant
        joining_date: new Date().toISOString().split('T')[0],
        salary: 50000,
        address: 'Test Address Pune',
        identityType: 'aadhaar',
        identityNumber: '123412341234'
      })
    });

    const signupResult = await signupRes.json();
    console.log('Signup response status:', signupRes.status);
    console.log('Signup response data:', signupResult);

    if (signupRes.status !== 201) {
      throw new Error(`Signup failed: ${JSON.stringify(signupResult)}`);
    }

    console.log('✅ Signup completed successfully.');

    // 2. Query MongoDB user collection directly to check fields
    console.log('2. Querying user document directly from MongoDB...');
    const userDoc = await User.findOne({ email: testEmail });
    if (!userDoc) {
      throw new Error('User document was not found in the database!');
    }

    console.log('Queried User designationId:', userDoc.designationId);
    console.log('Queried User designation:', userDoc.designation);

    if (String(userDoc.designationId) !== '6a2f915e2df21dc234018cac') {
      throw new Error(`Verification FAILED: designationId is "${userDoc.designationId}" instead of "6a2f915e2df21dc234018cac"`);
    }

    if (userDoc.designation !== 'Accountant') {
      throw new Error(`Verification FAILED: designation name is "${userDoc.designation}" instead of "Accountant"`);
    }

    console.log('✅ DATABASE VERIFICATION PASSED! designationId and designation name were successfully populated.');
    await User.deleteMany({ email: testEmail }); // clean up
    await mongoose.connection.close();
    console.log('\n🎉 ALL REGISTRATION SIGNUP TESTS PASSED!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    try { await mongoose.connection.close(); } catch(e){}
    process.exit(1);
  }
};

runVerification();
