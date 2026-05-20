import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx'; // Import for Excel functionality
import { 
  Search, Calendar as CalendarIcon, GraduationCap, Loader2, LayoutGrid, List, 
  ChevronLeft, ChevronRight, UserCheck, UserPlus, ShieldCheck, AlertCircle, 
  CheckCircle2, XCircle, X, User, Mail, Lock, Phone, ShieldPlus, CreditCard,
  Download, FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Import the function directly
const API_BASE = "/api";
const STUDENT_ROLE_ID = "57db5d1e-0117-4e89-aed7-e6667946cf79"; 

const FormInput = ({ label, name, type = "text", icon, onChange, value, placeholder = "" }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-bold text-slate-500 uppercase ml-2 tracking-widest">{label}</label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>
      <input 
        required name={name} type={type} value={value} placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 text-slate-900 outline-none focus:border-indigo-500 transition-all text-sm" 
        onChange={onChange} 
      />
    </div>
  </div>
);

const StudentAttendance = () => {
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [attendanceData, setAttendanceData] = useState({}); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const PAGE_SIZE = 20;

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', status: 'active',
    designation_id: '8', joining_date: new Date().toISOString().split('T')[0],
    address: '', identityType: 'aadhaar', identityNumber: '', profile_image: ''
  });

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0].substring(0, 5); 
  };

  const getHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 
      'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const syncAttendance = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/attendance/${selectedDate}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const recordsMap = {};
        data.forEach(record => {
          recordsMap[record.user_id] = { 
            status: record.status.toLowerCase(),
            id: record.id 
          };
        });
        setAttendanceData(recordsMap);
      }
    } catch (e) { console.error("Sync Error", e); }
  }, [getHeaders, selectedDate]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const res = await fetch(`${API_BASE}/user/list?limit=${PAGE_SIZE}&skip=${skip}`, { headers: getHeaders() });
      const responseData = await res.json();
      
      const studentList = (responseData.users || []).filter(u => String(u.role_id) === STUDENT_ROLE_ID);
      
      setStudents(studentList);
      setTotalStudents(studentList.length); 
      
      await syncAttendance();
    } catch (e) { 
      console.error("Fetch Error", e); 
    } finally { 
      setLoading(false); 
    }
  }, [getHeaders, currentPage, syncAttendance]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // Excel Export Logic
  const exportToExcel = () => {
    const dataToExport = students
      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(s => ({
        'Student Name': s.name.toUpperCase(),
        'Email': s.email,
        'Date': selectedDate,
        'Attendance Status': (attendanceData[s.id]?.status || 'Unmarked').toUpperCase()
      }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AttendanceReport");
    XLSX.writeFile(workbook, `Attendance_Report_${selectedDate}.xlsx`);
  };
const exportToPDF = () => {
  const doc = new jsPDF();
  const tableColumn = ["Student Name", "Email", "Date", "Status"];
  const tableRows = [];

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  filteredStudents.forEach(s => {
    const studentData = [
      s.name.toUpperCase(),
      s.email,
      selectedDate,
      (attendanceData[s.id]?.status || 'Unmarked').toUpperCase()
    ];
    tableRows.push(studentData);
  });

  // Header Branding
  doc.setFontSize(18);
  doc.text("ATTENDANCE CONTROL REPORT", 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Report Date: ${selectedDate}`, 14, 30);

  // Use the autoTable function directly
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    headStyles: { 
      fillColor: [79, 70, 229], // Your indigo-600 color
      halign: 'center' 
    },
    styles: { fontSize: 8, cellPadding: 4 },
  });

  doc.save(`Attendance_Report_${selectedDate}.pdf`);
};
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsAddingStudent(true);
    const finalPayload = { ...formData, salary: 1, role_id: STUDENT_ROLE_ID };

    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchStudents();
        setFormData({
          name: '', email: '', password: '', phone: '', status: 'active',
          designation_id: '8', joining_date: new Date().toISOString().split('T')[0],
          address: '', identityType: 'aadhaar', identityNumber: '', profile_image: ''
        });
      } else {
        alert("Enrollment failed. Please check the details.");
      }
    } catch (error) {
      alert("Connection error.");
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleAction = async (studentId, type) => {
    const endpoint = type === 'present' ? "/attendance/admin/check-in" : 
                     type === 'absent' ? "/attendance/admin/mark-absent" : "/attendance/admin/check-out";
    
    const previousState = { ...attendanceData };
    setAttendanceData(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], status: type }
    }));

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ user_id: String(studentId), time: getCurrentTime(), date: selectedDate }),
      });
      if (res.ok) {
          await syncAttendance(); 
      } else {
          setAttendanceData(previousState); 
          alert("Update failed on server");
      }
    } catch (e) { 
        setAttendanceData(previousState);
        alert("Network Error"); 
    }
  };
useEffect(() => {
  if (isModalOpen) {
    // Scroll to top of the PAGE before opening to prevent positioning glitches
    window.scrollTo(0, 0); 
    // document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'unset';
  }
  return () => {
    document.body.style.overflow = 'unset';
  };
}, [isModalOpen]);
  return (
    <div className="text-slate-600 dark:text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="relative max-w-[1600px] mx-auto px-4 md:px-8 py-12">
        
        <nav className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(79,70,229,0.3)]">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">Attendance <span className="text-indigo-600 italic">Control</span></h1>
              <p className="text-[10px] font-black tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase mt-1 italic">Verified Administrative Session</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <button onClick={() => setViewMode('grid')} className={`p-3 rounded-xl transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><LayoutGrid size={20} /></button>
              <button onClick={() => setViewMode('table')} className={`p-3 rounded-xl transition-all cursor-pointer ${viewMode === 'table' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><List size={20} /></button>
              <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />
              
              {/* Calendar Integration */}
              <div className="relative flex items-center gap-1 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 group">
                <CalendarIcon size={16} className="text-indigo-400" />
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-indigo-900 dark:text-indigo-400 outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark] tracking-widest"
                />
              </div>
          </div>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Total Enrolled', value: totalStudents, icon: GraduationCap, color: 'indigo' },
            { label: 'Active Presence', value: Object.values(attendanceData).filter(v => v.status === 'present').length, icon: UserCheck, color: 'emerald' },
            { label: 'Unresolved Absent', value: Object.values(attendanceData).filter(v => v.status === 'absent').length, icon: AlertCircle, color: 'red' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl flex items-center justify-between group hover:border-indigo-500/20 dark:hover:border-indigo-500/50 transition-all duration-500 shadow-sm">
              <div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tighter">{stat.value}</p>
              </div>
              <div className={`p-5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-950/20 text-indigo-500 border border-indigo-500/10 dark:border-indigo-500/20 group-hover:scale-110 transition-transform`}>
                <stat.icon size={28} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-10">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              placeholder="Search by student identity..." 
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 pl-14 rounded-2xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {/* PDF Download Button */}
            <button 
                onClick={exportToPDF} 
                className="flex-1 lg:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
                <FileSpreadsheet size={16} /> PDF Report
            </button>
            {/* Excel Download Button */}
            <button onClick={exportToExcel} className="flex-1 lg:flex-none bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer">
                <Download size={16} /> Excel Report
            </button>
            <button onClick={() => setIsModalOpen(true)} className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer">
                <UserPlus size={16} /> Enroll Student
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-indigo-500" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">Retrieving Secure Records...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => {
                  const status = attendanceData[s.id]?.status;
                  const isPresent = status === 'present';
                  const isAbsent = status === 'absent';

                  return (
                    <motion.div 
                      layout
                      key={s.id} 
                      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 rounded-[2.5rem] hover:shadow-md transition-all relative overflow-hidden shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div className="w-14 h-14 bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xl font-black italic border border-slate-300 dark:border-slate-800">
                          {s.name.charAt(0)}
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${
                          isPresent ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 
                          isAbsent ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 
                          'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {status || 'Unmarked'}
                        </div>
                      </div>

                      <div className="mb-8">
                        <h3 className="text-slate-900 dark:text-slate-100 font-bold text-lg leading-tight truncate uppercase tracking-tight">{s.name}</h3>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold mt-1 truncate uppercase opacity-60 tracking-wider">{s.email}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleAction(s.id, 'present')}
                          className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isPresent 
                            ? 'bg-emerald-600 text-white shadow-lg' 
                            : 'bg-emerald-500/5 dark:bg-emerald-950/20 text-emerald-500/40 border border-emerald-500/10 dark:border-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:border-emerald-500'
                          }`}
                        >
                          <CheckCircle2 size={14} /> {isPresent ? 'Saved' : 'Present'}
                        </button>
                        <button 
                          onClick={() => handleAction(s.id, 'absent')}
                          className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isAbsent 
                            ? 'bg-red-600 text-white shadow-lg' 
                            : 'bg-red-500/5 dark:bg-red-950/20 text-red-500/40 border border-red-500/10 dark:border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500'
                          }`}
                        >
                          <XCircle size={14} /> {isAbsent ? 'Saved' : 'Absent'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
         // ... inside your ternary for viewMode
) : (
  <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
    {/* Wrap table in an overflow-x-auto container */}
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[700px]"> 
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-850">
            <th className="px-8 py-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Full Student Profile</th>
            <th className="px-8 py-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
            <th className="px-8 py-6 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-right">Database Controls</th>
          </tr>
        </thead>
        <tbody>
          {students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s) => {
            const status = attendanceData[s.id]?.status;
            return (
              <tr key={s.id} className="border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 flex-shrink-0">{s.name.charAt(0)}</div>
                    <div className="min-w-0">
                      <p className="text-slate-900 dark:text-slate-100 font-bold text-sm uppercase tracking-tight truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase truncate">{s.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${status === 'present' ? 'text-emerald-500 bg-emerald-500/10' : status === 'absent' ? 'text-red-500 bg-red-500/10' : 'text-slate-500 dark:text-slate-400 bg-slate-500/10 dark:bg-slate-500/20'}`}>
                    {status || 'Unmarked'}
                   </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => handleAction(s.id, 'present')} 
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${status === 'present' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'}`}
                    >
                      Present
                    </button>
                    <button 
                      onClick={() => handleAction(s.id, 'absent')} 
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${status === 'absent' ? 'bg-red-600 text-white shadow-md' : 'bg-red-500/10 dark:bg-red-950/20 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white'}`}
                    >
                      Absent
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </motion.div>

            )}
          </AnimatePresence>
        )}

        <div className="mt-16 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-xl">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
          >
            <ChevronLeft size={18} /> Previous Sequence
          </button>
          
          <div className="hidden md:flex gap-3">
            {[...Array(Math.ceil(totalStudents / PAGE_SIZE))].map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentPage(i + 1)}
                className={`w-12 h-12 rounded-xl text-[10px] font-black transition-all border cursor-pointer ${currentPage === i + 1 ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-200 hover:text-indigo-600 dark:hover:text-indigo-450'}`}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </div>

          <button 
            disabled={currentPage * PAGE_SIZE >= totalStudents} 
            onClick={() => setCurrentPage(p => p + 1)}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
          >
            Next Iteration <ChevronRight size={18} />
          </button>
        </div>
      </div>
<AnimatePresence>
  {isModalOpen && (
    /* 1. Ensure the overlay itself is scrollable */
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/95 backdrop-blur-xl">
      
      {/* 2. CHANGE items-center to items-start. 
             If it's centered, you can't scroll to the top of a long form. */}
      <div className="flex min-h-full items-start justify-center p-4 sm:p-8 md:p-12">
        
        {/* Background Click to Close */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={() => setIsModalOpen(false)} 
          className="fixed inset-0 cursor-pointer z-0" 
        />

        {/* 3. Modal Card - Ensure there is a bottom margin (mb-10) 
             so the submit button isn't stuck at the very bottom edge. */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: -20, opacity: 0 }} 
          className="relative z-10 w-full max-w-5xl bg-white border border-slate-200 p-6 md:p-12 rounded-[3rem] shadow-xl mb-10"
        >
          <header className="mb-10 flex justify-between items-start">
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 italic uppercase tracking-tighter">
                Enroll <span className="text-indigo-600">Scholar</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">
                Verified Institutional Node Entry
              </p>
            </div>
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="p-4 text-slate-500 hover:text-slate-900 transition-all bg-slate-50 rounded-2xl border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
            >
              <X size={24}/>
            </button>
          </header>
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormInput label="Full Name" name="name" icon={<User size={14}/>} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            <FormInput label="Email" name="email" type="email" icon={<Mail size={14}/>} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <FormInput label="Password" name="password" type="password" icon={<Lock size={14}/>} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            <FormInput label="Phone" name="phone" icon={<Phone size={14}/>} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase ml-2">ID Type</label>
              <div className="relative">
                <ShieldPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 outline-none appearance-none text-sm focus:border-indigo-500/50 transition-all" 
                  value={formData.identityType} 
                  onChange={(e) => setFormData({...formData, identityType: e.target.value})}
                >
                  <option value="aadhaar">Aadhar</option>
                  <option value="pancard">PAN</option>
                </select>
              </div>
            </div>

            <FormInput label="ID Number" name="identityNumber" icon={<CreditCard size={14}/>} value={formData.identityNumber} onChange={(e) => setFormData({...formData, identityNumber: e.target.value})} />

            <div className="lg:col-span-3 mt-6">
              <button 
                type="submit" 
                disabled={isAddingStudent} 
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isAddingStudent ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Confirm Enrollment
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )}
</AnimatePresence>
    </div>
  );
};

export default StudentAttendance;