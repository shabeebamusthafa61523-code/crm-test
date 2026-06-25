import mongoose from 'mongoose';

const employeeSalarySchema = new mongoose.Schema({
  salarySlipNumber: {
    type: String,  // e.g., "KOD-SAL-052026-001"
    required: true,
    unique: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,  // 1-12
    required: true
  },
  year: {
    type: Number,  // 2026
    required: true
  },
  
  // Attendance
  workingDays: { type: Number, default: 26 },
  daysWorked: { type: Number, required: true },
  daysOnLeave: { type: Number, default: 0 },
  
  // Earnings
  basicSalary: { type: Number, required: true },
  houseRentAllowance: { type: Number, default: 0 },
  specialAllowance: { type: Number, default: 0 },
  transportAllowance: { type: Number, default: 0 },
  otherAllowance: { type: Number, default: 0 },
  kodbrandIntegrityAward: { type: Number, default: 0 },
  totalEarnings: { type: Number },  // Auto-calculated
  
  // Deductions
  advanceSalary: { type: Number, default: 0 },
  providentFund: { type: Number, default: 0 },
  professionalTax: { type: Number, default: 0 },
  incomeTax: { type: Number, default: 0 },
  unpaidLeaveDeduction: { type: Number, default: 0 },
  otherDeductions: { type: Number, default: 0 },
  totalDeductions: { type: Number },  // Auto-calculated
  
  // Calculation
  netPay: { type: Number },  // Auto-calculated
  
  // Status & Meta
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Archived'],
    default: 'Draft'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalDate: Date,
  publishedDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Email tracking
  emailSentTo: String,
  emailSentDate: Date,
  
  // Notes
  remarks: String
}, { timestamps: true });

// Compound index to ensure one slip per employee per month/year
employeeSalarySchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

// Auto-calculate totals before save
employeeSalarySchema.pre('save', function(next) {
  this.totalEarnings = (this.basicSalary || 0) + 
                       (this.houseRentAllowance || 0) + 
                       (this.specialAllowance || 0) + 
                       (this.transportAllowance || 0) + 
                       (this.otherAllowance || 0) + 
                       (this.kodbrandIntegrityAward || 0);
  
  this.totalDeductions = (this.advanceSalary || 0) + 
                         (this.providentFund || 0) + 
                         (this.professionalTax || 0) + 
                         (this.incomeTax || 0) + 
                         (this.unpaidLeaveDeduction || 0) + 
                         (this.otherDeductions || 0);
  
  this.netPay = this.totalEarnings - this.totalDeductions;
  this.daysOnLeave = (this.workingDays || 26) - (this.daysWorked || 0);
  
  next();
});

const EmployeeSalary = mongoose.model('EmployeeSalary', employeeSalarySchema);
export default EmployeeSalary;
