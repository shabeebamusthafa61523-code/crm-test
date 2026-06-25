import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  expenseType: { type: String, enum: ['Operational', 'Other'], required: true },
  expenseName: { type: String, required: true, trim: true },
  expenseDate: { type: Date, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, // Nullable for salary expenses
  vendorName: { type: String },
  gstNumber: { type: String },
  invoiceNumber: { type: String },
  category: { 
    type: String, 
    enum: ['Office Expense', 'Marketing', 'Travel', 'Utility Bills', 'Maintenance', 'Rent', 'Fuel', 'Software Subscription', 'Miscellaneous', 'Employee Salary'],
    required: true 
  },
  amount: { type: Number, required: true, min: 0.01 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number }, // Auto-calculated
  description: { type: String },
  attachmentUrl: { type: String },
  attachmentPublicId: { type: String },
  paymentMethod: { type: String, enum: ['Bank Transfer', 'Card', 'Cheque', 'Cash'], required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Paid', 'Rejected'], default: 'Pending' },
  deleted: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

expenseSchema.index({ expenseName: 'text', vendorName: 'text', invoiceNumber: 'text' });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ status: 1 });

expenseSchema.pre('save', function (next) {
  this.totalAmount = Number((this.amount + (this.taxAmount || 0)).toFixed(2));
  if (typeof next === 'function') next();
});

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
