import EmployeeSalary from '../models/employeeSalary.model.js';
import User from '../models/user.model.js';
import { sendSuccess, sendError } from '../utils/response.helper.js';
import { recordAudit } from '../middleware/audit.middleware.js';
import { generateSalarySlipPDFBuffer } from '../services/pdfService.js';
import { sendMailWithAttachments } from '../services/emailService.js';

// Month names list for email templates & files
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Helper to validate salary slip input fields
 */
const validateSlipInput = (data) => {
  const { month, year, basicSalary, workingDays, daysWorked } = data;

  if (month < 1 || month > 12) {
    return 'Month must be between 1 and 12';
  }

  if (basicSalary < 0 || basicSalary > 500000) {
    return 'Basic Salary must be between 0 and 500,000';
  }

  const wDays = workingDays !== undefined ? workingDays : 26;
  if (daysWorked < 0 || daysWorked > wDays) {
    return `Days Worked cannot exceed Working Days (${wDays})`;
  }

  // Numeric fields must be non-negative
  const checkFields = [
    'basicSalary', 'houseRentAllowance', 'specialAllowance', 'transportAllowance', 
    'otherAllowance', 'kodbrandIntegrityAward', 'advanceSalary', 'providentFund', 
    'professionalTax', 'incomeTax', 'unpaidLeaveDeduction', 'otherDeductions'
  ];

  for (const field of checkFields) {
    if (data[field] !== undefined && data[field] < 0) {
      return `${field.replace(/([A-Z])/g, ' $1')} cannot be negative`;
    }
  }

  // Future date validation
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    return 'Cannot generate salary slips for future months';
  }

  return null;
};

/**
 * Helper to check if user has privileged access (Admin/HR or Accountant designation)
 */
const checkIsPrivileged = async (user) => {
  if (!user) return false;
  const role = String(user.role_id || user.role || '').toLowerCase().trim();
  if (['1', '2', 'hr', 'admin'].includes(role)) {
    return true;
  }
  if (user.id) {
    const dbUser = await User.findById(user.id);
    if (dbUser) {
      const designationIdStr = String(dbUser.designationId || dbUser.designation_id || '').trim();
      // HR Manager or Accountant designations are privileged
      if (['1', '6a2f8efea2fe388770a38987', '6a2f915e2df21dc234018cac'].includes(designationIdStr)) {
        return true;
      }
    }
  }
  return false;
};


/**
 * 1. Create a new salary slip
 */
