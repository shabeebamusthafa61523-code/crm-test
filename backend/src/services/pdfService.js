import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, '../assets/logo3.png');

/**
 * Convert number to Indian currency words
 */
function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
  return str;
}

/**
 * Generates an Invoice PDF buffer
 */
export const generateInvoicePDFBuffer = (invoice, customer) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const primaryColor = '#3c2375';
      const textColor = '#1e293b';
      const labelColor = '#475569';

      const drawHeader = () => {
        try {
          doc.image(logoPath, 40, 30, { height: 32 });
        } catch (err) {
          doc.fillColor('#84cc16').font('Helvetica-Bold').fontSize(22).text('KOD.', 40, 40, { continued: true });
          doc.fillColor(primaryColor).text('brand');
        }

        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(16).text('TAX INVOICE', 300, 40, { align: 'right' });
        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, 75).lineTo(555, 75).stroke();
        doc.y = 90;
      };

      drawHeader();

      // Invoice metadata
      doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(9).text('Invoice Number: ', 40, doc.y, { continued: true });
      doc.fillColor(textColor).font('Helvetica').text(invoice.invoiceNumber);
      doc.fillColor(labelColor).font('Helvetica-Bold').text('Invoice Date: ', 40, doc.y, { continued: true });
      doc.fillColor(textColor).font('Helvetica').text(new Date(invoice.invoiceDate).toLocaleDateString('en-IN'));
      doc.fillColor(labelColor).font('Helvetica-Bold').text('Due Date: ', 40, doc.y, { continued: true });
      doc.fillColor(textColor).font('Helvetica').text(new Date(invoice.dueDate).toLocaleDateString('en-IN'));

      const metaY = doc.y;

      // Customer Details (Column 2)
      doc.fillColor(labelColor).font('Helvetica-Bold').text('Bill To:', 320, 90);
      doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9.5).text(customer.name, 320, 102);
      if (customer.companyName) {
        doc.fillColor(textColor).font('Helvetica').fontSize(8.5).text(customer.companyName, 320, doc.y + 2);
      }
      if (customer.gstNumber) {
        doc.fillColor(labelColor).font('Helvetica-Bold').text('GSTIN: ', { continued: true });
        doc.fillColor(textColor).font('Helvetica').text(customer.gstNumber);
      }
      if (customer.phone) doc.text(`Phone: ${customer.phone}`);
      if (customer.address) doc.text(`Address: ${customer.address}`, { width: 235 });

      doc.y = Math.max(doc.y, metaY) + 20;

      // Draw Items Table Header
      const tableTop = doc.y;
      doc.rect(40, tableTop, 515, 20).fill(primaryColor);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
      doc.text('SI', 45, tableTop + 6, { width: 20 });
      doc.text('Description', 75, tableTop + 6, { width: 220 });
      doc.text('Qty', 305, tableTop + 6, { width: 40, align: 'right' });
      doc.text('Unit Price (₹)', 355, tableTop + 6, { width: 70, align: 'right' });
      doc.text('GST (₹)', 435, tableTop + 6, { width: 50, align: 'right' });
      doc.text('Total (₹)', 495, tableTop + 6, { width: 55, align: 'right' });

      doc.y = tableTop + 20;

      // Table body
      invoice.items.forEach((item, index) => {
        const itemY = doc.y;
        doc.fillColor(textColor).font('Helvetica').fontSize(8.5);
        doc.text(String(index + 1), 45, itemY + 6, { width: 20 });
        doc.text(item.description, 75, itemY + 6, { width: 220 });
        doc.text(Number(item.quantity).toFixed(1), 305, itemY + 6, { width: 40, align: 'right' });
        doc.text(Number(item.unitPrice).toFixed(2), 355, itemY + 6, { width: 70, align: 'right' });
        doc.text(Number(item.taxAmount || 0).toFixed(2), 435, itemY + 6, { width: 50, align: 'right' });
        doc.text(Number(item.totalAmount).toFixed(2), 495, itemY + 6, { width: 55, align: 'right' });

        doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(40, itemY + 22).lineTo(555, itemY + 22).stroke();
        doc.y = itemY + 22;
      });

      doc.y += 10;
      const subtotalY = doc.y;

      // Summary totals on the right
      doc.fillColor(labelColor).font('Helvetica-Bold').text('Subtotal:', 380, subtotalY, { width: 90, align: 'right' });
      doc.fillColor(textColor).font('Helvetica').text(`₹${Number(invoice.amount).toFixed(2)}`, 480, subtotalY, { width: 75, align: 'right' });

      doc.fillColor(labelColor).font('Helvetica-Bold').text('Tax Amount:', 380, subtotalY + 14, { width: 90, align: 'right' });
      doc.fillColor(textColor).font('Helvetica').text(`₹${Number(invoice.tax || 0).toFixed(2)}`, 480, subtotalY + 14, { width: 75, align: 'right' });

      doc.rect(380, subtotalY + 30, 175, 20).fill(primaryColor);
      doc.fillColor('#ffffff').font('Helvetica-Bold').text('Grand Total:', 385, subtotalY + 36);
      doc.text(`₹${Number(invoice.grandTotal).toFixed(2)}`, 480, subtotalY + 36, { width: 70, align: 'right' });

      // Notes
      if (invoice.notes) {
        doc.y = subtotalY + 60;
        doc.fillColor(labelColor).font('Helvetica-Bold').text('Notes & Terms:');
        doc.fillColor(textColor).font('Helvetica').text(invoice.notes, { width: 300 });
      }

      // Add pages info
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#94a3b8').font('Helvetica').fontSize(7.5);
        doc.text(
          `Page ${i + 1} of ${pages.count}  |  KOD.brand Invoicing System © ${new Date().getFullYear()}`,
          40,
          805,
          { align: 'center', width: 515 }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generates a Salary Slip PDF buffer
 */
export const generateSalarySlipPDFBuffer = (salary, employee) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const primaryColor = '#0B1F4B'; // Dark Navy
      const secondaryColor = '#4DB848'; // Brand Green
      const textColor = '#1E293B'; // Dark slate for text
      const labelColor = '#475569';
      const creamColor = '#F5F2E8'; // Background cream for totals

      const getPayPeriodString = (month, year) => {
        const startDay = 1;
        const endDay = new Date(year, month, 0).getDate(); // last day of month
        const date = new Date(year, month - 1, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        return `${monthName} ${startDay} – ${monthName} ${endDay}, ${year}`;
      };

      const payMonthIndex = (salary.month || 1) - 1;
      const payYear = salary.year || new Date().getFullYear();
      const payDateStr = new Date(payYear, payMonthIndex, 1);
      const payPeriod = getPayPeriodString(salary.month || 1, salary.year || 2026);
      const payDate = salary.publishedDate 
        ? new Date(salary.publishedDate).toLocaleDateString('en-IN') 
        : (salary.createdAt ? new Date(salary.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'));

      const drawHeader = () => {
        let logoX = 40;
        let logoY = 30;
        try {
          doc.image(logoPath, logoX, logoY, { height: 28 });
          doc.fillColor(primaryColor).font('Helvetica').fontSize(7.5).text('Digital Marketing Solutions Pvt Ltd', logoX, logoY + 32);
        } catch (err) {
          doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(20).text('KOD.', logoX, logoY, { continued: true });
          doc.fillColor(primaryColor).text('brand');
          doc.fillColor(primaryColor).font('Helvetica').fontSize(7.5).text('Digital Marketing Solutions Pvt Ltd', logoX, logoY + 22);
        }

        // Right side badge
        const badgeWidth = 160;
        const badgeHeight = 50;
        const badgeX = 555 - badgeWidth; // A4 width is 595, margin is 40 on left/right, so right margin is 555.
        const badgeY = 30;
        
        doc.rect(badgeX, badgeY, badgeWidth, badgeHeight).fill(primaryColor);
        
        // Now write text inside the badge
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('PAYSLIP', badgeX, badgeY + 8, { align: 'center', width: badgeWidth });
        doc.fillColor('#FFFFFF').font('Helvetica').fontSize(6.5).text('FOR THE MONTH OF', badgeX, badgeY + 22, { align: 'center', width: badgeWidth });
        
        const monthYearStr = payDateStr.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
        doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(9.5).text(monthYearStr, badgeX, badgeY + 32, { align: 'center', width: badgeWidth });
      };

      drawHeader();

      doc.y = 95; // start below the header section
      const detailsY = doc.y;
      
      // Let's draw Employee Details (Left Column)
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9).text('EMPLOYEE DETAILS', 40, detailsY);
      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(40, detailsY + 12).lineTo(280, detailsY + 12).stroke();
      
      let leftRowY = detailsY + 18;
      const drawDetailRowLeft = (label, value) => {
        doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(8.5).text(label, 40, leftRowY);
        doc.fillColor(textColor).font('Helvetica').fontSize(8.5).text(value || 'N/A', 140, leftRowY);
        leftRowY += 14;
      };
      
      drawDetailRowLeft('Employee ID', employee.employeeId);
      drawDetailRowLeft('Employee Name', employee.name);
      drawDetailRowLeft('Department', employee.department);
      drawDetailRowLeft('Designation', employee.designation);
      drawDetailRowLeft('Location', salary.location || 'Malappuram'); // Location is in salary slip / employee details
      
      // Let's draw Pay Period Details (Right Column)
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9).text('PAY PERIOD DETAILS', 315, detailsY);
      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(315, detailsY + 12).lineTo(555, detailsY + 12).stroke();
      
      let rightRowY = detailsY + 18;
      const drawDetailRowRight = (label, value) => {
        doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(8.5).text(label, 315, rightRowY);
        doc.fillColor(textColor).font('Helvetica').fontSize(8.5).text(value || 'N/A', 415, rightRowY);
        rightRowY += 14;
      };
      
      drawDetailRowRight('Pay Period', payPeriod);
      drawDetailRowRight('Pay Date', payDate);
      drawDetailRowRight('Working Days', String(salary.workingDays ?? 26));
      drawDetailRowRight('Days Worked', String(salary.daysWorked ?? 26));
      drawDetailRowRight('Days on Leave', String(salary.daysOnLeave ?? 0));
      
      doc.y = Math.max(leftRowY, rightRowY) + 15;

      const tableTop = doc.y;
      const rowHeight = 18;
      
      // Earnings Header (Left: width 240)
      doc.rect(40, tableTop, 240, rowHeight).fill(primaryColor);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
      doc.text('PARTICULARS', 48, tableTop + 5);
      doc.text('AMOUNT (INR)', 200, tableTop + 5, { width: 70, align: 'right' });
      
      // Deductions Header (Right: width 240)
      doc.rect(315, tableTop, 240, rowHeight).fill(primaryColor);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
      doc.text('PARTICULARS', 323, tableTop + 5);
      doc.text('AMOUNT (INR)', 475, tableTop + 5, { width: 70, align: 'right' });

      const earningsItems = [
        ['Basic Salary', salary.basicSalary || 0],
        ['House Rent Allowance', salary.houseRentAllowance || 0],
        ['Special Allowance', salary.specialAllowance || 0],
        ['Transport Allowance', salary.transportAllowance || 0],
        ['Other Allowance', salary.otherAllowance || 0],
        ['Kodbrand Integrity Award', salary.kodbrandIntegrityAward || 0]
      ];
      
      const deductionsItems = [
        ['Advance Salary', salary.advanceSalary || 0],
        ['Provident Fund (PF)', salary.providentFund || 0],
        ['Professional Tax', salary.professionalTax || 0],
        ['Income Tax', salary.incomeTax || 0],
        ['Unpaid Leave Deduction', salary.unpaidLeaveDeduction || 0],
        ['Other Deductions', salary.otherDeductions || 0]
      ];

      let currentY = tableTop + rowHeight;
      const numRows = 6;
      
      for (let i = 0; i < numRows; i++) {
        const rowY = currentY + (i * rowHeight);
        
        // Earnings row
        const [eLabel, eVal] = earningsItems[i];
        doc.fillColor(textColor).font('Helvetica').fontSize(8);
        doc.text(eLabel, 48, rowY + 5, { width: 140 });
        doc.text(Number(eVal).toFixed(2), 200, rowY + 5, { width: 70, align: 'right' });
        
        // Deductions row
        const [dLabel, dVal] = deductionsItems[i];
        doc.text(dLabel, 323, rowY + 5, { width: 140 });
        doc.text(Number(dVal).toFixed(2), 475, rowY + 5, { width: 70, align: 'right' });
        
        doc.strokeColor('#e2e8f0').lineWidth(0.5);
        doc.moveTo(40, rowY + rowHeight).lineTo(280, rowY + rowHeight).stroke();
        doc.moveTo(315, rowY + rowHeight).lineTo(555, rowY + rowHeight).stroke();
      }

      const totalsY = currentY + (numRows * rowHeight);
      
      // Total Earnings (Left)
      doc.rect(40, totalsY, 240, rowHeight).fill(creamColor);
      doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(8.5);
      doc.text('TOTAL EARNINGS', 48, totalsY + 5);
      doc.text(Number(salary.totalEarnings || 0).toFixed(2), 200, totalsY + 5, { width: 70, align: 'right' });
      
      // Total Deductions (Right)
      doc.rect(315, totalsY, 240, rowHeight).fill(creamColor);
      doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(8.5);
      doc.text('TOTAL DEDUCTIONS', 323, totalsY + 5);
      doc.text(Number(salary.totalDeductions || 0).toFixed(2), 475, totalsY + 5, { width: 70, align: 'right' });
      
      // Outer borders for tables
      doc.strokeColor('#cbd5e1').lineWidth(0.5);
      doc.rect(40, tableTop, 240, (numRows + 2) * rowHeight).stroke();
      doc.rect(315, tableTop, 240, (numRows + 2) * rowHeight).stroke();
      
      doc.y = totalsY + rowHeight + 15;

      const netPayY = doc.y;
      const netPayHeight = 30;
      doc.strokeColor(primaryColor).lineWidth(1.5).rect(40, netPayY, 515, netPayHeight).stroke();
      
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11);
      doc.text('NET PAY (₹)', 50, netPayY + 9);
      doc.text(Number(salary.netPay || 0).toFixed(2), 400, netPayY + 9, { width: 145, align: 'right' });
      
      const inWords = numberToWords(Math.round(salary.netPay || 0));
      doc.fillColor(labelColor).font('Helvetica-Oblique').fontSize(8).text(`Net Pay in Words: ${inWords}`, 45, netPayY + netPayHeight + 6);
      
      doc.y = netPayY + netPayHeight + 20;

      const footerY = doc.y;
      
      // Column 1: Company address
      doc.fillColor(textColor).font('Helvetica-Bold').fontSize(8).text('KODBRAND SOLUTIONS', 40, footerY);
      doc.font('Helvetica').fontSize(7).fillColor(labelColor);
      doc.text('3rd Floor, Aranyakam Building,', 40, footerY + 11);
      doc.text('Thamarakuzhi Road,', 40, footerY + 20);
      doc.text('Malappuram, Kerala - 676505', 40, footerY + 29);
      doc.text('Building No: 14/319', 40, footerY + 38);
      doc.text('info@kodbrand.com | www.kodbrand.com', 40, footerY + 47);
      doc.text('CIN: U72900KA2024PTC123456', 40, footerY + 56);
      
      // Column 2: Thank You message
      doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(11).text('Thank You', 205, footerY, { align: 'center', width: 160 });
      doc.font('Helvetica-Oblique').fontSize(8.5).text('For Your Contribution', 205, footerY + 14, { align: 'center', width: 160 });
      doc.fillColor(labelColor).font('Helvetica').fontSize(7.5).text('Your dedication and hard work drive our success.', 205, footerY + 28, { align: 'center', width: 160 });
      
      // Column 3: Authorised Signatory section
      const sigLineY = footerY + 40;
      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(390, sigLineY).lineTo(540, sigLineY).stroke();
      doc.fillColor(textColor).font('Helvetica-Bold').fontSize(8.5).text('Authorised Signatory', 390, sigLineY + 5, { align: 'center', width: 150 });
      doc.font('Helvetica').fontSize(7.5).text('KODBRAND SOLUTIONS', 390, sigLineY + 15, { align: 'center', width: 150 });
      
      // Bottom bar
      const bottomBarY = footerY + 80;
      const bottomBarHeight = 22;
      doc.rect(40, bottomBarY, 515, bottomBarHeight).fill(primaryColor);
      
      doc.fillColor('#FFFFFF').font('Helvetica').fontSize(7.5);
      doc.text('We value your efforts and look forward to achieving greater success together.', 48, bottomBarY + 7);
      doc.font('Helvetica-Bold').text('Building Brands. Driving Growth. ★', 400, bottomBarY + 7, { align: 'right', width: 145 });

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#94a3b8').font('Helvetica').fontSize(7.5);
        doc.text(
          `Page ${i + 1} of ${pages.count}  |  KOD.brand Command Center © ${new Date().getFullYear()}`,
          40,
          805,
          { align: 'center', width: 515 }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
