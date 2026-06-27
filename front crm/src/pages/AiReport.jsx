import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Calendar, Sparkles, AlertCircle, Download, Filter } from 'lucide-react';
import AiChatWidget from '../components/AiChatWidget';

const API_URL = import.meta.env?.VITE_API_URL || import.meta.env?.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const AiReport = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('all');
  const [reportStats, setReportStats] = useState(null);

  const reportRef = useRef(null);
  const exportRef = useRef(null);

  useEffect(() => {
    // Fetch departments for the filter dropdown
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/v1/departments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          setDepartments(data.data.filter(dept => dept.status === true));
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepartments();
  }, []);

  const fetchReport = async (force = false) => {
    setLoading(true);
    setError(null);
    setReportData(null);
    setReportStats(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/v1/ai/${activeTab}?department=${selectedDept}${force ? '&force=true' : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setReportData(data.report);
        setReportStats(data.stats || null);
      } else {
        setError(data.message || 'Failed to fetch AI report.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while communicating with the AI service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(false);
  }, [activeTab, selectedDept]);

  const handleExportPDF = async () => {
    if (!exportRef.current || !reportData) return;
    
    try {
      const element = exportRef.current;
      const opt = {
        margin:       0.5,
        filename:     `AI_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      const html2pdfModule = await import('html2pdf.js');
      const html2pdfInstance = html2pdfModule.default || html2pdfModule;
      
      html2pdfInstance().set(opt).from(element).save();
    } catch (err) {
      console.error("Direct PDF Export failed, trying fallback print:", err);
      window.print();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-20 relative">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-650 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent tracking-tight flex items-center gap-3">
              <Sparkles className="text-indigo-500 animate-pulse" size={32} />
              AI Insights
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs md:text-sm mt-2 tracking-wider uppercase">
              Automated intelligence engine • powered by Groq Llama 3
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Department Filter */}
            <div className="flex items-center bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-xl px-3.5 py-2 shadow-sm backdrop-blur-md">
              <Filter size={15} className="text-indigo-500 mr-2.5" />
              <select 
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer tracking-wide uppercase"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
            
            {/* Export PDF Button */}
            <button
              onClick={handleExportPDF}
              disabled={!reportData || loading}
              className="flex items-center gap-2 px-4.5 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800/50 font-bold text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 tracking-wider uppercase cursor-pointer"
            >
              <Download size={15} className="text-slate-500" />
              Export
            </button>
 
            {/* Regenerate Button */}
            <button
              onClick={() => fetchReport(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 tracking-wider uppercase cursor-pointer"
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Regenerate
            </button>
          </div>
        </div>
 
        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 p-1 rounded-xl w-full max-w-xs shadow-sm">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all tracking-wider uppercase ${
              activeTab === 'daily' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm border border-slate-200/10' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all tracking-wider uppercase ${
              activeTab === 'monthly' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm border border-slate-200/10' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            Monthly
          </button>
        </div>

        {/* Bento Grid Stats */}
        {reportStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Vibe Check */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-xl shadow-xl shadow-slate-100/10 dark:shadow-none flex flex-col justify-between group hover:border-indigo-500/30 transition-all duration-300"
            >
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Team Sentiment</span>
                <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1 flex items-center gap-2.5 tracking-tight">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  {reportStats.teamVibe || '⚡ Active'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed font-semibold">
                AI parsed sentiment based on active tasks and submitted logs.
              </p>
            </motion.div>

            {/* Card 2: Executive Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/30 shadow-xl backdrop-blur-xl flex flex-col justify-between md:col-span-2 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">AI Executive Summary</span>
                <p className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 mt-2 leading-relaxed italic">
                  "{reportStats.summary || 'Summary generation processing...'}"
                </p>
              </div>
              <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold mt-4 tracking-wider flex items-center gap-1.5 uppercase">
                <Sparkles size={12} className="animate-pulse" /> Groq Llama 3.3 • Live Analysis
              </div>
            </motion.div>

            {/* Card 3: Employee of the Month (Only if Monthly & exists) */}
            {activeTab === 'monthly' && reportStats.employeeOfTheMonth?.name && reportStats.employeeOfTheMonth?.name !== 'N/A' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-transparent dark:from-amber-500/[0.04] dark:via-orange-500/[0.01] dark:to-transparent border border-amber-200/50 dark:border-amber-500/10 shadow-xl backdrop-blur-xl md:col-span-3 flex flex-col sm:flex-row items-center gap-6 group hover:border-amber-500/30 transition-all duration-300"
              >
                <div className="h-16 w-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center text-white shrink-0 transform group-hover:scale-105 transition-transform duration-300">
                  <Sparkles size={32} />
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest block">🏆 Monthly Performance Spotlight</span>
                  <h4 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{reportStats.employeeOfTheMonth.name}</h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mt-1">{reportStats.employeeOfTheMonth.reason}</p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Report Content */}
        <div className="bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-xl backdrop-blur-xl rounded-3xl min-h-[400px] relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center space-y-4 min-h-[400px]"
              >
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-semibold animate-pulse text-center px-4">
                  Analyzing tasks and reading employee reports...
                </p>
              </motion.div>
            ) : error ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center space-y-3 p-8 text-center min-h-[400px]"
              >
                <AlertCircle className="text-rose-500" size={48} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Analysis Failed</h3>
                <p className="text-slate-500 dark:text-slate-400">{error}</p>
                <button onClick={fetchReport} className="text-indigo-600 hover:underline font-semibold mt-2">Try Again</button>
              </motion.div>
            ) : reportData ? (
              <motion.div 
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-6 md:p-10 prose dark:prose-invert prose-indigo max-w-none"
              >
                {/* Wrap content in a div for PDF capture */}
                <div ref={reportRef} className="pdf-container bg-transparent print:absolute print:left-0 print:top-0 print:w-full print:bg-white print:text-black print:p-8">
                  <style>
                    {`
                      @media print {
                        body * { visibility: hidden; }
                        .pdf-container, .pdf-container * { visibility: visible; }
                        .pdf-container { margin: 0; padding: 0; box-shadow: none; border: none; }
                        /* Force text colors to black for print to avoid oklch issues in print preview */
                        .pdf-container * { color: black !important; }
                      }
                    `}
                  </style>
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-6 border-b border-slate-200/40 dark:border-slate-800/80 pb-4.5 tracking-tight" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-10 mb-4.5 flex items-center gap-2.5 border-l-4 border-indigo-500 pl-3 tracking-tight" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm md:text-md font-bold text-slate-855 dark:text-slate-200 mt-6 mb-3 tracking-tight" {...props} />,
                      p: ({node, ...props}) => <p className="text-slate-650 dark:text-slate-300 leading-relaxed mb-4 text-sm md:text-base font-medium" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-extrabold text-indigo-650 dark:text-indigo-400" {...props} />,
                      ul: ({node, ...props}) => <ul className="space-y-2 mb-6" {...props} />,
                      li: ({node, ...props}) => (
                        <li className="flex items-start mb-2.5">
                          <span className="mr-3 text-indigo-550 dark:text-indigo-400 mt-1.5 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 block shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                          </span>
                          <span className="text-slate-650 dark:text-slate-350 text-sm font-semibold leading-relaxed" {...props} />
                        </li>
                      ),
                      blockquote: ({node, ...props}) => (
                        <blockquote className="border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-500/5 dark:border-amber-500/30 p-4 rounded-r-2xl text-amber-800 dark:text-amber-300 my-6 italic text-xs md:text-sm font-medium leading-relaxed" {...props} />
                      ),
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto my-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm backdrop-blur-md">
                          <table className="min-w-full divide-y divide-slate-200/60 dark:divide-slate-850 text-xs md:text-sm" {...props} />
                        </div>
                      ),
                      thead: ({node, ...props}) => <thead className="bg-slate-50/50 dark:bg-slate-850/40" {...props} />,
                      th: ({node, ...props}) => <th className="px-4 py-3.5 text-left font-extrabold text-slate-850 dark:text-white uppercase tracking-wider text-[10px] md:text-[11px]" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-3.5 text-slate-650 dark:text-slate-350 border-t border-slate-100/50 dark:border-slate-850/50 font-semibold" {...props} />,
                    }}
                  >
                    {reportData}
                  </ReactMarkdown>
                </div>
              </motion.div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center min-h-[400px]">
                <p className="text-slate-400">No report data available.</p>
              </div>
            )}
          </AnimatePresence>
          
        </div>

      {/* Render the AI Chat Widget if we have report data to give it context */}
      <AiChatWidget reportContext={reportData} />

      {/* Off-screen clean HTML container for PDF export (bypasses Tailwind v4 oklch() crashes) */}
      {reportData && (
        <div style={{ position: 'absolute', left: '-9999px', top: '0', width: '800px', zIndex: -1000 }}>
          <div ref={exportRef} style={{ padding: '40px', backgroundColor: '#ffffff', color: '#1a1a1a', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ fontSize: '28px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px', fontWeight: 'bold', color: '#111827' }}>
              AI Insights - {activeTab === 'daily' ? 'Daily Summary' : 'Monthly Report'}
            </h1>
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px', color: '#1f2937', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }} {...props} />,
                h2: ({node, ...props}) => <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px', color: '#374151' }} {...props} />,
                p: ({node, ...props}) => <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '14px', color: '#4b5563' }} {...props} />,
                ul: ({node, ...props}) => <ul style={{ paddingLeft: '20px', marginBottom: '14px', listStyleType: 'disc' }} {...props} />,
                li: ({node, ...props}) => <li style={{ fontSize: '14px', marginBottom: '6px', color: '#4b5563' }} {...props} />,
                strong: ({node, ...props}) => <strong style={{ fontWeight: 'bold', color: '#111827' }} {...props} />,
                blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '4px solid #d1d5db', paddingLeft: '16px', fontStyle: 'italic', margin: '20px 0', color: '#6b7280' }} {...props} />
              }}
            >
              {reportData}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiReport;
