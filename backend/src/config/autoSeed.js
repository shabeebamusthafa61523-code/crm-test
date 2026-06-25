import bcryptjs from 'bcryptjs';
import User from '../models/user.model.js';
import Designation from '../models/designation.model.js';
import Department from '../modules/departments/department.model.js';

export const autoSeed = async () => {
  try {
    console.log(' [AutoSeed] Starting database seeding process...');

    // 1. Ensure designations exist with exact IDs
    const designationsToSeed = [
      { _id: '6a1e8e2d01a0dae8b2f3b18c', name: 'MERN Stack Developer', isActive: true },
      { _id: '6a2f915e2df21dc234018cac', name: 'Accountant', isActive: true },
      { _id: '6a2f8efea2fe388770a38987', name: 'HR Manager', isActive: true },
      { _id: '6a1e8e6e01a0dae8b2f3b18d', name: 'Graphic Designer', isActive: true },
      { _id: '6a27939af292348deb7d0495', name: 'Academic Counselor', isActive: true },
      { _id: '6a2f912c2df21dc234018caa', name: 'Videographer', isActive: true },
      { _id: '6a2f91472df21dc234018cab', name: 'Ops Manager', isActive: true },
      { _id: '6a2f909d2df21dc234018ca8', name: 'Marketing Specialist', isActive: true },
      { _id: '6a2f9e086f1c41b0c80a9e21', name: 'HOD R&D', isActive: true }
    ];

    for (const des of designationsToSeed) {
      const exists = await Designation.findById(des._id);
      if (!exists) {
        // Also check if designation with same name exists, delete it first to prevent duplicate names
        await Designation.deleteMany({ name: des.name });
        await Designation.create(des);
        console.log(` [AutoSeed] Seeded designation: ${des.name}`);
      }
    }

    // 2. Ensure default department exists
    let defaultDept = await Department.findOne({ name: 'HR & Operations' });
    if (!defaultDept) {
      defaultDept = await Department.create({
        name: 'HR & Operations',
        code: 'HR-OPS',
        description: 'Human Resources and Operations Department',
        isActive: true
      });
      console.log(' [AutoSeed] Default department seeded.');
    }

    const hashedPassword = bcryptjs.hashSync('password123', 10);

    // 3. Ensure Admin exists
    const adminEmail = 'admin@kodbrand.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'System Admin',
        email: adminEmail,
        phone: '9876543210',
        password: hashedPassword,
        role: 'admin',
        roleId: '2',
        role_id: '2',
        isActive: true,
        status: 'active',
        employeeId: 'KOD-EMP-001'
      });
      console.log(' [AutoSeed] Seeded Admin: admin@kodbrand.com / password123');
    }

    // 4. Ensure Developer exists
    const devEmail = 'developer@kodbrand.com';
    let developer = await User.findOne({ email: devEmail });
    if (!developer) {
      developer = await User.create({
        name: 'John MERN Developer',
        email: devEmail,
        phone: '9876543220',
        password: hashedPassword,
        role: 'employee',
        roleId: '3',
        role_id: '3',
        designation: 'MERN Stack Developer',
        designationId: '6a1e8e2d01a0dae8b2f3b18c',
        salary: 75000,
        isActive: true,
        status: 'active',
        employeeId: 'KOD-EMP-002',
        departmentId: defaultDept._id
      });
      console.log(' [AutoSeed] Seeded Developer: developer@kodbrand.com / password123');
    } else {
      // Ensure the designationId is set correctly
      if (!developer.designationId || String(developer.designationId) !== '6a1e8e2d01a0dae8b2f3b18c') {
        developer.designationId = '6a1e8e2d01a0dae8b2f3b18c';
        developer.designation = 'MERN Stack Developer';
        await developer.save();
        console.log(' [AutoSeed] Updated Developer designation ID.');
      }
    }

    // 5. Ensure Accountant exists
    const accEmail = 'accountant@kodbrand.com';
    let accountant = await User.findOne({ email: accEmail });
    if (!accountant) {
      accountant = await User.create({
        name: 'Sarah Accountant',
        email: accEmail,
        phone: '9876543230',
        password: hashedPassword,
        role: 'employee',
        roleId: '3',
        role_id: '3',
        designation: 'Accountant',
        designationId: '6a2f915e2df21dc234018cac',
        salary: 60000,
        isActive: true,
        status: 'active',
        employeeId: 'KOD-EMP-003',
        departmentId: defaultDept._id
      });
      console.log(' [AutoSeed] Seeded Accountant: accountant@kodbrand.com / password123');
    } else {
      // Ensure the designationId is set correctly
      if (!accountant.designationId || String(accountant.designationId) !== '6a2f915e2df21dc234018cac') {
        accountant.designationId = '6a2f915e2df21dc234018cac';
        accountant.designation = 'Accountant';
        await accountant.save();
        console.log(' [AutoSeed] Updated Accountant designation ID.');
      }
    }

    // 6. Ensure HR Manager exists
    const hrEmail = 'hr@kodbrand.com';
    let hr = await User.findOne({ email: hrEmail });
    if (!hr) {
      hr = await User.create({
        name: 'Emma HR Manager',
        email: hrEmail,
        phone: '9876543240',
        password: hashedPassword,
        role: 'hr',
        roleId: '1',
        role_id: '1',
        designation: 'HR Manager',
        designationId: '6a2f8efea2fe388770a38987',
        salary: 65000,
        isActive: true,
        status: 'active',
        employeeId: 'KOD-EMP-004',
        departmentId: defaultDept._id
      });
      console.log(' [AutoSeed] Seeded HR Manager: hr@kodbrand.com / password123');
    } else {
      // Ensure the designationId is set correctly
      if (!hr.designationId || String(hr.designationId) !== '6a2f8efea2fe388770a38987') {
        hr.designationId = '6a2f8efea2fe388770a38987';
        hr.designation = 'HR Manager';
        await hr.save();
        console.log(' [AutoSeed] Updated HR Manager designation ID.');
      }
    }

    console.log(' [AutoSeed] Seeding process finished successfully.');
  } catch (err) {
    console.error(' [AutoSeed] Seeding failed:', err.message);
  }
};
