import Invoice from '../models/invoice.model.js';
import Customer from '../models/customer.model.js';
import { sendSuccess, sendError } from '../utils/response.helper.js';
import { recordAudit } from '../middleware/audit.middleware.js';
import { generateInvoicePDFBuffer } from '../services/pdfService.js';
import { sendMailWithAttachments } from '../services/emailService.js';

export const getInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const query = { deleted: { $ne: true } };

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.customerId) {
      query.customerId = req.query.customerId;
    }
    if (req.query.startDate && req.query.endDate) {
      query.invoiceDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'name companyName email phone gstNumber address')
      .populate('createdBy', 'name')
      .sort({ invoiceDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Invoice.countDocuments(query);

    return sendSuccess(res, 'Invoices retrieved successfully', {
      invoices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, deleted: { $ne: true } })
      .populate('customerId', 'name companyName email phone gstNumber address')
      .populate('createdBy', 'name');

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }
    return sendSuccess(res, 'Invoice retrieved successfully', invoice);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createInvoice = async (req, res) => {
  try {
    const data = { ...req.body };
    data.createdBy = req.user.id;

    if (data.invoiceDate) data.invoiceDate = new Date(data.invoiceDate);
    if (data.dueDate) data.dueDate = new Date(data.dueDate);

    if (typeof data.items === 'string') {
      data.items = JSON.parse(data.items);
    }

    const invoice = await Invoice.create(data);

    await recordAudit(req, {
      action: 'CREATE',
      entity: 'Invoice',
      entityId: invoice._id,
      newValue: invoice
    });

    return sendSuccess(res, 'Invoice created successfully', invoice, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const oldValue = await Invoice.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!oldValue) {
      return sendError(res, 'Invoice not found', 404);
    }

    const data = { ...req.body };
    if (data.invoiceDate) data.invoiceDate = new Date(data.invoiceDate);
    if (data.dueDate) data.dueDate = new Date(data.dueDate);

    if (typeof data.items === 'string') {
      data.items = JSON.parse(data.items);
    }

    const invoice = await Invoice.findById(req.params.id);
    Object.assign(invoice, data);
    await invoice.save();

    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'Invoice',
      entityId: invoice._id,
      oldValue,
      newValue: invoice
    });

    return sendSuccess(res, 'Invoice updated successfully', invoice);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    // Soft delete
    invoice.deleted = true;
    invoice.status = 'Cancelled';
    await invoice.save();

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'Invoice',
      entityId: invoice._id,
      oldValue: invoice
    });

    return sendSuccess(res, 'Invoice deleted successfully', invoice);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateInvoiceStatus = async (req, res) => {
  try {
    const oldValue = await Invoice.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!oldValue) {
      return sendError(res, 'Invoice not found', 404);
    }

    const { status, paymentDate, paymentReference } = req.body;
    if (!['Draft', 'Pending', 'Paid', 'Overdue', 'Cancelled'].includes(status)) {
      return sendError(res, 'Invalid invoice status', 400);
    }

    const updateData = { status };
    if (status === 'Paid') {
      updateData.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      updateData.paymentReference = paymentReference || '';
    }

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, { new: true });

    await recordAudit(req, {
      action: 'UPDATE_STATUS',
      entity: 'Invoice',
      entityId: invoice._id,
      oldValue,
      newValue: invoice
    });

    return sendSuccess(res, `Invoice status updated to ${status} successfully`, invoice);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const downloadInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    const customer = await Customer.findById(invoice.customerId);
    if (!customer) {
      return sendError(res, 'Customer associated with this invoice was not found', 404);
    }

    const pdfBuffer = await generateInvoicePDFBuffer(invoice, customer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`);
    return res.end(pdfBuffer);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const sendInvoiceEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    const customer = await Customer.findById(invoice.customerId);
    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    if (!customer.email) {
      return sendError(res, 'Customer email is not registered, cannot dispatch invoice', 400);
    }

    const pdfBuffer = await generateInvoicePDFBuffer(invoice, customer);

    const emailBody = `
      <h3>Hello ${customer.name},</h3>
      <p>Please find attached Invoice <b>#${invoice.invoiceNumber}</b> issued on ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}.</p>
      <p><b>Total Amount Due:</b> ₹${Number(invoice.grandTotal).toFixed(2)}<br/>
      <b>Due Date:</b> ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>
      <p>Thank you for your business!</p>
      <hr/>
      <small>KOD.brand Invoicing System</small>
    `;

    await sendMailWithAttachments({
      to: customer.email,
      subject: `Invoice #${invoice.invoiceNumber} - KOD.brand`,
      html: emailBody,
      attachments: [{
        filename: `Invoice_${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer
      }]
    });

    invoice.emailSent = true;
    invoice.lastReminder = new Date();
    await invoice.save();

    await recordAudit(req, {
      action: 'EMAIL_DISPATCH',
      entity: 'Invoice',
      entityId: invoice._id,
      newValue: { emailSent: true }
    });

    return sendSuccess(res, 'Invoice dispatched successfully to client email');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getInvoiceMetrics = async (req, res) => {
  try {
    const today = new Date();

    // Fetch all non-cancelled, active invoices
    const invoices = await Invoice.find({ deleted: { $ne: true }, status: { $ne: 'Cancelled' } });

    let totalRevenue = 0;
    let paidRevenue = 0;
    let pendingAmount = 0;

    const aging = {
      days30: { count: 0, amount: 0 },
      days60: { count: 0, amount: 0 },
      days90: { count: 0, amount: 0 },
      days90Plus: { count: 0, amount: 0 }
    };

    invoices.forEach(inv => {
      totalRevenue += inv.grandTotal;

      if (inv.status === 'Paid') {
        paidRevenue += inv.grandTotal;
      } else {
        pendingAmount += inv.grandTotal;

        // Calculate age in days relative to issue date
        const ageMs = today - new Date(inv.invoiceDate);
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

        if (ageDays <= 30) {
          aging.days30.count++;
          aging.days30.amount += inv.grandTotal;
        } else if (ageDays <= 60) {
          aging.days60.count++;
          aging.days60.amount += inv.grandTotal;
        } else if (ageDays <= 90) {
          aging.days90.count++;
          aging.days90.amount += inv.grandTotal;
        } else {
          aging.days90Plus.count++;
          aging.days90Plus.amount += inv.grandTotal;
        }
      }
    });

    // DSO Calculation: (Average Accounts Receivable / Total Revenue) * 365
    // Let's assume period is 365 days
    // If totalRevenue is 0, DSO is 0.
    const averageAR = pendingAmount; // Current Outstanding Accounts Receivable
    const dso = totalRevenue > 0 ? ((averageAR / totalRevenue) * 365).toFixed(1) : 0;

    return sendSuccess(res, 'Invoice metrics computed successfully', {
      totalRevenue,
      paidRevenue,
      pendingAmount,
      dso,
      aging
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const invoiceController = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  downloadInvoicePDF,
  sendInvoiceEmail,
  getInvoiceMetrics
};

export default invoiceController;
