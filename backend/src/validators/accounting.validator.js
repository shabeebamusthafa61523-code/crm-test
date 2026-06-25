import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = (fieldName) =>
  z.string().regex(objectIdRegex, { message: `Invalid format for ${fieldName}` });

// --- CUSTOMER VALIDATION ---
export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  companyName: z.string().trim().optional().nullable(),
  email: z.string().trim().email('Invalid email format').optional().or(z.literal('')).nullable(),
  phone: z.string().trim().optional().nullable(),
  gstNumber: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active')
});

export const updateCustomerSchema = createCustomerSchema.partial();

// --- VENDOR VALIDATION ---
export const createVendorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  companyName: z.string().trim().optional().nullable(),
  email: z.string().trim().email('Invalid email format').optional().or(z.literal('')).nullable(),
  phone: z.string().trim().optional().nullable(),
  gstNumber: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active')
});

export const updateVendorSchema = createVendorSchema.partial();

// --- INCOME VALIDATION ---
export const createIncomeSchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')),
  customerId: objectIdSchema('customerId'),
  customerName: z.string().trim().min(1, 'Customer name is required'),
  invoiceNumber: z.string().trim().min(1, 'Invoice number is required'),
  gstNumber: z.string().trim().optional().nullable(),
  paymentMethod: z.enum(['Bank Transfer', 'Card', 'Cheque', 'Cash', 'Digital Wallet']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().trim().optional().nullable(),
  attachmentUrl: z.string().trim().url('Invalid attachment URL').optional().or(z.literal('')).nullable(),
  attachmentPublicId: z.string().trim().optional().nullable(),
  status: z.enum(['Active', 'Inactive', 'Pending', 'Disputed']).default('Active')
});

export const updateIncomeSchema = createIncomeSchema.partial();

// --- EXPENSE VALIDATION ---
export const createExpenseSchema = z.object({
  expenseType: z.enum(['Operational', 'Other']),
  expenseName: z.string().trim().min(1, 'Expense name is required'),
  expenseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')),
  vendorId: objectIdSchema('vendorId').optional().or(z.literal('')).nullable(),
  vendorName: z.string().trim().optional().or(z.literal('')).nullable(),
  gstNumber: z.string().trim().optional().nullable(),
  invoiceNumber: z.string().trim().optional().or(z.literal('')).nullable(),
  category: z.enum([
    'Office Expense',
    'Marketing',
    'Travel',
    'Utility Bills',
    'Maintenance',
    'Rent',
    'Fuel',
    'Software Subscription',
    'Miscellaneous',
    'Employee Salary'
  ]),
  amount: z.number().positive('Amount must be positive'),
  taxAmount: z.number().min(0, 'Tax amount must be non-negative').default(0),
  description: z.string().trim().optional().nullable(),
  attachmentUrl: z.string().trim().url('Invalid attachment URL').optional().or(z.literal('')).nullable(),
  attachmentPublicId: z.string().trim().optional().nullable(),
  paymentMethod: z.enum(['Bank Transfer', 'Card', 'Cheque', 'Cash']),
  status: z.enum(['Pending', 'Approved', 'Paid', 'Rejected']).default('Pending')
});

export const updateExpenseSchema = createExpenseSchema.partial();

// --- PURCHASE VALIDATION ---
const purchaseLineItemInputSchema = z.object({
  productName: z.string().trim().min(1, 'Product name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  taxAmount: z.number().min(0, 'Tax amount must be non-negative').default(0)
});

export const createPurchaseSchema = z.object({
  purchaseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')),
  vendorId: objectIdSchema('vendorId'),
  vendorName: z.string().trim().min(1, 'Vendor name is required'),
  gstNumber: z.string().trim().optional().nullable(),
  invoiceNumber: z.string().trim().min(1, 'Invoice number is required'),
  items: z.array(purchaseLineItemInputSchema).min(1, 'Purchase must have at least 1 item'),
  description: z.string().trim().optional().nullable(),
  attachmentUrl: z.string().trim().url('Invalid attachment URL').optional().or(z.literal('')).nullable(),
  attachmentPublicId: z.string().trim().optional().nullable(),
  status: z.enum(['Draft', 'Confirmed', 'Received', 'Invoiced', 'Paid']).default('Draft')
});

export const updatePurchaseSchema = createPurchaseSchema.partial();

// --- INVOICE VALIDATION ---
const invoiceLineItemInputSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  taxAmount: z.number().min(0, 'Tax amount must be non-negative').default(0)
});

export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1, 'Invoice number is required'),
  customerId: objectIdSchema('customerId'),
  customerName: z.string().trim().min(1, 'Customer name is required'),
  gstNumber: z.string().trim().optional().nullable(),
  invoiceDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')),
  items: z.array(invoiceLineItemInputSchema).min(1, 'Invoice must have at least 1 item'),
  status: z.enum(['Draft', 'Pending', 'Paid', 'Overdue', 'Cancelled']).default('Draft'),
  notes: z.string().trim().optional().nullable()
});

export const updateInvoiceSchema = createInvoiceSchema.partial();
