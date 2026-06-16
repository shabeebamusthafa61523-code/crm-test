import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Search, Download, Loader2, FileDown, AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_URL;

// Map designation IDs to API endpoint prefixes
const DESIGNATION_API_MAP = {
  '6a1e8e2d01a0dae8b2f3b18c': { name: 'Developer',            apiPrefix: 'developer-reports',           byDate: 'by-date' },
  '6a2f9e086f1c41b0c80a9e21': { name: 'HOD R&D',              apiPrefix: 'hod-rd-reports',              byDate: 'by-date' },
  '6a1e8e6e01a0dae8b2f3b18d': { name: 'Graphic Designer',     apiPrefix: 'graphic-designer-reports',    byDate: 'by-date' },
  '6a27939af292348deb7d0495': { name: 'Academic Counselor',   apiPrefix: 'academic-counselor-reports',  byDate: 'by-date' },
  '6a2f912c2df21dc234018caa': { name: 'Videographer',         apiPrefix: 'videographer-reports',        byDate: 'by-date' },
  '6a2f8efea2fe388770a38987': { name: 'HR',                   apiPrefix: 'hr-reports',                  byDate: 'by-date' },
  '6a2f91472df21dc234018cab': { name: 'Ops',                  apiPrefix: 'ops-reports',                 byDate: 'by-date' },
  '6a2f915e2df21dc234018cac': { name: 'Accountant',           apiPrefix: 'accountant-reports',          byDate: 'by-date' },
  '6a2f909d2df21dc234018ca8': { name: 'Marketing',            apiPrefix: 'marketing-reports',           byDate: 'by-date' },
};

// Generic PDF generator — creates a clean summary PDF from any report object
const generateReportPDF = (report, empName, designation) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 15;

  const drawHeader = (title) => {
    doc.setFillColor(60, 35, 117);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), 17, y + 5);
    y += 7;
  };

  // Brand header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(132, 204, 22);
  doc.text('KOD.', 14, 21);
  doc.setTextColor(60, 35, 117);
  doc.text('brand', 34, 21);

  doc.setFontSize(14);
  doc.setTextColor(60, 35, 117);
  doc.text('DAILY SHIFT REPORT', 130, 16);

  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text((designation || 'Employee').toUpperCase(), 130, 23);

  y = 27;

  // Basic Details
  if (report.basicDetails) {
    drawHeader('1. BASIC DETAILS');
    const bd = report.basicDetails;
    const rows = [
      ['Date', bd.date || ''],
      ['Day', bd.day || ''],
      ['Employee Name', bd.employeeName || empName || ''],
      ['Employee ID', bd.employeeId || ''],
      ['Department', bd.department || ''],
      ['Designation', bd.designation || designation || ''],
      ['Shift Timing', bd.shiftTiming || ''],
      ['Reporting To', bd.reportingTo || ''],
      ['Prepared Time', bd.preparedTime || ''],
    ];
    autoTable(doc, {
      body: rows, startY: y, theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [0,0,0], lineColor: [180,180,180], lineWidth: 0.15 },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [245,245,247], cellWidth: 45 }, 1: { cellWidth: 137 } },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  // Daily Task Summary
  const summaryKey = Object.keys(report).find(k => k.toLowerCase().includes('tasksum') || k.toLowerCase().includes('task_sum') || k === 'dailyTaskSummary');
  if (summaryKey && Array.isArray(report[summaryKey]) && report[summaryKey].length > 0) {
    drawHeader('2. DAILY TASK SUMMARY');
    const rows = report[summaryKey].map(t => [t.activity || t.task || '', t.status || '', t.remarks || t.remark || '']);
    autoTable(doc, {
      head: [['Activity', 'Status', 'Remarks']], body: rows, startY: y, theme: 'grid',
      headStyles: { fillColor: [255,255,255], textColor: [60,35,117], fontStyle: 'bold', lineColor: [180,180,180], lineWidth: 0.15 },
      styles: { fontSize: 8, cellPadding: 2, textColor: [0,0,0], lineColor: [180,180,180], lineWidth: 0.15 },
      columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 35, halign: 'center' }, 2: { cellWidth: 77 } },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  // Render all other array sections generically
  const skip = new Set(['basicDetails', summaryKey, '_id', '__v', 'userId', 'dateString', 'createdAt', 'updatedAt']);
  let sectionIndex = 3;
  for (const [key, val] of Object.entries(report)) {
    if (skip.has(key)) continue;
    if (y > 250) { doc.addPage(); y = 15; }

    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      drawHeader(`${sectionIndex}. ${key.replace(/([A-Z])/g, ' $1').toUpperCase()}`);
      const cols = Object.keys(val[0]);
      const rows = val.map(item => cols.map(c => String(item[c] ?? '')));
      autoTable(doc, {
        head: [cols.map(c => c.replace(/([A-Z])/g, ' $1').toUpperCase())],
        body: rows, startY: y, theme: 'grid',
        headStyles: { fillColor: [255,255,255], textColor: [60,35,117], fontStyle: 'bold', lineColor: [180,180,180], lineWidth: 0.15 },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [0,0,0], lineColor: [180,180,180], lineWidth: 0.15 },
        margin: { left: 14, right: 14 }
      });
      y = doc.lastAutoTable.finalY + 4;
      sectionIndex++;
    } else if (typeof val === 'string' && val.trim()) {
      if (y > 260) { doc.addPage(); y = 15; }
      drawHeader(`${sectionIndex}. ${key.replace(/([A-Z])/g, ' $1').toUpperCase()}`);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(val, 178);
      const boxH = Math.max(12, lines.length * 4.2 + 5);
      doc.setDrawColor(180, 180, 180);
      doc.rect(14, y, 182, boxH);
      doc.text(lines, 16, y + 5);
      y += boxH + 4;
      sectionIndex++;
    }
  }

  const safeEmpName = (empName || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
  const today = new Date().toISOString().split('T')[0];
  doc.save(`${designation || 'Report'}_${safeEmpName}_${today}.pdf`);
};

