import EmployeeSalary from '../models/employeeSalary.model.js';
import User from '../models/user.model.js';
import { sendSuccess, sendError } from '../utils/response.helper.js';
import { recordAudit } from '../middleware/audit.middleware.js';
import { generateSalarySlipPDFBuffer } from '../services/pdfService.js';
import { sendMailWithAttachments } from '../services/emailService.js';
import mongoose from 'mongoose';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Helper to map legacy output schema fields for old API endpoints
 */
const mapToLegacyDoc = (s) => {
  if (!s) return null;
  const doc = s.toObject ? s.toObject() : { ...s };
  doc.hra = doc.houseRentAllowance || 0;
  doc.travelAllowance = doc.transportAllowance || 0;
  doc.integrityAward = doc.kodbrandIntegrityAward || 0;
  doc.pf = doc.providentFund || 0;
  doc.unpaidLeave = doc.unpaidLeaveDeduction || 0;
  doc.netSalary = doc.netPay || 0;
  doc.salaryMonth = new Date(doc.year, doc.month - 1, 1);
  return doc;
};

export const getSalaries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const query = {};

    const currentUserRole = String(req.user?.role_id || req.user?.role || '').toLowerCase().trim();
    const isPrivileged = ['1', '2', 'hr', 'admin'].includes(currentUserRole);

    if (!isPrivileged) {
      query.employeeId = req.user.id;
      query.status = 'Published';
    } else if (req.query.employeeId) {
      query.employeeId = req.query.employeeId;
    }

    if (req.query.status) {
      // Map legacy statuses
      let s = req.query.status;
      if (s === 'Submitted' || s === 'Approved' || s === 'Paid') {
        query.status = 'Published';
      } else {
        query.status = s;
      }
    }

    if (req.query.salaryMonth) {
      const monthDate = new Date(req.query.salaryMonth);
      query.month = monthDate.getMonth() + 1;
      query.year = monthDate.getFullYear();
    }

    const rawSalaries = await EmployeeSalary.find(query)
      .populate('employeeId', 'name employeeId email designation department designationId departmentId')
      .populate('submittedBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const salaries = rawSalaries.map(mapToLegacyDoc);
    const total = await EmployeeSalary.countDocuments(query);

    return sendSuccess(res, 'Salaries retrieved successfully', {
      salaries,
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

export const getSalaryById = async (req, res) => {
  try {
    const salary = await EmployeeSalary.findById(req.params.id)
      .populate('employeeId', 'name employeeId email designation department designationId departmentId joining_date address identityType identityNumber')
      .populate('submittedBy', 'name')
      .populate('approvedBy', 'name');

    if (!salary) {
      return sendError(res, 'Salary record not found', 404);
    }

    const currentUserRole = String(req.user?.role_id || req.user?.role || '').toLowerCase().trim();
    const isPrivileged = ['1', '2', 'hr', 'admin'].includes(currentUserRole);
    if (!isPrivileged && String(salary.employeeId._id) !== String(req.user.id)) {
      return sendError(res, 'Access denied. You can only view your own salary slips.', 403);
    }

    return sendSuccess(res, 'Salary record retrieved successfully', mapToLegacyDoc(salary));
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createSalary = async (req, res) => {
  try {
    const data = { ...req.body };
    data.createdBy = req.user.id;

    if (data.salaryMonth) {
      const monthDate = new Date(data.salaryMonth);
      data.month = monthDate.getMonth() + 1;
      data.year = monthDate.getFullYear();
    }

    // Map legacy inputs to new fields
    if (data.hra !== undefined) data.houseRentAllowance = data.hra;
    if (data.travelAllowance !== undefined) data.transportAllowance = data.travelAllowance;
    if (data.integrityAward !== undefined) data.kodbrandIntegrityAward = data.integrityAward;
    if (data.pf !== undefined) data.providentFund = data.pf;
    if (data.unpaidLeave !== undefined) data.unpaidLeaveDeduction = data.unpaidLeave;

    const existing = await EmployeeSalary.findOne({
      employeeId: data.employeeId,
      month: data.month,
      year: data.year
    });

    if (existing) {
      return sendError(res, 'A salary worksheet already exists for this employee in the specified month.', 400);
    }

    // Generate unique salarySlipNumber
    const monthStr = String(data.month).padStart(2, '0');
    const yearStr = String(data.year);
    const prefix = `KOD-SAL-${monthStr}${yearStr}`;
    const count = await EmployeeSalary.countDocuments({ month: data.month, year: data.year });
    let seq = count + 1;
    let salarySlipNumber = `${prefix}-${String(seq).padStart(3, '0')}`;
    while (await EmployeeSalary.exists({ salarySlipNumber })) {
      seq++;
      salarySlipNumber = `${prefix}-${String(seq).padStart(3, '0')}`;
    }
    data.salarySlipNumber = salarySlipNumber;

    const salary = await EmployeeSalary.create(data);

    await recordAudit(req, {
      action: 'CREATE',
      entity: 'EmployeeSalary',
      entityId: salary._id,
      newValue: salary
    });

    return sendSuccess(res, 'Salary worksheet created successfully', mapToLegacyDoc(salary), 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateSalary = async (req, res) => {
  try {
    const oldValue = await EmployeeSalary.findById(req.params.id);
    if (!oldValue) {
      return sendError(res, 'Salary record not found', 404);
    }

    if (oldValue.status === 'Published') {
      return sendError(res, 'Cannot edit a salary sheet that has already been published', 400);
    }

    const data = { ...req.body };
    if (data.salaryMonth) {
      const monthDate = new Date(data.salaryMonth);
      data.month = monthDate.getMonth() + 1;
      data.year = monthDate.getFullYear();
    }

    // Map legacy inputs to new fields
    if (data.hra !== undefined) data.houseRentAllowance = data.hra;
    if (data.travelAllowance !== undefined) data.transportAllowance = data.travelAllowance;
    if (data.integrityAward !== undefined) data.kodbrandIntegrityAward = data.integrityAward;
    if (data.pf !== undefined) data.providentFund = data.pf;
    if (data.unpaidLeave !== undefined) data.unpaidLeaveDeduction = data.unpaidLeave;

    const salary = await EmployeeSalary.findById(req.params.id);
    Object.assign(salary, data);
    await salary.save();

    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'EmployeeSalary',
      entityId: salary._id,
      oldValue,
      newValue: salary
    });

    return sendSuccess(res, 'Salary sheet updated successfully', mapToLegacyDoc(salary));
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateSalaryWorkflow = async (req, res) => {
  try {
    const { status } = req.body;
    const salaryId = req.params.id;

    const salary = await EmployeeSalary.findById(salaryId);
    if (!salary) {
      return sendError(res, 'Salary record not found', 404);
    }

    if (salary.status === 'Published') {
      return sendError(res, 'This salary sheet is locked because it is already marked as Published.', 400);
    }

    // Map legacy Paid/Disbursed to Published
    if (status === 'Submitted' || status === 'Approved' || status === 'Paid') {
      salary.status = 'Published';
      salary.publishedDate = new Date();
      salary.approvedBy = req.user.id;
      salary.approvalDate = new Date();
    } else {
      salary.status = status;
    }

    await salary.save();

    return sendSuccess(res, 'Salary workflow updated successfully', mapToLegacyDoc(salary));
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const downloadSalarySlip = async (req, res) => {
  try {
    const salary = await EmployeeSalary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    const employee = await User.findById(salary.employeeId).populate('designationId');
    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee not found' });
    }

    const docEmployee = {
      name: employee.name,
      employeeId: employee.employeeId || 'N/A',
      email: employee.email,
      department: employee.department || 'N/A',
      designation: employee.designationId?.name || employee.designation || 'Staff'
    };

    const pdfBuffer = await generateSalarySlipPDFBuffer(salary, docEmployee);
    const monthName = MONTHS[salary.month - 1];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SalarySlip_${monthName.replace(/\s+/g, '_')}_${salary.year}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const emailSalarySlip = async (req, res) => {
  try {
    const salary = await EmployeeSalary.findById(req.params.id);
    if (!salary) {
      return sendError(res, 'Salary record not found', 404);
    }

    const employee = await User.findById(salary.employeeId).populate('designationId');
    if (!employee) {
      return sendError(res, 'Employee not found', 400);
    }

    const docEmployee = {
      name: employee.name,
      employeeId: employee.employeeId || 'N/A',
      email: employee.email,
      department: employee.department || 'N/A',
      designation: employee.designationId?.name || employee.designation || 'Staff'
    };

    const pdfBuffer = await generateSalarySlipPDFBuffer(salary, docEmployee);
    const monthName = MONTHS[salary.month - 1];
    const subject = `Your ${monthName} ${salary.year} Salary Slip | KOD.brand Solutions`;

    const html = `
      <p>Dear ${employee.name},</p>
      <p>Please find attached your salary slip for the month of <strong>${monthName} ${salary.year}</strong>.</p>
      <p><strong>Gross Earnings:</strong> ₹${(salary.totalEarnings || 0).toLocaleString('en-IN')}</p>
      <p><strong>Total Deductions:</strong> ₹${(salary.totalDeductions || 0).toLocaleString('en-IN')}</p>
      <p><strong>Net Pay (In-hand):</strong> <span style="color: #4DB848; font-weight: bold;">₹${(salary.netPay || 0).toLocaleString('en-IN')}</span></p>
      <p>You can also view this slip in your employee portal.</p>
      <p>If you have any questions, please contact the HR department.</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>HR Manager</strong><br/>KOD.brand Solutions</p>
    `;

    await sendMailWithAttachments({
      to: employee.email,
      subject,
      html,
      attachments: [{
        filename: `SalarySlip_${monthName.replace(/\s+/g, '_')}_${salary.year}.pdf`,
        content: pdfBuffer
      }]
    });

    salary.emailSentTo = employee.email;
    salary.emailSentDate = new Date();
    await salary.save();

    return sendSuccess(res, 'Salary slip email dispatched successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const batchGenerateDrafts = async (req, res) => {
  try {
    const { salaryMonth } = req.body;
    if (!salaryMonth) {
      return sendError(res, 'salaryMonth is required', 400);
    }

    const monthDate = new Date(salaryMonth);
    const month = monthDate.getMonth() + 1;
    const year = monthDate.getFullYear();

    const activeEmployees = await User.find({ isActive: true, status: 'active', role: 'employee' });

    let draftsCreated = 0;
    for (const emp of activeEmployees) {
      const existing = await EmployeeSalary.findOne({ employeeId: emp._id, month, year });
      if (!existing) {
        const monthStr = String(month).padStart(2, '0');
        const yearStr = String(year);
        const prefix = `KOD-SAL-${monthStr}${yearStr}`;
        const count = await EmployeeSalary.countDocuments({ month, year });
        let seq = count + 1;
        let salarySlipNumber = `${prefix}-${String(seq).padStart(3, '0')}`;
        while (await EmployeeSalary.exists({ salarySlipNumber })) {
          seq++;
          salarySlipNumber = `${prefix}-${String(seq).padStart(3, '0')}`;
        }

        await EmployeeSalary.create({
          employeeId: emp._id,
          month,
          year,
          basicSalary: emp.salary || 15000,
          daysWorked: 26,
          workingDays: 26,
          salarySlipNumber,
          createdBy: req.user.id
        });
        draftsCreated++;
      }
    }

    return sendSuccess(res, `${draftsCreated} salary drafts generated successfully`);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getMonthlySalaryReport = async (req, res) => {
  try {
    const { salaryMonth } = req.query;
    if (!salaryMonth) {
      return sendError(res, 'salaryMonth query parameter is required', 400);
    }

    const monthDate = new Date(salaryMonth);
    const month = monthDate.getMonth() + 1;
    const year = monthDate.getFullYear();

    const rawSalaries = await EmployeeSalary.find({ month, year })
      .populate('employeeId', 'name employeeId department designation');

    const salaries = rawSalaries.map(mapToLegacyDoc);

    let totalEarnings = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    salaries.forEach(s => {
      totalEarnings += s.totalEarnings || 0;
      totalDeductions += s.totalDeductions || 0;
      totalNet += s.netSalary || 0;
    });

    return sendSuccess(res, 'Monthly report generated', {
      month: monthDate,
      totals: {
        totalEarnings,
        totalDeductions,
        totalNet,
        count: salaries.length
      },
      records: salaries
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getEmployeeSalaryHistory = async (req, res) => {
  try {
    const employeeId = req.query.employeeId || req.user.id;
    
    const currentUserRole = String(req.user?.role_id || req.user?.role || '').toLowerCase().trim();
    const isPrivileged = ['1', '2', 'hr', 'admin'].includes(currentUserRole);
    if (!isPrivileged && String(employeeId) !== String(req.user.id)) {
      return sendError(res, 'Access denied. You can only check your own salary progression history.', 403);
    }

    const rawHistory = await EmployeeSalary.find({
      employeeId,
      status: 'Published'
    }).sort({ year: 1, month: 1 });

    const history = rawHistory.map(mapToLegacyDoc);

    return sendSuccess(res, 'Salary history retrieved successfully', history);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteSalary = async (req, res) => {
  try {
    const slip = await EmployeeSalary.findById(req.params.id);

    if (!slip) {
      return sendError(res, 'Salary record not found', 404);
    }

    if (slip.status !== 'Draft') {
      return sendError(res, 'Only Draft salary sheets can be deleted', 400);
    }

    await EmployeeSalary.findByIdAndDelete(req.params.id);

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'EmployeeSalary',
      entityId: req.params.id,
      oldValue: slip
    });

    return sendSuccess(res, 'Salary record deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const salaryController = {
  getSalaries,
  getSalaryById,
  createSalary,
  updateSalary,
  updateSalaryWorkflow,
  downloadSalarySlip,
  emailSalarySlip,
  batchGenerateDrafts,
  deleteSalary,
  getMonthlySalaryReport,
  getEmployeeSalaryHistory
};

export default salaryController;
