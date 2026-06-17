import PDFDocument from 'pdfkit';

/**
 * Generates a beautiful PDF report from report data
 * @param {Object} report - Mongoose document or JS object containing report details
 * @param {String} empName - Name of the employee
 * @param {String} designation - Designation of the employee
 * @returns {Promise<Buffer>} Resolves with PDF file buffer
 */
export const generateReportPDFBuffer = (report, empName, designation) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', autoFirstPage: true, bufferPages: true });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const primaryColor = '#3c2375'; // Purple
      const secondaryColor = '#84cc16'; // Lime/green
      const textColor = '#1e293b'; // Dark slate
      const labelColor = '#475569'; // Slate

      // --- PAGE HEADER FUNCTION ---
      const drawHeader = () => {
        // Draw KOD.brand branding
        doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(22).text('KOD.', 40, 40, { continued: true });
        doc.fillColor(primaryColor).text('brand');

        // Document title
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(14).text('DAILY SHIFT REPORT', 300, 40, { align: 'right' });
        
        doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(8.5).text((designation || 'Employee').toUpperCase(), 300, 58, { align: 'right' });

        // Horizontal line
        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, 75).lineTo(555, 75).stroke();
        doc.y = 90;
      };

      drawHeader();

      // --- WIDOW PREVENTION HELPER ---
      const checkPageOverflow = (neededHeight) => {
        if (doc.y + neededHeight > 760) {
          doc.addPage();
          drawHeader();
        }
      };

      // --- SECTION HEADER DRAWING ---
      const drawSectionHeader = (title) => {
        checkPageOverflow(35);
        const startY = doc.y;
        doc.rect(40, startY, 515, 18).fill(primaryColor);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text(title.toUpperCase(), 48, startY + 5);
        doc.y = startY + 24;
      };

      // 1. BASIC DETAILS
      if (report.basicDetails) {
        drawSectionHeader('1. Basic Details');
        
        const bd = report.basicDetails;
        const details = [
          ['Date', bd.date],
          ['Day', bd.day],
          ['Employee Name', bd.employeeName || empName],
          ['Employee ID', bd.employeeId],
          ['Department', bd.department],
          ['Designation', bd.designation || designation],
          ['Shift Timing', bd.shiftTiming],
          ['Reporting To', bd.reportingTo],
          ['Prepared Time', bd.preparedTime]
        ].filter(([_, v]) => v);

        // Render in two columns
        let col = 0;
        let originalY = doc.y;
        
        details.forEach(([key, val]) => {
          checkPageOverflow(15);
          if (col === 0) {
            doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(8.5).text(`${key}: `, 45, doc.y, { continued: true });
            doc.fillColor(textColor).font('Helvetica').text(String(val));
            col = 1;
          } else {
            doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(8.5).text(`${key}: `, 300, originalY, { continued: true });
            doc.fillColor(textColor).font('Helvetica').text(String(val));
            col = 0;
            originalY = doc.y; // Update for next row
          }
        });
        
        if (col === 1) {
          doc.y = originalY + 12; // Advance cursor if odd number of details
        }
        
        doc.y += 10;
      }

      // 2. DAILY TASK SUMMARY / OPERATIONS
      const summaryKey = Object.keys(report).find(k => 
        k.toLowerCase().includes('tasksum') || 
        k.toLowerCase().includes('task_sum') || 
        k === 'dailyTaskSummary' || 
        k === 'dailyOperations'
      );

      if (summaryKey && Array.isArray(report[summaryKey]) && report[summaryKey].length > 0) {
        checkPageOverflow(50);
        drawSectionHeader('2. Daily Task Summary');
        
        report[summaryKey].forEach((t, index) => {
          const act = t.activity || t.task || '';
          const status = t.status || '';
          const remarks = t.remarks || t.remark || '';

          checkPageOverflow(30);
          
          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text(`${index + 1}. Activity: `, 45, doc.y, { continued: true });
          doc.fillColor(textColor).font('Helvetica').text(act);
          
          doc.fillColor(primaryColor).font('Helvetica-Bold').text('   Status: ', { continued: true });
          doc.fillColor(textColor).font('Helvetica').text(status, { continued: true });
          
          if (remarks) {
            doc.fillColor(primaryColor).font('Helvetica-Bold').text('   Remarks: ', { continued: true });
            doc.fillColor(textColor).font('Helvetica').text(remarks);
          } else {
            doc.text(''); // newline
          }
          doc.y += 4;
        });
        doc.y += 8;
      }

      // 3. OTHER DYNAMIC SECTIONS
      // Exclude metadata, nested approvals, and already printed sections
      const skipKeys = new Set([
        'basicDetails', summaryKey, '_id', '__v', 'userId', 'dateString', 'createdAt', 'updatedAt', 'approval', 'id'
      ]);

      const reportObject = report.toObject ? report.toObject() : report;
      let sectionIndex = 3;

      for (const [key, val] of Object.entries(reportObject)) {
        if (skipKeys.has(key)) continue;

        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
          // It's a structured array of details
          const title = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          drawSectionHeader(`${sectionIndex}. ${title}`);
          
          val.forEach((item, index) => {
            checkPageOverflow(40);
            doc.x = 45;
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text(`[Item ${index + 1}]`);
            
            const fields = Object.entries(item).filter(([k]) => k !== '_id' && k !== 'id');
            fields.forEach(([k, v]) => {
              checkPageOverflow(15);
              const label = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
              doc.x = 55;
              doc.fillColor(labelColor).font('Helvetica-Bold').text(`${label}: `, { continued: true });
              doc.fillColor(textColor).font('Helvetica').text(String(v || ' '));
            });
            doc.y += 4;
          });
          
          doc.x = 40;
          doc.y += 8;
          sectionIndex++;
        } else if (typeof val === 'string' && val.trim()) {
          // Standard text area field
          const title = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          drawSectionHeader(`${sectionIndex}. ${title}`);
          
          checkPageOverflow(30);
          doc.x = 45;
          doc.fillColor(textColor).font('Helvetica').fontSize(8.5).text(val, { width: 500, align: 'justify' });
          doc.x = 40;
          doc.y += 10;
          sectionIndex++;
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
          // Single nested tracking object (e.g. performanceTracker)
          const title = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          drawSectionHeader(`${sectionIndex}. ${title}`);
          
          const fields = Object.entries(val).filter(([k]) => k !== '_id' && k !== 'id');
          fields.forEach(([k, v]) => {
            checkPageOverflow(15);
            const label = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
            doc.x = 50;
            doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(8.5).text(`${label}: `, { continued: true });
            
            if (v && typeof v === 'object') {
              const subStr = Object.entries(v)
                .filter(([sk, sv]) => sk !== '_id' && sk !== 'id' && sv !== undefined && sv !== null && String(sv).trim() !== '')
                .map(([sk, sv]) => `${sk.replace(/([A-Z])/g, ' $1').trim()}: ${sv}`)
                .join(' | ');
              doc.fillColor(textColor).font('Helvetica').text(subStr || ' ');
            } else {
              doc.fillColor(textColor).font('Helvetica').text(String(v || ' '));
            }
          });
          
          doc.x = 40;
          doc.y += 10;
          sectionIndex++;
        }
      }

      // 4. APPROVAL SIGNATURES
      if (report.approval) {
        checkPageOverflow(60);
        drawSectionHeader('Approvals & Handover');
        
        const app = report.approval;
        const approvalDetails = Object.entries(app).filter(([k]) => k !== '_id' && k !== 'id' && app[k]);
        
        let col = 0;
        let originalY = doc.y;

        approvalDetails.forEach(([key, val]) => {
          checkPageOverflow(15);
          const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
          if (col === 0) {
            doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(8.5).text(`${label}: `, 45, doc.y, { continued: true });
            doc.fillColor(textColor).font('Helvetica').text(String(val));
            col = 1;
          } else {
            doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(8.5).text(`${label}: `, 300, originalY, { continued: true });
            doc.fillColor(textColor).font('Helvetica').text(String(val));
            col = 0;
            originalY = doc.y;
          }
        });
      }

      // --- PAGE FOOTER FUNCTION ---
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
