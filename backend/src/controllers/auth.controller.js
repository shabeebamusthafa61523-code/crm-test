import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export const signup = async (req, res) => {
  try {
    const {
      name, email, password, phone, role_id, status,
      designation_id, joining_date, salary, address,
      identityType, identityNumber, profile_image
    } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ detail: "A user profile with this email already exists." });
    }

    // 2. Hash security password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create document instance
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      passwordHash: hashedPassword,
      phone,
      role_id: String(role_id),
      role: String(role_id || 'employee'),
      status: status || 'active',
      isActive: (status || 'active') === 'active',
      designation_id: String(designation_id),
      joining_date: new Date(joining_date),
      salary: parseFloat(salary) || 0,
      address,
      identityType,
      identityNumber,
      profile_image: profile_image || null,
      avatar: profile_image || null,
      employeeId: email
    });

    await newUser.save();

    res.status(201).json({ message: "Staff Registration Successful!", userId: newUser._id });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};



export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ detail: "Invalid credentials provided." });
    }

    // 2. Verify password
    const storedPassword = user.password || user.passwordHash;
    const validPassword = storedPassword && await bcrypt.compare(password, storedPassword);
    if (!validPassword) {
      return res.status(401).json({ detail: "Invalid credentials provided." });
    }

    // 3. Sign Auth JWT Token
    const token = jwt.sign(
      {
        id: user._id,
        role_id: user.role_id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    // 4. Return matching data structure required by your React components
    res.json({
      success: true, // Added to match standard response handlers
      message: "Login successful",
      token,
      user: {
        id: user._id,          // Standardized frontend fallback id
        _id: user._id,        // Native MongoDB ID mapping
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role || "employee",
        role_id: user.role_id,
        designation: user.designation,
        designationId: user.designationId || user.designation_id, 
        reportingManager: user.reportingManager || null,
        salary: user.salary ?? 0,
        profile_image: user.profile_image || null,
        departmentId: user.departmentId || null,
        employeeId: user.employeeId || null,
        avatar: user.avatar || null,
        isActive: user.isActive ?? true,
        status: user.status || "active",
        joining_date: user.joining_date,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};