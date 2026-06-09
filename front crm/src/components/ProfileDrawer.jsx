import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, LogOut, Briefcase, Shield, Mail, Calendar 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfileDrawer = ({ isOpen, onClose }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // 1. Define the designation lookup map
  const designationMap = {
    "1": "HR Manager",
    "2": "Graphic Designer",
    "3": "Digital Marketer",
    "4": "React Developer",
    "5": "Node Developer",
    "6": "Flutter Developer",
    "7": "Fullstack Developer",
    "8": "Admin",
    "9": "Manager"
  };

  useEffect(() => {
    if (isOpen) {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (savedUser && token) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          handleLogout();
        }
      } else {
        handleLogout();
      }
    }
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    onClose();
  };

  // 2. Logic to resolve the name from the designation_id
  const getDesignation = () => {
    if (!user) return "N/A";
    // Checks for designation_id (e.g., "4") and returns name (e.g., "React Developer")
    return designationMap[user.designation_id] || "Specialist Agent";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] cursor-pointer"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[110] flex flex-col overflow-hidden"
          >
            <div className="p-8 flex items-center justify-between bg-gradient-to-b from-white dark:from-slate-955 to-transparent">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tighter italic uppercase">
                  Operator <span className="text-indigo-400">Profile</span>
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active Connection</span>
                </div>
              </div>
              <button onClick={onClose} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 custom-scrollbar">
              <div className="py-8 flex flex-col items-center border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/30 blur-3xl rounded-full" />
                  <div className="w-28 h-28 rounded-[2.5rem] bg-white dark:bg-slate-950 border-2 border-indigo-500/20 overflow-hidden relative shadow-xl">
                    <img 
                      src={user?.profile_image || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=6366f1&color=fff&bold=true`} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 rounded-xl border-4 border-slate-50 dark:border-slate-900 text-white">
                    <Shield size={16} />
                  </div>
                </div>
                <h3 className="mt-6 text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{user?.name}</h3>
                <div className="mt-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                    {user?.status} Operator
                  </p>
                </div>
              </div>

              <div className="py-8 space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] mb-4">Identification Data</h4>
                
                <DetailItem 
                  icon={Mail} 
                  label="Network Mail" 
                  value={user?.email || 'N/A'} 
                />

                <DetailItem 
                  icon={Briefcase} 
                  label="Assigned Sector" 
                  // Displays "React Developer" instead of "4"
                  value={getDesignation()} 
                />

                <DetailItem 
                  icon={Calendar} 
                  label="Deployment Date" 
                  value={formatDate(user?.joining_date)} 
                />
              </div>
            </div>

            <div className="p-8 bg-gradient-to-t from-slate-200/50 dark:from-slate-950/50 to-transparent border-t border-slate-200 dark:border-slate-800">
              <button 
                onClick={handleLogout}
                className="w-full py-5 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/20 rounded-[1.5rem] text-rose-500 font-black text-[10px] uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all cursor-pointer"
              >
                <LogOut size={18} /> Disconnect Session
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="group bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 transition-all hover:border-indigo-500/30 dark:hover:border-indigo-500/50 hover:shadow-sm">
    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 border border-slate-200 dark:border-slate-800">
      <Icon size={18} />
    </div>
    <div className="overflow-hidden">
      <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{value}</p>
    </div>
  </div>
);

export default ProfileDrawer;