const EmployeeReports = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(null); // empId being downloaded
  const [errorMsg, setErrorMsg] = useState(null);

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return {
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/user/list`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setEmployees(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to load employee list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [getAuthHeaders]);

  const filteredEmployees = employees.filter(emp => {
    const nameMatch = (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || emailMatch;
  });

  const getDesignationConfig = (emp) => {
    const desigId = emp.designationId?._id || emp.designationId || emp.designation_id;
    return DESIGNATION_API_MAP[desigId] || null;
  };

  const handleDownload = async (emp) => {
    const config = getDesignationConfig(emp);
    if (!config) {
      setErrorMsg(`No report template configured for ${emp.name || 'this employee'} (${emp.designationId?.name || 'unknown designation'}).`);
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    const empId = emp._id || emp.id;
    setDownloading(empId);
    setErrorMsg(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `${API_BASE}/v1/${config.apiPrefix}/${config.byDate}?userId=${empId}&dateString=${today}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();

      if (data.success && data.data) {
        generateReportPDF(data.data, emp.name, config.name);
      } else {
        // No report for today — try yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        const res2 = await fetch(`${API_BASE}/v1/${config.apiPrefix}/${config.byDate}?userId=${empId}&dateString=${yStr}`, { headers: getAuthHeaders() });
        const data2 = await res2.json();

        if (data2.success && data2.data) {
          generateReportPDF(data2.data, emp.name, config.name);
        } else {
          setErrorMsg(`No report found for ${emp.name || 'this employee'} for today or yesterday.`);
          setTimeout(() => setErrorMsg(null), 5000);
        }
      }
    } catch (err) {
      console.error('Download failed:', err);
      setErrorMsg('Failed to fetch report. Please try again.');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/70 dark:text-indigo-400/80">Admin Directory</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
            Employee <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Reports</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Click on an employee name to instantly download their latest daily shift report as a PDF.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 shrink-0">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-all shadow-sm"
          />
          <Search size={18} className="absolute left-4 top-4 text-slate-400 pointer-events-none" />
        </div>
      </header>

      {/* Error Banner */}
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-2xl px-5 py-4 text-sm text-red-700 dark:text-red-400"
        >
          <AlertCircle size={18} className="shrink-0" />
          {errorMsg}
        </motion.div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={36} />
          <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Retrieving employee roster...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 p-8 shadow-sm">
          <Users size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Employees Found</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search query or verify the employee list.</p>
        </div>
      ) : (
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => {
            const config = getDesignationConfig(emp);
            const initial = emp.name ? emp.name.charAt(0).toUpperCase() : '?';
            const empId = emp._id || emp.id;
            const isDownloading = downloading === empId;

            return (
              <motion.div
                key={empId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                {/* Profile Section — clickable name triggers download */}
                <div
                  className="flex items-start gap-4 mb-5 cursor-pointer"
                  onClick={() => handleDownload(emp)}
                  title={config ? `Download latest report for ${emp.name}` : 'No report template configured'}
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-lg font-bold shrink-0 border border-indigo-100 dark:border-indigo-900/40 group-hover:scale-105 transition-transform">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {emp.name}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{emp.email}</p>
                    <p className="text-[10px] font-bold text-indigo-600 dark:text-lime-400 uppercase tracking-wider mt-2 bg-indigo-50/50 dark:bg-lime-950/20 px-2.5 py-0.5 rounded-full inline-block">
                      {emp.designationId?.name || emp.role || 'Staff Member'}
                    </p>
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(emp)}
                  disabled={isDownloading}
                  className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                    config
                      ? 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40 hover:shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800/50 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating PDF...
                    </>
                  ) : config ? (
                    <>
                      <FileDown size={14} />
                      Download Latest Report PDF
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      No Report Template
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeReports;