export const createSalarySlip = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;

    if (!employeeId || !month || !year) {
      return sendError(res, 'Employee, Month, Year, Basic Salary, and Days Worked are required fields', 400);
    }

    const validationErr = validateSlipInput(req.body);
    if (validationErr) {
      return sendError(res, validationErr, 400);
    }

    // Check duplicate: one slip per employee per month/year
    const existing = await EmployeeSalary.findOne({ employeeId, month, year });
    if (existing) {
      return sendError(res, 'A salary slip already exists for this employee for the specified month and year.', 400);
    }

    // Generate unique salarySlipNumber
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

    const data = {
      ...req.body,
      salarySlipNumber,
      createdBy: req.user.id,
      status: 'Draft'
    };

    const slip = await EmployeeSalary.create(data);
    const populated = await EmployeeSalary.findById(slip._id)
      .populate({
        path: 'employeeId',
        populate: { path: 'designationId' }
      });

    await recordAudit(req, {
      action: 'CREATE',
      entity: 'EmployeeSalary',
      entityId: slip._id,
      newValue: populated
    });

    return sendSuccess(res, 'Salary slip created successfully as Draft', populated, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * 2. Fetch all salary slips (with filters: search, department, month, year, status, page, limit)
 */
export const getSalarySlips = async (req, res) => {
  try {
    const filter = {};
    const { month, year, status, department, search } = req.query;

    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (status) filter.status = status;

    // Strict row-level security: standard employees only see their own records
    const isPrivileged = await checkIsPrivileged(req.user);

    if (!isPrivileged) {
      filter.employeeId = req.user.id;
      filter.status = 'Published'; // Employees should only see their Published slips!
    } else {
      // HR/Admin/Accountant can filter by specific employee
      if (req.query.employeeId) {
        filter.employeeId = req.query.employeeId;
      }
    }

    if (search || department) {
      const userFilter = {};
      if (search) {
        userFilter.$or = [
          { name: new RegExp(search, 'i') },
          { employeeId: new RegExp(search, 'i') }
        ];
      }
      if (department) {
        userFilter.department = department;
      }
      const users = await User.find(userFilter).select('_id');
      filter.employeeId = { $in: users.map(u => u._id) };
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const total = await EmployeeSalary.countDocuments(filter);
    const slips = await EmployeeSalary.find(filter)
      .populate({
        path: 'employeeId',
        populate: { path: 'designationId' }
      })
      .sort({ year: -1, month: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return sendSuccess(res, 'Salary slips retrieved successfully', {
      slips,
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

/**
 * 3. Fetch single slip
 */
export const getSalarySlipById = async (req, res) => {
  try {
    const slip = await EmployeeSalary.findById(req.params.id)
      .populate({
        path: 'employeeId',
        populate: { path: 'designationId' }
      });

    if (!slip) {
      return sendError(res, 'Salary slip not found', 404);
    }

    // Role-based row check
    const isPrivileged = await checkIsPrivileged(req.user);

    if (!isPrivileged && String(slip.employeeId._id) !== String(req.user.id)) {
      return sendError(res, 'Access denied. You can only view your own salary slips.', 403);
    }

    return sendSuccess(res, 'Salary slip retrieved successfully', slip);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * 4. Update salary slip (only if Draft)
 */
export const updateSalarySlip = async (req, res) => {
  try {
    const slip = await EmployeeSalary.findById(req.params.id);

    if (!slip) {
      return sendError(res, 'Salary slip not found', 404);
    }

    if (slip.status !== 'Draft') {
      return sendError(res, 'Only Draft salary slips can be edited', 400);
    }

    const validationErr = validateSlipInput(req.body);
    if (validationErr) {
      return sendError(res, validationErr, 400);
    }

    const oldValue = await EmployeeSalary.findById(req.params.id)
      .populate({
        path: 'employeeId',
        populate: { path: 'designationId' }
      });

    // Update keys
    const updatableFields = [
      'workingDays', 'daysWorked', 'basicSalary', 'houseRentAllowance', 'specialAllowance', 
      'transportAllowance', 'otherAllowance', 'kodbrandIntegrityAward', 'advanceSalary', 
      'providentFund', 'professionalTax', 'incomeTax', 'unpaidLeaveDeduction', 
      'otherDeductions', 'remarks', 'location'
    ];

    for (const key of updatableFields) {
      if (req.body[key] !== undefined) {
        slip[key] = req.body[key];
      }
    }

    await slip.save();

    const populated = await EmployeeSalary.findById(slip._id)
      .populate({
        path: 'employeeId',
        populate: { path: 'designationId' }
      });

    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'EmployeeSalary',
      entityId: slip._id,
      oldValue,
      newValue: populated
    });

    return sendSuccess(res, 'Salary slip updated successfully', populated);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * 5. Change status from Draft -> Published & Trigger Email
 */
export const publishSalarySlip = async (req, res) => {
  try {
    const slip = await EmployeeSalary.findById(req.params.id);

    if (!slip) {
      return sendError(res, 'Salary slip not found', 404);
    }

    if (slip.status === 'Published') {
      return sendError(res, 'Salary slip is already published', 400);
    }

    slip.status = 'Published';
    slip.publishedDate = new Date();
    slip.approvedBy = req.user.id;
    slip.approvalDate = new Date();

    await slip.save();

    // Fetch employee details for email
    const employee = await User.findById(slip.employeeId).populate('designationId');
    if (!employee) {
      return sendError(res, 'Employee not found for this slip', 400);
    }

    // Prepare PDF buffer
    let pdfBuffer;
    try {
      const docEmployee = {
        name: employee.name,
        employeeId: employee.employeeId || 'N/A',
        email: employee.email,
        department: employee.department || 'N/A',
        designation: employee.designationId?.name || employee.designation || 'Staff'
      };
      pdfBuffer = await generateSalarySlipPDFBuffer(slip, docEmployee);
    } catch (pdfErr) {
      console.error('Failed to generate PDF during publishing:', pdfErr.message);
    }

    // Trigger email if PDF is generated successfully and email exists
    if (pdfBuffer && employee.email) {
      try {
        const monthName = MONTHS[slip.month - 1];
        const subject = `Your ${monthName} ${slip.year} Salary Slip | KOD.brand Solutions`;
        
        const html = `
          <p>Dear ${employee.name},</p>
          <p>Please find attached your salary slip for the month of <strong>${monthName} ${slip.year}</strong>.</p>
          <p><strong>Gross Earnings:</strong> ₹${(slip.totalEarnings || 0).toLocaleString('en-IN')}</p>
          <p><strong>Total Deductions:</strong> ₹${(slip.totalDeductions || 0).toLocaleString('en-IN')}</p>
          <p><strong>Net Pay (In-hand):</strong> <span style="color: #4DB848; font-weight: bold;">₹${(slip.netPay || 0).toLocaleString('en-IN')}</span></p>
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
            filename: `SalarySlip_${monthName.replace(/\s+/g, '_')}_${slip.year}.pdf`,
            content: pdfBuffer
          }]
        });

        slip.emailSentTo = employee.email;
        slip.emailSentDate = new Date();
        await slip.save();
      } catch (mailErr) {
        console.error('Email dispatch failed during publishing:', mailErr.message);
      }
    }

    const populated = await EmployeeSalary.findById(slip._id)
      .populate({
        path: 'employeeId',
        populate: { path: 'designationId' }
      });

    return sendSuccess(res, 'Salary slip published and email sent to employee', populated);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * 6. Send slip PDF to employee email manually
 */
export const emailSalarySlip = async (req, res) => {
  try {
    const slip = await EmployeeSalary.findById(req.params.id);

    if (!slip) {
      return sendError(res, 'Salary slip not found', 404);
    }

    const employee = await User.findById(slip.employeeId).populate('designationId');
    if (!employee) {
      return sendError(res, 'Employee not found for this slip', 400);
    }

    const docEmployee = {
      name: employee.name,
      employeeId: employee.employeeId || 'N/A',
      email: employee.email,
      department: employee.department || 'N/A',
      designation: employee.designationId?.name || employee.designation || 'Staff'
    };

    const pdfBuffer = await generateSalarySlipPDFBuffer(slip, docEmployee);
    const monthName = MONTHS[slip.month - 1];
    const subject = `Your ${monthName} ${slip.year} Salary Slip | KOD.brand Solutions`;

    const html = `
      <p>Dear ${employee.name},</p>
      <p>Please find attached your salary slip for the month of <strong>${monthName} ${slip.year}</strong>.</p>
      <p><strong>Gross Earnings:</strong> ₹${(slip.totalEarnings || 0).toLocaleString('en-IN')}</p>
      <p><strong>Total Deductions:</strong> ₹${(slip.totalDeductions || 0).toLocaleString('en-IN')}</p>
      <p><strong>Net Pay (In-hand):</strong> <span style="color: #4DB848; font-weight: bold;">₹${(slip.netPay || 0).toLocaleString('en-IN')}</span></p>
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
        filename: `SalarySlip_${monthName.replace(/\s+/g, '_')}_${slip.year}.pdf`,
        content: pdfBuffer
      }]
    });

    slip.emailSentTo = employee.email;
    slip.emailSentDate = new Date();
    await slip.save();

    return sendSuccess(res, 'Salary slip email dispatched successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * 7. Download PDF slip in KOD.brand format
 */
export const downloadSalarySlipPDF = async (req, res) => {
  try {
    const slip = await EmployeeSalary.findById(req.params.id);

    if (!slip) {
      return res.status(404).json({ success: false, message: 'Salary slip not found' });
    }

    const employee = await User.findById(slip.employeeId).populate('designationId');
    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee not found for this slip' });
    }

    // Role check: employee can only download their own slip and only if it is Published
    const isPrivileged = await checkIsPrivileged(req.user);

    if (!isPrivileged) {
      if (String(slip.employeeId) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only download your own slips.' });
      }
      if (slip.status !== 'Published') {
        return res.status(403).json({ success: false, message: 'Access denied. Slip is not published yet.' });
      }
    }

    const docEmployee = {
      name: employee.name,
      employeeId: employee.employeeId || 'N/A',
      email: employee.email,
      department: employee.department || 'N/A',
      designation: employee.designationId?.name || employee.designation || 'Staff'
    };

    const pdfBuffer = await generateSalarySlipPDFBuffer(slip, docEmployee);
    const monthName = MONTHS[slip.month - 1];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SalarySlip_${monthName.replace(/\s+/g, '_')}_${slip.year}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Delete salary slip (only if Draft)
 */
export const deleteSalarySlip = async (req, res) => {
  try {
    const slip = await EmployeeSalary.findById(req.params.id);

    if (!slip) {
      return sendError(res, 'Salary slip not found', 404);
    }

    if (slip.status !== 'Draft') {
      return sendError(res, 'Only Draft salary slips can be deleted', 400);
    }

    await EmployeeSalary.findByIdAndDelete(req.params.id);

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'EmployeeSalary',
      entityId: req.params.id,
      oldValue: slip
    });

    return sendSuccess(res, 'Salary slip deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
