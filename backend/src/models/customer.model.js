import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  companyName: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  gstNumber: { type: String, trim: true },
  address: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

customerSchema.index({ name: 'text', companyName: 'text', email: 'text' });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
