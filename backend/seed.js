// backend/seed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import User from './src/models/user.model.js';
import Customer from './src/models/customer.model.js';
import Vendor from './src/models/vendor.model.js';
import Income from './src/models/income.model.js';
import Expense from './src/models/expense.model.js';
import Purchase from './src/models/purchase.model.js';
import Invoice from './src/models/invoice.model.js';
import EmployeeSalary from './src/models/employeeSalary.model.js';
import Designation from './src/models/designation.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_attendance_db';

const seedData = async () => {
  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Seed or ensure designations exist with exact IDs from Sidebar.jsx
    console.log('Seeding structural designations...');
    const allDesignationIds = [
      '6a1e8e2d01a0dae8b2f3b18c', // MERN Stack Developer
      '6a2f915e2df21dc234018cac', // Accountant
      '6a2f8efea2fe388770a38987', // HR Manager
      '6a1e8e6e01a0dae8b2f3b18d', // Graphic Designer
      '6a27939af292348deb7d0495', // Academic Counselor
      '6a2f912c2df21dc234018caa', // Videographer
      '6a2f91472df21dc234018cab', // Ops Manager
      '6a2f909d2df21dc234018ca8', // Marketing Specialist
      '6a2f9e086f1c41b0c80a9e21'  // HOD R&D
    ];
    await Designation.deleteMany({ _id: { $in: allDesignationIds } });
    
    const devDesignation = await Designation.create({
      _id: '6a1e8e2d01a0dae8b2f3b18c',
      name: 'MERN Stack Developer',
      isActive: true
    });
    
    const accountantDesignation = await Designation.create({
      _id: '6a2f915e2df21dc234018cac',
      name: 'Accountant',
      isActive: true
    });

    const hrDesignation = await Designation.create({
      _id: '6a2f8efea2fe388770a38987',
      name: 'HR Manager',
      isActive: true
    });

    await Designation.create({ _id: '6a1e8e6e01a0dae8b2f3b18d', name: 'Graphic Designer', isActive: true });
    await Designation.create({ _id: '6a27939af292348deb7d0495', name: 'Academic Counselor', isActive: true });
    await Designation.create({ _id: '6a2f912c2df21dc234018caa', name: 'Videographer', isActive: true });
    await Designation.create({ _id: '6a2f91472df21dc234018cab', name: 'Ops Manager', isActive: true });
    await Designation.create({ _id: '6a2f909d2df21dc234018ca8', name: 'Marketing Specialist', isActive: true });
    await Designation.create({ _id: '6a2f9e086f1c41b0c80a9e21', name: 'HOD R&D', isActive: true });

    console.log('Designations seeded successfully.');

    // 2. Clear old seeded users to prevent conflict
    await User.deleteMany({ email: { $in: ['admin@kodbrand.com', 'developer@kodbrand.com', 'accountant@kodbrand.com', 'hr@kodbrand.com'] } });

    // Hashed password for logins
    const hashedPassword = bcryptjs.hashSync('password123', 10);

    // 3. Create Admin
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@kodbrand.com',
      phone: '9876543210',
      password: hashedPassword,
      role: 'admin',
      roleId: '2', // Admin
      role_id: '2',
      isActive: true,
      status: 'active'
    });
    console.log(`Seeded Admin user: admin@kodbrand.com / password123`);

    // 4. Create MERN Developer
    const developer = await User.create({
      name: 'John MERN Developer',
      email: 'developer@kodbrand.com',
      phone: '9876543220',
      password: hashedPassword,
      role: 'employee',
      roleId: '3', // Employee
      role_id: '3',
      designation: devDesignation.name,
      designationId: devDesignation._id,
      salary: 75000,
      isActive: true,
      status: 'active'
    });
    console.log(`Seeded MERN Developer: developer@kodbrand.com / password123`);

    // 5. Create Accountant
    const accountant = await User.create({
      name: 'Sarah Accountant',
      email: 'accountant@kodbrand.com',
      phone: '9876543230',
      password: hashedPassword,
      role: 'employee',
      roleId: '3',
      role_id: '3',
      designation: accountantDesignation.name,
      designationId: accountantDesignation._id,
      salary: 60000,
      isActive: true,
      status: 'active'
    });
    console.log(`Seeded Accountant: accountant@kodbrand.com / password123`);

    // 5b. Create HR Manager
    const hrManager = await User.create({
      name: 'Emma HR Manager',
      email: 'hr@kodbrand.com',
      phone: '9876543240',
      password: hashedPassword,
      role: 'hr',
      roleId: '1',
      role_id: '1',
      designation: hrDesignation.name,
      designationId: hrDesignation._id,
      salary: 65000,
      isActive: true,
      status: 'active'
    });
    console.log(`Seeded HR Manager: hr@kodbrand.com / password123`);

    // 6. Clear old transactional data
    await Customer.deleteMany({ companyName: { $in: ['Acme Corp', 'Delta Web Systems'] } });
    await Vendor.deleteMany({ companyName: { $in: ['AWS Cloud Solutions', 'Office Stationery World'] } });
    await Income.deleteMany({ description: /seed/i });
    await Expense.deleteMany({ description: /seed/i });
    await Purchase.deleteMany({ invoiceNumber: /PUR-SEED/i });
    await Invoice.deleteMany({ invoiceNumber: /INV-SEED/i });
    await EmployeeSalary.deleteMany({ employeeId: { $in: [admin._id, developer._id, accountant._id, hrManager._id] } });

    // 7. Seed Customers & Vendors
    console.log('Seeding Customers & Vendors...');
    const cust1 = await Customer.create({
      name: 'John Doe',
      companyName: 'Acme Corp',
      email: 'john@acme.com',
      phone: '9876543210',
      gstNumber: '27AAAAA1111A1Z1',
      address: 'Mumbai, Maharashtra'
    });
    const cust2 = await Customer.create({
      name: 'Alice Smith',
      companyName: 'Delta Web Systems',
      email: 'alice@deltaweb.com',
      phone: '9876543211',
      gstNumber: '27BBBBB2222B2Z2',
      address: 'Pune, Maharashtra'
    });

    const vend1 = await Vendor.create({
      name: 'Amazon Web Services',
      companyName: 'AWS Cloud Solutions',
      email: 'billing@aws.com',
      phone: '1800123456',
      gstNumber: '27CCCCC3333C3Z3',
      address: 'Bangalore, Karnataka'
    });

    // 8. Seed monthly transactions spread across past 6 months
    console.log('Seeding monthly financial transactions...');
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const monthLabel = monthDate.toLocaleString('default', { month: 'short' });
      const monthPad = String(month + 1).padStart(2, '0');

      // Seed Income
      const incomeAmt = 160000 + Math.floor(Math.random() * 60000);
      await Income.create({
        date: new Date(year, month, 15),
        customerId: cust1._id,
        customerName: cust1.companyName,
        invoiceNumber: `INV-SEED-${year}${monthPad}-01`,
        gstNumber: cust1.gstNumber,
        paymentMethod: 'Bank Transfer',
        amount: incomeAmt,
        description: `Retainer project payout seed for ${monthLabel}`,
        status: 'Active',
        createdBy: admin._id
      });

      // Seed Expense
      const expAmt = 12000 + Math.floor(Math.random() * 6000);
      const expTax = Number((expAmt * 0.18).toFixed(2));
      await Expense.create({
        expenseType: 'Operational',
        expenseName: `Server infrastructure ${monthLabel}`,
        expenseDate: new Date(year, month, 10),
        vendorId: vend1._id,
        vendorName: vend1.companyName,
        category: 'Software Subscription',
        amount: expAmt,
        description: `Server infrastructure bill seed for ${monthLabel}`,
        gstNumber: vend1.gstNumber,
        invoiceNumber: `EXP-AWS-SEED-${year}${monthPad}`,
        taxAmount: expTax,
        paymentMethod: 'Bank Transfer',
        status: 'Paid',
        approvedBy: admin._id,
        approvedDate: new Date(year, month, 10),
        createdBy: admin._id
      });

      // Seed Purchase
      const purAmt = 20000 + Math.floor(Math.random() * 10000);
      const purTax = Number((purAmt * 0.18).toFixed(2));
      await Purchase.create({
        purchaseDate: new Date(year, month, 18),
        vendorId: vend1._id,
        vendorName: vend1.companyName,
        invoiceNumber: `PUR-SEED-INV-${year}${monthPad}`,
        gstNumber: vend1.gstNumber,
        items: [{
          productName: `Developer hardware workstation accessories seed`,
          quantity: 1,
          unitPrice: purAmt,
          taxAmount: purTax,
          totalAmount: purAmt + purTax
        }],
        amount: purAmt,
        tax: purTax,
        status: 'Paid',
        createdBy: admin._id
      });

      // Seed Invoice (Paid)
      const invPaidAmt = 100000 + Math.floor(Math.random() * 20000);
      const invPaidTax = Number((invPaidAmt * 0.18).toFixed(2));
      await Invoice.create({
        invoiceNumber: `INV-SEED-${year}${monthPad}-P1`,
        customerId: cust1._id,
        customerName: cust1.companyName,
        gstNumber: cust1.gstNumber,
        invoiceDate: new Date(year, month, 5),
        dueDate: new Date(year, month, 20),
        items: [{
          description: `Custom software layout designing seed`,
          quantity: 1,
          unitPrice: invPaidAmt,
          taxAmount: invPaidTax,
          totalAmount: invPaidAmt + invPaidTax
        }],
        amount: invPaidAmt,
        tax: invPaidTax,
        grandTotal: invPaidAmt + invPaidTax,
        status: 'Paid',
        paymentDate: new Date(year, month, 19),
        paymentReference: `TXN-SEED-PAY-${year}${monthPad}`,
        createdBy: admin._id
      });

      // Seed outstanding pending invoice
      const invPendAmt = 70000 + Math.floor(Math.random() * 15000);
      const invPendTax = Number((invPendAmt * 0.18).toFixed(2));
      await Invoice.create({
        invoiceNumber: `INV-SEED-${year}${monthPad}-P2`,
        customerId: cust2._id,
        customerName: cust2.companyName,
        gstNumber: cust2.gstNumber,
        invoiceDate: new Date(year, month, 12),
        dueDate: new Date(year, month, 26),
        items: [{
          description: `API integration backend contract milestone seed`,
          quantity: 1,
          unitPrice: invPendAmt,
          taxAmount: invPendTax,
          totalAmount: invPendAmt + invPendTax
        }],
        amount: invPendAmt,
        tax: invPendTax,
        grandTotal: invPendAmt + invPendTax,
        status: i === 0 ? 'Pending' : 'Overdue',
        createdBy: admin._id
      });

      // Seed Developer Salary Slip (so he has slips and history to view!)
      const devBasic = 60000;
      await EmployeeSalary.create({
        employeeId: developer._id,
        month: month + 1,
        year: year,
        workingDays: 26,
        daysWorked: 26,
        daysOnLeave: 0,
        basicSalary: devBasic,
        houseRentAllowance: 12000,
        transportAllowance: 3000,
        providentFund: 4800,
        professionalTax: 200,
        status: 'Published',
        approvedBy: admin._id,
        createdBy: admin._id,
        salarySlipNumber: `KOD-SAL-${monthPad}${year}-${developer._id.toString().slice(-3)}`
      });

      // Seed Admin Salary Slip
      const admBasic = 80000;
      await EmployeeSalary.create({
        employeeId: admin._id,
        month: month + 1,
        year: year,
        workingDays: 26,
        daysWorked: 26,
        daysOnLeave: 0,
        basicSalary: admBasic,
        houseRentAllowance: 16000,
        transportAllowance: 4000,
        providentFund: 6400,
        professionalTax: 200,
        status: 'Published',
        approvedBy: admin._id,
        createdBy: admin._id,
        salarySlipNumber: `KOD-SAL-${monthPad}${year}-${admin._id.toString().slice(-3)}`
      });
    }

    console.log(' 🌱 Successfully seeded MERN Developer, Accountant, and transaction ledgers!');
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  } catch (err) {
    console.error(' ❌ Seeding failed with exception:', err.stack || err);
    process.exit(1);
  }
};

seedData();
