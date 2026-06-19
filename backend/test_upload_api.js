import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/user.model.js';
dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne();
    if (!user) throw new Error("No user found");
    const userId = user._id.toString();
    console.log("Selected user:", userId, user.name);

    // Sign JWT token
    const token = jwt.sign(
      {
        id: userId,
        role_id: user.role_id,
        role: user.role,
        departmentId: user.departmentId || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Prepare FormData
    const formData = new FormData();
    const blob = new Blob(["%PDF-1.4 dummy content"], { type: '' });
    formData.append('pdfFile', blob, 'test.pdf');
    formData.append('userId', '6a2f8a1bc60f588c531449a6');
    formData.append('reportDate', '20-05-2026 to 19-06-2026');
    formData.append('reportType', 'developer');
    formData.append('reportPeriod', 'monthly');

    // Make request
    console.log("Sending POST request to upload endpoint...");
    const res = await fetch('http://localhost:5000/api/v1/employee-reports/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("Response data:", JSON.stringify(data, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
};

run();
