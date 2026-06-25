import mongoose from 'mongoose';

const incomeSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
  invoiceNumber: { type: String, unique: true, required: true },
  gstNumber: { type: String },
  paymentMethod: { type: String, enum: ['Bank Transfer', 'Card', 'Cheque', 'Cash', 'Digital Wallet'], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  description: { type: String },
  attachmentUrl: { type: String },
  attachmentPublicId: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'Pending', 'Disputed'], default: 'Active' },
  deleted: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

incomeSchema.index({ customerName: 'text', invoiceNumber: 'text', description: 'text' });
incomeSchema.index({ date: -1 });
incomeSchema.index({ status: 1 });

const Income = mongoose.model('Income', incomeSchema);
export default Income;
