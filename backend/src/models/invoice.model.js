import mongoose from 'mongoose';

const invoiceLineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.01 },
  unitPrice: { type: Number, required: true, min: 0.01 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number } // Auto-calculated
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
  gstNumber: { type: String },
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  items: [invoiceLineItemSchema],
  amount: { type: Number }, // Auto-calculated pre-tax subtotal
  tax: { type: Number },    // Auto-calculated sum of item taxes
  grandTotal: { type: Number }, // Auto-calculated amount + tax
  status: { type: String, enum: ['Draft', 'Pending', 'Paid', 'Overdue', 'Cancelled'], default: 'Draft' },
  deleted: { type: Boolean, default: false },
  paymentDate: { type: Date },
  paymentReference: { type: String },
  emailSent: { type: Boolean, default: false },
  lastReminder: { type: Date },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

invoiceSchema.index({ invoiceNumber: 'text', customerName: 'text' });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ status: 1 });

invoiceSchema.pre('save', function (next) {
  let subtotal = 0;
  let totalTax = 0;
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      item.totalAmount = Number((itemSubtotal + (item.taxAmount || 0)).toFixed(2));
      subtotal += itemSubtotal;
      totalTax += (item.taxAmount || 0);
    });
  }
  this.amount = Number(subtotal.toFixed(2));
  this.tax = Number(totalTax.toFixed(2));
  this.grandTotal = Number((subtotal + totalTax).toFixed(2));
  if (typeof next === 'function') next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
