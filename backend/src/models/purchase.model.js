import mongoose from 'mongoose';

const purchaseLineItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.01 },
  unitPrice: { type: Number, required: true, min: 0.01 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number } // Auto-calculated
});

const purchaseSchema = new mongoose.Schema({
  purchaseDate: { type: Date, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  vendorName: { type: String, required: true },
  gstNumber: { type: String },
  invoiceNumber: { type: String, unique: true, required: true },
  items: [purchaseLineItemSchema],
  totalAmount: { type: Number }, // Auto-calculated
  description: { type: String },
  attachmentUrl: { type: String },
  attachmentPublicId: { type: String },
  status: { type: String, enum: ['Draft', 'Confirmed', 'Received', 'Invoiced', 'Paid'], default: 'Draft' },
  deleted: { type: Boolean, default: false },
  receivedDate: { type: Date },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

purchaseSchema.index({ vendorName: 'text', invoiceNumber: 'text' });
purchaseSchema.index({ purchaseDate: -1 });

purchaseSchema.pre('save', function (next) {
  let total = 0;
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.totalAmount = Number(((item.quantity * item.unitPrice) + (item.taxAmount || 0)).toFixed(2));
      total += item.totalAmount;
    });
  }
  this.totalAmount = Number(total.toFixed(2));
  if (typeof next === 'function') next();
});

const Purchase = mongoose.model('Purchase', purchaseSchema);
export default Purchase;
